-- reserve.lua
-- KEYS[1] = inv:{tt}:remaining
-- ARGV[1] = qty

local key = KEYS[1]
local qty = tonumber(ARGV[1])

local cur = tonumber(redis.call("GET", key) or "0")
if cur < qty then
  return {0, cur}  -- not enough
end

local newv = redis.call("DECRBY", key, qty)
if newv < 0 then
  -- revert if somehow negative (paranoia)
  redis.call("INCRBY", key, qty)
  return {0, cur}
end

return {1, newv}
