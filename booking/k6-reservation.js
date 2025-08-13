// tests/k6-reserve-only.js
import http from "k6/http";
import { check, sleep } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

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
        http_req_failed: ["rate<0.02"],
        http_req_duration: ["p(95)<250", "p(99)<400"],
    },
};

const BASE = __ENV.BASE || "http://localhost:3006";
const PATH = __ENV.RESERVE_PATH || "/api/checkout/reservations";
const EVENT_ID = __ENV.EVENT_ID || "EV_DEMO";
const TT_ID = __ENV.TT_ID || "TT_DEMO";
const QTY = Number(__ENV.QTY || 1);

export default function () {
    const idem = uuidv4();
    const body = JSON.stringify({
        eventId: EVENT_ID,
        lines: [{ ttId: TT_ID, qty: QTY }],
    });
    const userId = `u-${__VU}-${Math.floor(Math.random() * 1e6)}`;
    const headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idem,
        "x-user-id": userId,
        "user-agent": "k6",
    };
    const res = http.post(`${BASE}${PATH}`, body, { headers });
    check(res, {
        "status 201|409": (r) => r.status === 201 || r.status === 409,
    });
    sleep(0.02);
}
