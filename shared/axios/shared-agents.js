import http from "http";
import https from "https";

export const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 512,
  scheduling: "lifo",
});

export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 512,
  scheduling: "lifo",
});
