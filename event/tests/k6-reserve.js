import http from "k6/http";
import { check, sleep } from "k6";
import { randomSeed } from "k6";
import { Rate, Counter, Trend } from "k6/metrics";

/* =========================
 * ENV & CONFIG
 * ========================= */
const BOOKING = __ENV.BOOKING || "http://localhost:3006/api";
const EVENT = __ENV.EVENT || "http://localhost:3002/api";
const EVENT_ID = __ENV.EVENT_ID || "4uv5zDDorgyXY7vqluq2";
const TT = __ENV.TT || "zfHTosglYXnBEd0vyaqe";
const SLUG = __ENV.SLUG || "new-vqluq2";
const MODE = (__ENV.MODE || "local").toLowerCase(); // local | med | heavy
const SUMMARY_JSON = String(__ENV.SUMMARY_JSON || "1") === "1";
const CAPACITY_ENV = Number.isFinite(Number(__ENV.CAPACITY))
    ? Number(__ENV.CAPACITY)
    : null; // optional

randomSeed(1234);

/* =========================
 * PROFILES
 * ========================= */
const profiles = {
    local: {
        reserve: [
            { duration: "20s", target: 20 },
            { duration: "40s", target: 60 },
            { duration: "40s", target: 100 },
            { duration: "20s", target: 0 },
        ],
        avail: [
            { duration: "20s", target: 5 },
            { duration: "40s", target: 15 },
            { duration: "40s", target: 25 },
            { duration: "20s", target: 0 },
        ],
        preVUsReserve: 30,
        preVUsAvail: 10,
    },
    med: {
        reserve: [
            { duration: "20s", target: 200 },
            { duration: "40s", target: 600 },
            { duration: "60s", target: 1000 },
            { duration: "20s", target: 0 },
        ],
        avail: [
            { duration: "20s", target: 50 },
            { duration: "40s", target: 150 },
            { duration: "60s", target: 250 },
            { duration: "20s", target: 0 },
        ],
        preVUsReserve: 300,
        preVUsAvail: 120,
    },
    heavy: {
        reserve: [
            { duration: "30s", target: 800 },
            { duration: "60s", target: 2400 },
            { duration: "90s", target: 4000 },
            { duration: "30s", target: 0 },
        ],
        avail: [
            { duration: "30s", target: 200 },
            { duration: "60s", target: 600 },
            { duration: "90s", target: 1000 },
            { duration: "30s", target: 0 },
        ],
        preVUsReserve: 800,
        preVUsAvail: 300,
    },
};
const P = profiles[MODE] || profiles.local;

/* =========================
 * METRICS
 * ========================= */
// Business OK rates (giữ lại)
export const reserve_ok = new Rate("reserve_ok");
export const availability_ok = new Rate("availability_ok");

// Split reserve outcomes
const reserve_success = new Counter("reserve_success"); // 200/201
const reserve_conflict = new Counter("reserve_conflict"); // 409/429/412
const reserve_error = new Counter("reserve_error"); // >=500 hoặc bất thường khác
const cancel_success = new Counter("cancel_success");

// Track quantities (mỗi reserve qty=1; điều chỉnh nếu bạn thay đổi payload qty)
const reserve_success_qty = new Counter("reserve_success_qty");
const cancel_success_qty = new Counter("cancel_success_qty");

// Availability revalidate ratio buckets
const availability_200 = new Counter("availability_200");
const availability_304 = new Counter("availability_304");

// Network errors
const net_err_total = new Counter("net_errors_total");
const net_err_reserve = new Counter("net_errors_reserve");
const net_err_avail = new Counter("net_errors_availability");

// Timings per endpoint (ms)
const reserve_duration = new Trend("reserve_duration", true);
const reserve_blocked = new Trend("reserve_blocked", true);
const reserve_connecting = new Trend("reserve_connecting", true);
const reserve_tls = new Trend("reserve_tls", true);
const reserve_sending = new Trend("reserve_sending", true);
const reserve_waiting = new Trend("reserve_waiting", true);
const reserve_receiving = new Trend("reserve_receiving", true);

const availability_duration = new Trend("availability_duration", true);
const availability_blocked = new Trend("availability_blocked", true);
const availability_connecting = new Trend("availability_connecting", true);
const availability_tls = new Trend("availability_tls", true);
const availability_sending = new Trend("availability_sending", true);
const availability_waiting = new Trend("availability_waiting", true);
const availability_receiving = new Trend("availability_receiving", true);

// Status distribution (giữ hệ thống cũ)
const ENDPOINTS = ["reserve", "availability", "cancel"];
const STATUS_CODES = [
    200, 201, 202, 204, 304, 400, 401, 403, 404, 409, 412, 429, 500, 502, 503,
    504,
];
const statusCounters = {};
for (const ep of ENDPOINTS) {
    for (const sc of STATUS_CODES)
        statusCounters[`http_status_${ep}_${sc}`] = new Counter(
            `http_status_${ep}_${sc}`,
        );
    for (const b of ["1xx", "2xx", "3xx", "4xx", "5xx", "other"])
        statusCounters[`http_status_${ep}_${b}`] = new Counter(
            `http_status_${ep}_${b}`,
        );
}

const etagMap = new Map();

/* =========================
 * HELPERS
 * ========================= */
function idemKey() {
    const r = Math.random();
    return r < 0.3
        ? `IDEM-${__VU}`
        : `IDEM-${__VU}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
function ipForVu(vu) {
    const a = 10,
        b = (vu >> 8) & 255,
        c = vu & 255,
        d = (vu * 7) % 255;
    return `${a}.${b}.${c}.${d || 1}`;
}
function recordStatus(endpoint, status) {
    const code = Number(status) | 0;
    const exact = `http_status_${endpoint}_${code}`;
    if (statusCounters[exact]) statusCounters[exact].add(1);

    if (code >= 100 && code < 200)
        statusCounters[`http_status_${endpoint}_1xx`].add(1);
    else if (code >= 200 && code < 300)
        statusCounters[`http_status_${endpoint}_2xx`].add(1);
    else if (code >= 300 && code < 400)
        statusCounters[`http_status_${endpoint}_3xx`].add(1);
    else if (code >= 400 && code < 500)
        statusCounters[`http_status_${endpoint}_4xx`].add(1);
    else if (code >= 500 && code < 600)
        statusCounters[`http_status_${endpoint}_5xx`].add(1);
    else statusCounters[`http_status_${endpoint}_other`].add(1);
}
function addTimings(endpoint, res) {
    const t = res.timings || {};
    const add = (trend, v) => trend.add(v == null ? 0 : v);
    if (endpoint === "reserve") {
        add(reserve_duration, t.duration);
        add(reserve_blocked, t.blocked);
        add(reserve_connecting, t.connecting);
        add(reserve_tls, t.tls_handshaking);
        add(reserve_sending, t.sending);
        add(reserve_waiting, t.waiting);
        add(reserve_receiving, t.receiving);
    } else if (endpoint === "availability") {
        add(availability_duration, t.duration);
        add(availability_blocked, t.blocked);
        add(availability_connecting, t.connecting);
        add(availability_tls, t.tls_handshaking);
        add(availability_sending, t.sending);
        add(availability_waiting, t.waiting);
        add(availability_receiving, t.receiving);
    }
}
function fmtNum(n) {
    return n == null ? "-" : Number(n).toFixed(2);
}
function metricVals(m) {
    return !m || !m.values ? {} : m.values;
}
function lineKV(k, v, pad = 22) {
    const key = (k + ":").padEnd(pad, " ");
    return `${key}${v}\n`;
}
function sumRemainingFromAvailabilityBody(body) {
    try {
        const arr = JSON.parse(body);
        if (!Array.isArray(arr)) return null;
        return arr.reduce((s, x) => s + (Number(x?.remaining) || 0), 0);
    } catch {
        return null;
    }
}

/* =========================
 * K6 OPTIONS
 * ========================= */
export const options = {
    discardResponseBodies: false,
    batch: 200,
    batchPerHost: 100,
    scenarios: {
        reserve: {
            executor: "ramping-arrival-rate",
            timeUnit: "1s",
            preAllocatedVUs: P.preVUsReserve,
            maxVUs: Math.max(P.preVUsReserve * 3, 200),
            gracefulStop: "5s",
            stages: P.reserve,
            exec: "reserveExec",
            tags: { endpoint: "reserve" },
        },
        availability: {
            executor: "ramping-arrival-rate",
            timeUnit: "1s",
            preAllocatedVUs: P.preVUsAvail,
            maxVUs: Math.max(P.preVUsAvail * 3, 90),
            gracefulStop: "5s",
            stages: P.avail,
            exec: "availabilityExec",
            tags: { endpoint: "availability" },
        },
    },
    thresholds: {
        reserve_ok: [{ threshold: "rate>0.98", abortOnFail: true }],
        availability_ok: ["rate>0.99"],

        // 304: phải cực rẻ
        "http_req_duration{endpoint:availability,status:304}": ["p(95)<50"],

        // 200: cho phép chậm hơn vì phải compute snapshot
        "http_req_duration{endpoint:availability,status:200}": ["p(95)<300"],
    },
};

// expected statuses để http_req_failed không đếm các 409/429 hợp lệ
http.setResponseCallback(
    http.expectedStatuses(
        200,
        201,
        202,
        204,
        304,
        400,
        401,
        403,
        404,
        409,
        412,
        429,
        500,
        502,
        503,
        504,
    ),
);

/* =========================
 * GLOBAL for setup/summary
 * ========================= */
let INIT_REMAINING = null;

/* =========================
 * SETUP
 * ========================= */
export function setup() {
    console.log("[CONFIG] MODE =", MODE);
    console.log("[CONFIG] BOOKING =", BOOKING);
    console.log("[CONFIG] EVENT   =", EVENT);
    console.log("[CONFIG] EVENT_ID=", EVENT_ID);
    console.log("[CONFIG] TT      =", TT);
    console.log("[CONFIG] SLUG    =", SLUG);

    // Lấy tồn đầu kỳ (nếu API có cache/etag, lấy 200 là được)
    try {
        const url = `${EVENT}/availability?slug=${encodeURIComponent(SLUG)}`;
        const r = http.get(url, { timeout: "3s" });
        if (r.status === 200) {
            INIT_REMAINING = sumRemainingFromAvailabilityBody(r.body);
        }
    } catch (_) {}

    if (
        CAPACITY_ENV != null &&
        (INIT_REMAINING == null || Number.isNaN(INIT_REMAINING))
    ) {
        INIT_REMAINING = CAPACITY_ENV; // fallback theo ENV nếu muốn ép
    }
}

/* =========================
 * SCENARIOS
 * ========================= */
export function reserveExec() {
    const headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey(),
        "x-forwarded-for": ipForVu(__VU),
        "X-Demo-Mode": 1,
    };

    const reserveUrl = `${BOOKING}/checkout/reservations`;
    const qty = 1; // điều chỉnh nếu test nhiều vé/lần
    const payload = JSON.stringify({
        eventId: EVENT_ID,
        lines: [{ ttId: TT, qty }],
    });

    const res = http.post(reserveUrl, payload, {
        headers,
        tags: { endpoint: "reserve" },
        timeout: "3s",
    });

    const okHttp = !res.error;
    const isSuccess = okHttp && (res.status === 201 || res.status === 200);
    const isConflict =
        okHttp &&
        (res.status === 409 || res.status === 429 || res.status === 412);
    const isError =
        !okHttp ||
        (okHttp && (res.status >= 500 || (!isSuccess && !isConflict)));

    // Business rate cũ (OK nếu success hoặc conflict)
    const okBiz = okHttp && (isSuccess || isConflict);
    reserve_ok.add(okBiz);

    // Split metrics
    if (isSuccess) {
        reserve_success.add(1);
        reserve_success_qty.add(qty);
    } else if (isConflict) {
        reserve_conflict.add(1);
    } else if (isError) {
        reserve_error.add(1);
    }

    if (!okHttp) {
        net_err_total.add(1);
        net_err_reserve.add(1);
    }
    recordStatus("reserve", res.status || 0);
    addTimings("reserve", res);

    check(res, {
        "reserve network ok": () => okHttp,
        "reserve success|conflict": () => isSuccess || isConflict,
    });

    // Cancel ~50% khi success → trả hàng
    if (isSuccess && Math.random() < 0.5) {
        try {
            const body = res.json();
            const reservationId = body?.reservationId;
            if (reservationId) {
                const cancelUrl = `${BOOKING}/checkout/reservations/${reservationId}/cancel`;
                const cRes = http.post(cancelUrl, null, {
                    headers: { "x-forwarded-for": headers["x-forwarded-for"] },
                    tags: { endpoint: "cancel" },
                    timeout: "3s",
                });
                recordStatus("cancel", cRes.status || 0);
                const okCancel = !cRes.error && cRes.status === 200;
                if (okCancel) {
                    cancel_success.add(1);
                    cancel_success_qty.add(qty);
                }
                check(cRes, {
                    "cancel network ok": () => !cRes.error,
                    "cancel 200": () => okCancel,
                });
            }
        } catch (_) {}
    }

    sleep(0.01);
}

export function availabilityExec() {
    const url = `${EVENT}/availability?slug=${encodeURIComponent(SLUG)}`;

    const headers = {};
    const prev = etagMap.get(SLUG);
    if (prev) headers["If-None-Match"] = prev;

    const res = http.get(url, {
        headers,
        tags: { endpoint: "availability" },
        timeout: "2s",
    });

    const et =
        res.headers["ETag"] || res.headers["Etag"] || res.headers["etag"];
    if (et) etagMap.set(SLUG, et);

    const okHttp = !res.error;
    const okBiz = okHttp && (res.status === 200 || res.status === 304);
    availability_ok.add(okBiz);

    if (res.status === 200) availability_200.add(1);
    else if (res.status === 304) availability_304.add(1);

    if (!okBiz && (res.status >= 500 || res.status === 404)) {
        if (__ITER % 50 === 0) {
            let bodyText = "";
            try {
                bodyText = res.body?.slice(0, 500) || "";
            } catch (_) {}
            console.error(
                `[avail] status=${res.status} sampleBody=${bodyText}`,
            );
        }
    }

    if (!okHttp) {
        net_err_total.add(1);
        net_err_avail.add(1);
    }
    recordStatus("availability", res.status || 0);
    addTimings("availability", res);

    check(res, {
        "availability network ok": () => okHttp,
        "availability 200|304": () => okBiz,
    });

    sleep(0.01);
}

/* =========================
 * SUMMARY (in chi tiết + kiểm tra oversell)
 * ========================= */
export function handleSummary(data) {
    const m = (name) => data.metrics[name];

    // Cuối test: đọc tồn cuối kỳ qua HTTP
    let END_REMAINING = null;
    try {
        const url = `${EVENT}/availability?slug=${encodeURIComponent(SLUG)}`;
        const r = http.get(url, { timeout: "3s" });
        if (r.status === 200)
            END_REMAINING = sumRemainingFromAvailabilityBody(r.body);
    } catch (_) {}

    // Header
    const parts = [];
    parts.push("========== k6 CUSTOM SUMMARY ==========\n");
    parts.push(lineKV("MODE", MODE));
    parts.push(lineKV("BOOKING", BOOKING));
    parts.push(lineKV("EVENT", EVENT));
    parts.push(lineKV("EVENT_ID", EVENT_ID));
    parts.push(lineKV("TT", TT));
    parts.push(lineKV("SLUG", SLUG));
    parts.push("\n");

    // OK rates
    const r_ok = metricVals(m("reserve_ok"));
    const a_ok = metricVals(m("availability_ok"));
    parts.push("[OK rates]\n");
    parts.push(lineKV("reserve_ok", fmtNum((r_ok.rate || 0) * 100) + " %"));
    parts.push(
        lineKV("availability_ok", fmtNum((a_ok.rate || 0) * 100) + " %"),
    );
    parts.push("\n");

    // Reserve split
    const succ = metricVals(m("reserve_success")).count || 0;
    const conf = metricVals(m("reserve_conflict")).count || 0;
    const errc = metricVals(m("reserve_error")).count || 0;
    const succQty = metricVals(m("reserve_success_qty")).count || 0;
    const cancelQty = metricVals(m("cancel_success_qty")).count || 0;
    const netQty = succQty - cancelQty;
    const conflictRatio = succ + conf > 0 ? conf / (succ + conf) : 0;

    parts.push("[Reserve breakdown]\n");
    parts.push(lineKV("success (count)", succ));
    parts.push(lineKV("conflict (count)", conf));
    parts.push(lineKV("error (count)", errc));
    parts.push(lineKV("success qty", succQty));
    parts.push(lineKV("cancel qty", cancelQty));
    parts.push(lineKV("net reserved qty", netQty));
    parts.push(lineKV("conflict ratio", fmtNum(conflictRatio * 100) + " %"));
    parts.push("\n");

    // Availability latency
    const ad = metricVals(m("availability_duration"));
    parts.push("[Availability latency p50/p90/p95/p99 (ms)]\n");
    parts.push(lineKV("p50", fmtNum(ad["p(50)"])));
    parts.push(lineKV("p90", fmtNum(ad["p(90)"])));
    parts.push(lineKV("p95", fmtNum(ad["p(95)"])));
    parts.push(lineKV("p99", fmtNum(ad["p(99)"])));
    parts.push("\n");

    // Availability revalidate ratio
    const a200 = metricVals(m("availability_200")).count || 0;
    const a304 = metricVals(m("availability_304")).count || 0;
    const revalRatio = a200 + a304 > 0 ? a304 / (a200 + a304) : 0;
    parts.push("[Availability revalidate]\n");
    parts.push(lineKV("200 count", a200));
    parts.push(lineKV("304 count", a304));
    parts.push(lineKV("304 ratio", fmtNum(revalRatio * 100) + " %"));
    parts.push("\n");

    // Timings (avg) cho reserve + availability
    const tb = (name) => metricVals(m(name));
    const t = {
        reserve: {
            blocked: tb("reserve_blocked"),
            connecting: tb("reserve_connecting"),
            tls: tb("reserve_tls"),
            sending: tb("reserve_sending"),
            waiting: tb("reserve_waiting"),
            receiving: tb("reserve_receiving"),
        },
        availability: {
            blocked: tb("availability_blocked"),
            connecting: tb("availability_connecting"),
            tls: tb("availability_tls"),
            sending: tb("availability_sending"),
            waiting: tb("availability_waiting"),
            receiving: tb("availability_receiving"),
        },
    };
    parts.push("[Timing (avg ms)]\n");
    parts.push(lineKV("reserve blocked", fmtNum(t.reserve.blocked.avg)));
    parts.push(lineKV("reserve connect", fmtNum(t.reserve.connecting.avg)));
    parts.push(lineKV("reserve tls", fmtNum(t.reserve.tls.avg)));
    parts.push(lineKV("reserve sending", fmtNum(t.reserve.sending.avg)));
    parts.push(lineKV("reserve waiting(TTFB)", fmtNum(t.reserve.waiting.avg)));
    parts.push(lineKV("reserve receiving", fmtNum(t.reserve.receiving.avg)));
    parts.push(
        lineKV("availability blocked", fmtNum(t.availability.blocked.avg)),
    );
    parts.push(
        lineKV("availability connect", fmtNum(t.availability.connecting.avg)),
    );
    parts.push(lineKV("availability tls", fmtNum(t.availability.tls.avg)));
    parts.push(
        lineKV("availability sending", fmtNum(t.availability.sending.avg)),
    );
    parts.push(
        lineKV(
            "availability waiting(TTFB)",
            fmtNum(t.availability.waiting.avg),
        ),
    );
    parts.push(
        lineKV("availability receiving", fmtNum(t.availability.receiving.avg)),
    );
    parts.push("\n");

    // Network errors
    const neT = metricVals(m("net_errors_total")).count || 0;
    const neR = metricVals(m("net_errors_reserve")).count || 0;
    const neA = metricVals(m("net_errors_availability")).count || 0;
    parts.push("[Network errors]\n");
    parts.push(lineKV("total", neT));
    parts.push(lineKV("reserve", neR));
    parts.push(lineKV("availability", neA));
    parts.push("\n");

    // Status distributions (giữ như cũ)
    function dumpStatusFor(ep) {
        const lines = [];
        const buckets = ["1xx", "2xx", "3xx", "4xx", "5xx", "other"];
        const exacts = [...STATUS_CODES];
        lines.push(`- ${ep}`);
        for (const b of buckets) {
            const mv = metricVals(m(`http_status_${ep}_${b}`));
            const c = mv.count || 0;
            if (c) lines.push(`  ${b.padEnd(6)}: ${c}`);
        }
        for (const sc of exacts) {
            const mv = metricVals(m(`http_status_${ep}_${sc}`));
            const c = mv.count || 0;
            if (c) lines.push(`  ${String(sc).padEnd(6)}: ${c}`);
        }
        if (lines.length === 1) lines.push("  (no requests)");
        return lines.join("\n");
    }
    parts.push("[HTTP status distribution]\n");
    parts.push(dumpStatusFor("reserve") + "\n");
    parts.push(dumpStatusFor("availability") + "\n");
    parts.push(dumpStatusFor("cancel") + "\n");

    // Oversell check
    parts.push("[No-oversell check]\n");
    const initStr =
        INIT_REMAINING == null ? "(unknown)" : String(INIT_REMAINING);
    parts.push(lineKV("initial remaining", initStr));
    const endStr = END_REMAINING == null ? "(unknown)" : String(END_REMAINING);
    parts.push(lineKV("final remaining", endStr));
    parts.push(lineKV("net reserved by test", netQty));

    let oversellNote = "N/A";
    if (INIT_REMAINING != null && END_REMAINING != null) {
        const expectedMinEnd = INIT_REMAINING - netQty; // nếu không có tác động ngoài
        oversellNote =
            END_REMAINING >= 0
                ? END_REMAINING >= expectedMinEnd
                    ? "OK (no oversell detected)"
                    : "⚠️ POSSIBLE OVERSELL (final < initial - net)"
                : "❌ NEGATIVE REMAINING";
    }
    parts.push(lineKV("result", oversellNote));
    parts.push("\n");

    const text = parts.join("");

    const out = { stdout: text };
    if (SUMMARY_JSON) out["summary.k6.json"] = JSON.stringify(data, null, 2);
    return out;
}
