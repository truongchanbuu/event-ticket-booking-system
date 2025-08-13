import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3006/api";
const EVENT_ID = __ENV.EVENT_ID || "EV_1";
const TT = __ENV.TT || "tt-1";

export const options = {
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<200", "p(99)<400"],
    },
    vus: 2000,
    duration: "60s",
};

function idemKey() {
    return `SO-${__VU}-${Math.floor(Math.random() * 1e9)}`;
}

export default function () {
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
    check(res, { "201|200|409": (x) => [201, 200, 409].includes(x.status) });
    sleep(0.05);
}
