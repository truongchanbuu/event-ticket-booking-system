-- KEYS: [metaKey, shardKey1..shardKeyM]
-- ARGV: [capacity, m, ttlSec, forceRepair(0/1), alloc1..allocM]

local metaKey   = KEYS[1]
local capacity  = tonumber(ARGV[1])
local m         = tonumber(ARGV[2])
local ttlSec    = tonumber(ARGV[3]) or 0
local repair    = tonumber(ARGV[4]) or 0

if not capacity or capacity < 0 then return {err="INVALID_CAPACITY"} end
if not m or m <= 0 then return {err="INVALID_SHARDCOUNT"} end

local function setWithTTL(k, v)
  if ttlSec > 0 then
    redis.call("SETEX", k, ttlSec, v)
  else
    redis.call("SET", k, v)
  end
end

-- Meta exists? Check invariants
if redis.call("EXISTS", metaKey) == 1 then
  local oldCap = tonumber(redis.call("HGET", metaKey, "capacity") or "-1")
  local oldM   = tonumber(redis.call("HGET", metaKey, "shardCount") or "-1")
  if oldCap ~= capacity or oldM ~= m then
    return "MISMATCH"
  end

  -- Optional heal: fill ONLY missing shards
  local healed = 0
  if repair == 1 then
    for i = 1, m do
      local shardKey = KEYS[i + 1]
      if redis.call("EXISTS", shardKey) == 0 then
        local alloc = tonumber(ARGV[4 + i]) or 0
        setWithTTL(shardKey, alloc)
        healed = healed + 1
      end
    end
  end
  return healed > 0 and ("REPAIRED:" .. healed) or "EXISTS"
end

-- Fresh seed
local sum = 0
for i = 1, m do
  local alloc = tonumber(ARGV[4 + i]) or 0
  sum = sum + alloc
  local shardKey = KEYS[i + 1]
  -- do not overwrite if already exists (safety)
  if redis.call("EXISTS", shardKey) == 0 then
    setWithTTL(shardKey, alloc)
  end
end

-- Write meta last (idempotent content)
redis.call("HSET", metaKey,
  "capacity", capacity,
  "shardCount", m,
  "invVersion", 0,
  "checksum", sum
)

return "OK"
