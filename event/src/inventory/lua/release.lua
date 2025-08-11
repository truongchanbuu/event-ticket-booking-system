-- KEYS[1] = inv:{tt}:shard:{i}:remaining
-- KEYS[2] = event:{eventId}:inv:version
-- ARGV[1] = qty

local key = KEYS[1]
local verKey = KEYS[2]
local qty = tonumber(ARGV[1])

if qty == nil or qty <= 0 then
  local cur = tonumber(redis.call("GET", key) or "0")
  local ver = verKey and tonumber(redis.call("GET", verKey) or "0") or 0
  return {0, cur, ver}
end

redis.call("SETNX", key, 0)  -- heal nếu thiếu
local newv = redis.call("INCRBY", key, qty)
local ver = 0
if verKey and #verKey > 0 then
  ver = tonumber(redis.call("INCR", verKey) or "0")
end
return {1, tonumber(newv), ver}
