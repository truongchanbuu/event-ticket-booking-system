import test from "node:test";
import assert from "node:assert/strict";
import { allocateShards } from "../../src/inventory/sharding.js";

test("allocateShards - chia đều", () => {
    const res = allocateShards(100, 10);
    assert.equal(res.length, 10);
    assert.equal(
        res.reduce((a, b) => a + b, 0),
        100,
    );
    assert.ok(res.every((x) => x === 10));
});

test("allocateShards - có dôi r", () => {
    const res = allocateShards(101, 10);
    assert.equal(
        res.reduce((a, b) => a + b, 0),
        101,
    );
    // 1..r là 11, còn lại 10
    const elevens = res.filter((x) => x === 11).length;
    assert.equal(elevens, 1);
});

test("allocateShards - capacity < m", () => {
    const res = allocateShards(3, 5);
    assert.deepEqual(res, [1, 1, 1, 0, 0]);
});
