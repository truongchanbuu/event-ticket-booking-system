-- KEYS: [metaKey, shardKey0, shardKey1, ..., shardKey(m-1)]
-- ARGV: [capacity, shardCount, alloc_0, alloc_1, ..., alloc_(m-1)]

local metaKey = KEYS[1]
local capacity = tonumber(ARGV[1])
local m = tonumber(ARGV[2])

-- Validate inputs
if capacity == nil or capacity < 0 then
  return {err = "INVALID_CAPACITY"}
end
if m == nil or m <= 0 then
  return {err = "INVALID_SHARDCOUNT"}
end

-- If meta exists, idempotent path
if redis.call("EXISTS", metaKey) == 1 then
  local oldCap = tonumber(redis.call("HGET", metaKey, "capacity") or "-1")
  local oldM   = tonumber(redis.call("HGET", metaKey, "shardCount") or "-1")

  if oldCap ~= capacity or oldM ~= m then
    return "MISMATCH"
  end

  -- Heal missing shards without overwriting existing
  for i = 1, m do
    local shardKey = KEYS[i + 1]
    if redis.call("EXISTS", shardKey) == 0 then
      local alloc = tonumber(ARGV[2 + i]) or 0
      redis.call("SETNX", shardKey, alloc)
    end
  end
  return "EXISTS"
end

-- Fresh seed path
local sum = 0
for i = 1, m do
  local alloc = tonumber(ARGV[2 + i]) or 0
  sum = sum + alloc
  local shardKey = KEYS[i + 1]
  redis.call("SETNX", shardKey, alloc) -- do not overwrite if exists by accident
end

-- Write meta last
redis.call("HSET", metaKey,
  "capacity", capacity,
  "shardCount", m,
  "checksum", sum
)

return "OK"
