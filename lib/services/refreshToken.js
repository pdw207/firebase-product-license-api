"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("firebase-functions/logger");
const extractUserDataFromToken_1 = require("./utils/extractUserDataFromToken");
const tokenService_1 = require("./tokenService");
const Sentry = require("@sentry/serverless");
const randomTimeout = (ms = 5000) => new Promise((res) => setTimeout(res, Math.floor(Math.random() * ms)));
/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 * @return {int} The sum of the two numbers.
 */
async function refreshToken(req, res, admin) {
    const { token, machineIdentifier } = req.body;
    if (!admin)
        admin = require("firebase-admin");
    try {
        let jwtSecret;
        if (process.env.JWT_SECRET) {
            jwtSecret = process.env.JWT_SECRET;
        }
        else {
            throw new Error("Server config invalid");
        }
        if (!token || !machineIdentifier) {
            if (!machineIdentifier)
                (0, logger_1.error)("Machine identifier or token missing");
            return res.status(400).send({ error: "Bad request" });
        }
        const { session, license, sessionId, userId } = (await (0, extractUserDataFromToken_1.default)(token, jwtSecret, admin)) || {};
        if (!session) {
            Sentry.captureException(`unauthorized token: ${token}`);
            return res.status(401).send({ error: "Unauthorized" });
        }
        // License key not found or deactivated
        if (session.userId !== userId) {
            Sentry.captureException(`User ID mismatch for session ${sessionId}`);
            await randomTimeout();
            return res.status(401).send({ error: "Invalid Session UserId" });
        }
        // License key not found or deactivated
        if (license.status !== "ACTIVE") {
            Sentry.captureException(`Key ${session.licenseKey} not active`);
            await randomTimeout();
            return res.status(401).send({ error: "Invalid license key" });
        }
        // Don't refresh the token if the client does not have the machine identifier
        if (!license.machines.includes(machineIdentifier)) {
            Sentry.captureException(`Machine identifier not found in license key ${session.licenseKey}`);
            return res.status(401).send({ message: "Invalid token" });
        }
        const sessionPayload = await (0, tokenService_1.createSessionFromTokens)(session.email, machineIdentifier, session.licenseKey, license.plan, admin);
        return res.status(200).send(sessionPayload);
    }
    catch (e) {
        (0, logger_1.error)(e);
        Sentry.captureException(e);
        return res.status(500).send({ error: "Server error" });
    }
}
exports.default = refreshToken;
//# sourceMappingURL=refreshToken.js.map