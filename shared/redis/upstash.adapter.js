import { Redis } from "@upstash/redis";

export class UpstashAdapter {
  constructor({ url, token }) {
    this.client = new Redis({ url, token });
  }
  async get(key) {
    return this.client.get(key);
  }
  async setEx(key, value, ttlSec) {
    return this.client.set(key, value, { ex: ttlSec });
  }
  async del(...keys) {
    return this.client.del(...keys);
  }
  async sadd(key, member) {
    return this.client.sadd(key, member);
  }
  async smembers(key) {
    return this.client.smembers(key);
  }
  async mget(keys) {
    return this.client.mget(...keys);
  }
}
