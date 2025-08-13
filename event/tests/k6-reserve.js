import http from "k6/http";
import { check, sleep } from "k6";
import { randomSeed } from "k6";

const BASE = __ENV.BASE || "http://localhost:3006/api";
const EVENT_ID = __ENV.EVENT_ID || "EV_1";
const TT = __ENV.TT || "tt-1";
const SLUG = __ENV.SLUG || "new-vqluq2";

// 80% reserve, 20% availability
export const options = {
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<200", "p(99)<400"], // tổng thể; riêng reserve SLO mini p95<=100, p99<=200
    },
    stages: [
        { duration: "30s", target: 500 },
        { duration: "60s", target: 1500 },
        { duration: "120s", target: 3000 },
        { duration: "30s", target: 0 },
    ],
};

randomSeed(1234);

function idemKey() {
    // ~30% đụng key để verify idempotency
    const r = Math.random();
    const base = `${__VU}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return r < 0.3 ? `IDEM-${__VU}` : `IDEM-${base}`;
}

export default function () {
    const r = Math.random();
    if (r < 0.8) {
        const url = `${BASE}/checkout/reservations`;
        const payload = JSON.stringify({
            eventId: EVENT_ID,
            lines: [{ ttId: TT, qty: 1 }],
        });
        const headers = {
            "Content-Type": "application/json",
            "Idempotency-Key": idemKey(),
        };
        const res = http.post(url, payload, { headers });
        check(res, {
            "reserve status 201|200|409": (x) =>
                [201, 200, 409].includes(x.status),
        });
    } else {
        const url = `http://localhost:3002/api/availability?slug=${encodeURIComponent(SLUG)}`;
        const res = http.get(url, { tags: { endpoint: "availability" } });
        check(res, {
            "availability 200|304": (x) => x.status === 200 || x.status === 304,
        });
    }
    sleep(0.1);
}
