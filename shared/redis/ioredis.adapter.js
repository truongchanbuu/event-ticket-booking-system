// redis/adapters/ioredis-adapter.ts
import IORedis from "ioredis";

export class IORedisAdapter {
  constructor({ url }) {
    this.client = new IORedis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
  }
  async get(key) {
    return this.client.get(key);
  }
  async setex(key, value, ttlSec) {
    return this.client.set(key, value, "EX", ttlSec);
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
  // optional: close() for shutdown
  async quit() {
    try {
      await this.client.quit();
    } catch {}
  }
}
