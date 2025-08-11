import test from "node:test";
import assert from "node:assert/strict";
import { metaKey, shardKey, versionKey } from "../../src/inventory/key.js";

test("keys - meta/shard/version", () => {
    assert.equal(metaKey("TT_1"), "inv:TT_1:meta");
    assert.equal(shardKey("TT_1", 0), "inv:TT_1:shard:0:remaining");
    assert.equal(versionKey("EV_123"), "event:EV_123:inv:version");
});
