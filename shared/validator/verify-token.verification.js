export function verifyApiToken(req, res, next) {
  const apiKeyFromHeader = req.headers["x-api-key"];

  if (!apiKeyFromHeader) {
    console.warn(
      `[SECURITY] Missing x-api-key from ${req.ip} ${req.originalUrl}`
    );
    return res.status(401).json({ error: "Missing API key" });
  }

  if (apiKeyFromHeader !== process.env.SERVICE_SECRET_KEY) {
    console.warn(
      `[SECURITY] Invalid x-api-key from ${req.ip} ${req.originalUrl}`
    );
    return res.status(403).json({ error: "Invalid API key" });
  }

  next(); // Authorized
}
