"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("firebase-functions/logger");
const sessions_1 = require("./utils/sessions");
const verifyToken_1 = require("./utils/verifyToken");
const Sentry = require("@sentry/serverless");
async function revokeRefreshTokens(req, res, admin) {
    try {
        const { refreshToken, revokeSelf = true } = req.body;
        if (!admin)
            admin = require("firebase-admin");
        if (!process.env.JWT_SECRET)
            throw new Error("Server config invalid");
        const decodedRefreshToken = await (0, verifyToken_1.verifyToken)(refreshToken, process.env.JWT_SECRET);
        if (!decodedRefreshToken.sessionId) {
            return res.status(400).send({ error: "Bad request" });
        }
        (0, logger_1.info)("revokeRefreshTokens", decodedRefreshToken);
        await (0, sessions_1.revokeSessions)(decodedRefreshToken, revokeSelf, admin);
        return res.status(200).send({ message: "OK" });
    }
    catch (e) {
        Sentry.captureException(e);
        (0, logger_1.error)(e);
        return res.status(500).send({ error: "Server error" });
    }
}
exports.default = revokeRefreshTokens;
//# sourceMappingURL=revokeRefreshTokens.js.map