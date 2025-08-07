import axios from "axios";
import axiosRetry from "axios-retry";

const client = axios.create({
  timeout: 3000,
});

axiosRetry(client, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      error.code === "ECONNRESET" ||
      error.code === "ECONNABORTED" ||
      axiosRetry.isNetworkOrIdempotentRequestError(error)
    );
  },
});

async function get({ url, apiKey, headers = {} }) {
  try {
    const res = await client.get(url, {
      headers: {
        "x-api-key": apiKey,
        ...headers,
      },
    });

    return { status: res.status, data: res.data.data };
  } catch (error) {
    throw error;
  }
}

export const internalHttpClient = {
  get,
};
