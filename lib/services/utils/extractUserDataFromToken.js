"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("firebase-functions/logger");
const sessions_1 = require("./sessions");
const Sentry = require("@sentry/serverless");
const verifyToken_1 = require("./verifyToken");
async function extractUserDataFromToken(token, jwtSecret, admin) {
    try {
        const decoded = await (0, verifyToken_1.verifyToken)(token, jwtSecret);
        const session = await (0, sessions_1.getSessionById)(decoded.sessionId, admin);
        if (!session) {
            throw new Error(`Session ${decoded.sessionId} for user ${decoded.userId} not found`);
        }
        if (!session.licenseKey) {
            throw new Error(`License key not found in session ${decoded.sessionId}`);
        }
        const licenseRef = admin
            .firestore()
            .collection("licenseKeys")
            .doc(session.licenseKey);
        const licenseSnapshot = await licenseRef.get();
        const license = licenseSnapshot.data();
        if (!license) {
            throw new Error(`License key not found in for session ${decoded.sessionId} and key ${session.licenseKey}`);
        }
        return {
            license,
            session,
            sessionId: decoded.sessionId,
            userId: decoded.userId,
        };
    }
    catch (e) {
        Sentry.captureException(e);
        (0, logger_1.error)("License key not found", e);
        return {};
    }
}
exports.default = extractUserDataFromToken;
//# sourceMappingURL=extractUserDataFromToken.js.map