export const REDIS_TTL = Object.freeze({
  USER_PROFILE_SHORT: 60, // 1m – ultra-hot data (e.g., /me in heavy traffic env)
  USER_PROFILE_DEFAULT: 300, // 5m – good general-purpose cache
  USER_PROFILE_LONG: 1800, // 30m – if data rarely changes
  ORGANIZER_DEFAULT: 300,
  ORGANIZER_APP: 300,
  USER_APPS_LIST: 300,
  CATEGORY_LIST: 3600, // 1h – rarely changes
  CONFIG_LONG: 86400, // 24h – app config constants
});
