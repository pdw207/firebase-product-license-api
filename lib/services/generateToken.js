"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("firebase-functions/logger");
const base_1 = require("./utils/base");
const userSecurityEmails_1 = require("./utils/userSecurityEmails");
const tokenService_1 = require("./tokenService");
const Sentry = require("@sentry/serverless");
const randomTimeout = (ms = 5000) => new Promise((res) => setTimeout(res, Math.floor(Math.random() * ms)));
/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 */
async function generateToken(req, res, admin) {
    if (!admin) {
        admin = require("firebase-admin");
    }
    const { licenseKey, machineIdentifier } = req.body;
    if (!licenseKey)
        throw new Error("License key not provided");
    try {
        const licenseRef = admin
            .firestore()
            .collection("licenseKeys")
            .doc(licenseKey);
        const licenseSnapshot = await licenseRef.get();
        const licenseData = licenseSnapshot.data();
        if (!process.env.JWT_SECRET) {
            (0, logger_1.error)("JWT_SECRET not set in environment variables");
            Sentry.captureException("JWT_SECRET not set in environment variables");
            return res.status(500).send({ error: "Server configuration invalid" });
        }
        // License key not found or deactivated
        if (!licenseData || licenseData.status !== "ACTIVE") {
            (0, logger_1.warn)(`Key ${licenseKey} not active or not found`);
            Sentry.captureException(`Key ${licenseKey} not active or not found`);
            await randomTimeout();
            return res.status(401).send({ error: "Invalid license key" });
        }
        const { expiresAt, activations, maxActivations, email, machines, plan } = licenseData;
        if (!email || !machineIdentifier) {
            (0, logger_1.warn)(`Invalid machine identifier ${machineIdentifier} or email ${email} for key ${licenseKey}`);
            return res.status(401).send({ error: "Email and/or machine ID not found" });
        }
        // Machine already activated
        if (machines.includes(machineIdentifier)) {
            throw new Error(`Machine already activated for key ${licenseKey}`);
        }
        // Max activations exceeded
        if (activations >= maxActivations) {
            await randomTimeout();
            (0, logger_1.warn)(`{Attempting ${activations} activation but max activations are ${maxActivations} for key ${licenseKey}`);
            return res.status(403).send({ error: "Max activations exceeded" });
        }
        const currentTime = firestore_1.Timestamp.now();
        // Check if license has expired
        if (expiresAt < currentTime) {
            (0, logger_1.warn)(`generate token failed due to  expired license for key ${licenseKey}`);
            Sentry.captureException(`generate token failed due to  expired license for key ${licenseKey}`);
            await randomTimeout();
            return res.status(403).send({ error: "Expired license key" });
        }
        await licenseRef.update({
            activations: firestore_1.FieldValue.increment(1),
            machines: firestore_1.FieldValue.arrayUnion(machineIdentifier),
            activatedAt: firestore_1.FieldValue.arrayUnion(currentTime),
        });
        // Send activation security notice for all new activations
        await (0, userSecurityEmails_1.sendMachineAddedEmail)(email, licenseKey, admin);
        const sessionPayload = await (0, tokenService_1.createSessionFromTokens)(email, machineIdentifier, licenseKey, plan, admin);
        (0, logger_1.info)("token generated");
        (0, base_1.trackEvent)("token_generated", {}, email);
        return res.status(200).send(sessionPayload);
    }
    catch (e) {
        (0, logger_1.error)(e);
        Sentry.captureException(e);
        return res.status(401).send({ error: "Token failed to generate" });
    }
}
exports.default = generateToken;
//# sourceMappingURL=generateToken.js.map