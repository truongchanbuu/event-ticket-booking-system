import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// ---- Custom error rate: chỉ tính 5xx/timeout ----
const server_error_rate = new Rate("server_error_rate");
function markServerError(res, endpoint) {
    const isErr = res.status === 0 || res.status >= 500; // 0 = network/timeout
    server_error_rate.add(isErr, { endpoint });
}

export const options = {
    scenarios: {
        ramp: {
            executor: "ramping-arrival-rate",
            startRate: Number(__ENV.START_RATE || 200),
            timeUnit: "1s",
            preAllocatedVUs: Number(__ENV.PRE_VUS || 500),
            maxVUs: Number(__ENV.MAX_VUS || 4000),
            stages: [
                {
                    target: Number(__ENV.T1 || 500),
                    duration: __ENV.D1 || "30s",
                },
                {
                    target: Number(__ENV.T2 || 1000),
                    duration: __ENV.D2 || "60s",
                },
                { target: 0, duration: __ENV.D3 || "10s" },
            ],
        },
    },
    thresholds: {
        "server_error_rate{endpoint:reserve}": ["rate<0.02"],
        "server_error_rate{endpoint:availability}": ["rate<0.02"],
        "http_req_duration{endpoint:reserve}": ["p(95)<250", "p(99)<400"],
        "http_req_duration{endpoint:availability}": ["p(95)<250", "p(99)<400"],
    },
};

const RESERVE_BASE = __ENV.RESERVE_BASE || "http://localhost:3006";
const AVAIL_BASE = __ENV.AVAIL_BASE || "http://localhost:3002";
const RESERVE_PATH = __ENV.RESERVE_PATH || "/api/checkout/reservations";
const AVAIL_PATH = __ENV.AVAIL_PATH || "/api/availability?slug=sample-slug";
const EVENT_ID = __ENV.EVENT_ID || "EV_DEMO";
const TT_ID = __ENV.TT_ID || "TT_DEMO";
const QTY = Number(__ENV.QTY || 1);

const MIX_RESERVE = Number(__ENV.MIX_RESERVE || 0.8);
const MIX_IDEMPOTENT = Number(__ENV.MIX_IDEMPOTENT || 0.1);
const MIX_CONFIRM = Number(__ENV.MIX_CONFIRM || 0);
const MIX_RELEASE = Number(__ENV.MIX_RELEASE || 0);
const CONFIRM_PATH = __ENV.CONFIRM_PATH || "";
const RELEASE_PATH = __ENV.RELEASE_PATH || "";

export default function () {
    const r = Math.random();

    // ---- Availability ----
    if (r >= MIX_RESERVE) {
        const res = http.get(`${AVAIL_BASE}${AVAIL_PATH}`, {
            headers: { "Cache-Control": "no-store" },
            tags: { endpoint: "availability" },
        });
        markServerError(res, "availability");
        check(res, { "availability 200": (x) => x.status === 200 });
        sleep(1);
        return;
    }

    // ---- Reserve (+ optional idempotency) ----
    const body = JSON.stringify({
        eventId: EVENT_ID,
        lines: [{ ttId: TT_ID, qty: QTY }],
    });

    const useIdem = Math.random() < MIX_IDEMPOTENT;
    const idemKey = uuidv4(); // lần 2 sẽ tái dùng cùng headers => cùng key
    const headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
        "user-agent": "k6",
    };

    // Lần 1 kỳ vọng 201 (hoặc 409 nếu conflict)
    const r1 = http.post(`${RESERVE_BASE}${RESERVE_PATH}`, body, {
        headers,
        tags: { endpoint: "reserve" },
    });
    markServerError(r1, "reserve");
    check(r1, {
        "reserve first 201|409": (x) => x.status === 201 || x.status === 409,
    });

    // Idempotent lần 2: kỳ vọng 200/204 (không tạo mới)
    if (useIdem) {
        const r2 = http.post(`${RESERVE_BASE}${RESERVE_PATH}`, body, {
            headers,
            tags: { endpoint: "reserve" },
        });
        markServerError(r2, "reserve");
        check(r2, {
            "idempotent 2nd 200|204": (x) =>
                x.status === 200 || x.status === 204,
        });
    }

    // Optional confirm/release nếu có API
    if (CONFIRM_PATH && Math.random() < MIX_CONFIRM) {
        const rC = http.post(`${RESERVE_BASE}${CONFIRM_PATH}`, body, {
            headers,
            tags: { endpoint: "reserve" },
        });
        markServerError(rC, "reserve");
        check(rC, { "confirm ok": (x) => [200, 201, 204].includes(x.status) });
    } else if (RELEASE_PATH && Math.random() < MIX_RELEASE) {
        const rR = http.del(`${RESERVE_BASE}${RELEASE_PATH}`, body, {
            headers,
            tags: { endpoint: "reserve" },
        });
        markServerError(rR, "reserve");
        check(rR, { "release ok": (x) => [200, 204].includes(x.status) });
    }

    sleep(1);
}
