// Minimal in-memory Redis used by tests (supports the ops we call)
export class FakeRedis {
    constructor() {
        this.store = new Map(); // key -> { val, exp?:ms }
        this.zsets = new Map(); // zkey -> Map(member->score)
        this.now = () => Date.now();
        this.kind = "fake";
    }

    _isExpired(key) {
        const r = this.store.get(key);
        if (!r) return true;
        if (!r.exp) return false;
        return this.now() > r.exp;
    }
    _read(key) {
        if (this._isExpired(key)) {
            this.store.delete(key);
            return null;
        }
        return this.store.get(key)?.val ?? null;
    }

    async get(key) {
        return this._read(key);
    }
    async setex(key, sec, val) {
        this.store.set(key, {
            val: typeof val === "string" ? val : JSON.stringify(val),
            exp: this.now() + sec * 1000,
        });
        return "OK";
    }
    // set key value [NX] [EX seconds]
    async set(key, value, mode, nx, ex, sec) {
        const exists = this._read(key) !== null;
        const exp =
            ex === "EX" || mode === "EX"
                ? this.now() + (sec ?? nx ?? 0) * 1000
                : undefined;
        if (mode === "NX" || nx === "NX") {
            if (exists) return null;
            this.store.set(key, { val: value, exp });
            return "OK";
        }
        this.store.set(key, { val: value, exp });
        return "OK";
    }
    async del(key) {
        this.store.delete(key);
        return 1;
    }
    async pttl(key) {
        const r = this.store.get(key);
        if (!r || !r.exp) return -1;
        return Math.max(0, r.exp - this.now());
    }

    // Multi/exec (only get + pttl used)
    multi() {
        const ops = [];
        const api = {
            get: (k) => {
                ops.push(["get", k]);
                return api;
            },
            pttl: (k) => {
                ops.push(["pttl", k]);
                return api;
            },
            exec: async () => {
                const out = [];
                for (const [cmd, k] of ops) {
                    if (cmd === "get") out.push([null, await this.get(k)]);
                    else if (cmd === "pttl")
                        out.push([null, await this.pttl(k)]);
                }
                return out;
            },
        };
        return api;
    }

    // ZSET
    async zadd(key, score, member) {
        const m = this.zsets.get(key) ?? new Map();
        m.set(String(member), Number(score));
        this.zsets.set(key, m);
        return 1;
    }
    async zrangebyscore(key, min, max, _, __, limit) {
        const m = this.zsets.get(key) ?? new Map();
        const arr = [...m.entries()]
            .filter(([_, s]) => s >= Number(min) && s <= Number(max))
            .sort((a, b) => a[1] - b[1])
            .slice(0, limit ?? m.size)
            .map(([mem]) => mem);
        return arr;
    }
    async zrem(key, member) {
        const m = this.zsets.get(key);
        if (!m) return 0;
        const ok = m.delete(String(member));
        return ok ? 1 : 0;
    }

    // Lua (compareDel)
    async scriptLoad(_lua) {
        return "sha:compareDel";
    }
    async evalsha(sha, keys, argv) {
        if (sha !== "sha:compareDel") return 0;
        const key = keys[0];
        const expected = argv[0];
        const cur = await this.get(key);
        if (cur === expected) {
            await this.del(key);
            return 1;
        }
        return 0;
    }
}
