import axios from "axios";
import axiosRetry from "axios-retry";
import { httpAgent, httpsAgent } from "./shared-agents.js";

function getRequestContextSafe() {
  try {
    return globalThis.__REQ_CTX__ || undefined;
  } catch {
    return undefined;
  }
}

export function createServiceClients(registry) {
  const clients = {};

  for (const [serviceName, cfg] of Object.entries(registry)) {
    if (!cfg?.baseURL) throw new Error(`Missing baseURL for ${serviceName}`);

    // INTERNAL DEFAULTS
    const requireApiKey = cfg.requireApiKey ?? true;
    const attachContext = cfg.attachContext ?? true;
    const unwrapEnvelope = cfg.unwrapEnvelope ?? true;
    const throwOnNetworkError = cfg.throwOnNetworkError ?? false;
    const successPredicate = cfg.successPredicate ?? null;

    if (requireApiKey && !cfg?.apiKey) {
      throw new Error(`Missing apiKey for ${serviceName}`);
    }

    const client = axios.create({
      baseURL: cfg.baseURL,
      timeout: cfg.timeout ?? 3000,
      httpAgent,
      httpsAgent,
      headers: {
        ...(cfg.defaultHeaders || {}),
        ...(requireApiKey
          ? { [cfg.headerName ?? "x-api-key"]: cfg.apiKey }
          : {}),
        "content-type": "application/json",
        accept: "application/json",
      },
      transformRequest: [
        (data) => (data != null ? JSON.stringify(data) : data),
      ],
      validateStatus: () => true,
    });

    axiosRetry(client, {
      retries: cfg.retry?.retries ?? 2, // internal default
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err) =>
        err?.code === "ECONNRESET" ||
        err?.code === "ECONNABORTED" ||
        axiosRetry.isNetworkOrIdempotentRequestError(err),
      shouldResetTimeout: true,
    });

    client.interceptors.request.use((req) => {
      if (attachContext) {
        const ctx = getRequestContextSafe();
        if (ctx?.requestId) req.headers["x-request-id"] = ctx.requestId;
        if (ctx?.userId) req.headers["x-user-id"] = ctx.userId;
        if (ctx?.tenantId) req.headers["x-tenant-id"] = ctx.tenantId;
        const m = String(req.method || "").toLowerCase();
        if (
          !req.headers["Idempotency-Key"] &&
          ["post", "put", "patch"].includes(m) &&
          ctx?.idemKey
        ) {
          req.headers["Idempotency-Key"] = ctx.idemKey;
        }
      }
      req.metadata = { start: Date.now() };
      return req;
    });

    client.interceptors.response.use(
      (res) => {
        const durationMs = res.config?.metadata?.start
          ? Date.now() - res.config.metadata.start
          : undefined;

        if (unwrapEnvelope) {
          const body = res.data ?? {};
          const envelope = typeof body === "object" ? body : { data: body };
          const data = envelope?.data !== undefined ? envelope.data : envelope;
          const ok =
            res.status >= 200 && res.status < 300 && envelope.success !== false;
          return {
            service: serviceName,
            status: res.status,
            ok,
            envelope,
            data,
            message: envelope?.message,
            headers: res.headers,
            durationMs,
          };
        }

        const ok = successPredicate
          ? Boolean(successPredicate(res))
          : res.status >= 200 && res.status < 300;
        return {
          service: serviceName,
          status: res.status,
          ok,
          data: res.data,
          headers: res.headers,
          durationMs,
        };
      },
      (error) => {
        if (throwOnNetworkError) throw error; // external: cứ throw
        return Promise.resolve({
          service: serviceName,
          status: 503,
          ok: false,
          data: [],
          message: error?.message ?? "Service Unavailable",
        });
      }
    );

    const request = (method, url, opts = {}) =>
      client.request({ method, url, ...opts });

    clients[serviceName] = Object.freeze({
      raw: client,
      request,
      get: (url, { params, headers, signal } = {}) =>
        request("get", url, { params, headers, signal }),
      post: (url, data, { params, headers, signal } = {}) =>
        request("post", url, { data, params, headers, signal }),
      put: (url, data, { params, headers, signal } = {}) =>
        request("put", url, { data, params, headers, signal }),
      patch: (url, data, { params, headers, signal } = {}) =>
        request("patch", url, { data, params, headers, signal }),
      delete: (url, { params, headers, data, signal } = {}) =>
        request("delete", url, { params, headers, data, signal }),
      ensureOk(resp) {
        if (!resp?.ok) {
          const e = new Error(
            resp?.message || `Upstream error (${serviceName})`
          );
          e.status = resp?.status;
          throw e;
        }
        return resp;
      },
    });
  }

  return Object.freeze(clients);
}
