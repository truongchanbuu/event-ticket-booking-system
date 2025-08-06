import config from "../config/index.js";

export function verifyServiceToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token || token !== config.app.serviceKey) {
        return res.status(403).json({ message: "Unauthorized service" });
    }

    next();
}
