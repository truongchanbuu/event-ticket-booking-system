import axios from "axios";
import axiosRetry from "axios-retry";

const client = axios.create({
  timeout: 3000,
});

axiosRetry(client, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    error.code === "ECONNRESET" ||
    error.code === "ECONNABORTED" ||
    axiosRetry.isNetworkOrIdempotentRequestError(error),
});

client.interceptors.response.use(
  (res) => {
    const body = res.data ?? {};
    return {
      status: res.status,
      data: Array.isArray(body?.data) ? body.data : body, // ưu tiên body.data, fallback body
      version: body?.version ?? body?.dataVersion ?? undefined,
      message: body?.message ?? undefined,
    };
  },
  (error) => Promise.reject(error)
);

async function get({ url, apiKey, headers = {} }) {
  try {
    const res = await client.get(url, {
      headers: { "x-api-key": apiKey, ...headers },
    });
    return res;
  } catch (error) {
    if (error?.response) {
      const body = error.response.data ?? {};
      return {
        status: error.response.status,
        data: Array.isArray(body?.data) ? body.data : body,
        version: body?.version ?? body?.dataVersion ?? undefined,
        message: body?.message ?? error.message,
      };
    }
    return {
      status: 503,
      data: [],
      message: error?.message ?? "Service Unavailable",
    };
  }
}

export const internalHttpClient = { get };
