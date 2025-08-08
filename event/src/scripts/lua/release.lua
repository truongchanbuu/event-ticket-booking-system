-- release.lua
-- KEYS[1] = inv:{tt}:remaining
-- ARGV[1] = qty

local key = KEYS[1]
local qty = tonumber(ARGV[1])

local newv = redis.call("INCRBY", key, qty)
return {1, newv}
