"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const logger_1 = require("firebase-functions/logger");
const createLicenseKey_1 = require("./createLicenseKey");
const base_1 = require("./utils/base");
const sendMessageToSlack_1 = require("../services/sendMessageToSlack");
const createLicenseKeyUtils_1 = require("./utils/createLicenseKeyUtils");
const Sentry = require("@sentry/serverless");
async function createUser(req, resp) {
    try {
        const { email, name, how_heard: referral, occupation, recording_frequency: recordingFrequency, } = req.body;
        if (!email || !name) {
            (0, logger_1.error)("Email and name required");
            resp.set("Location", "https://hurd.ai/beta");
            resp.status(302).send({ error: "Error creating user" });
            return;
        }
        const hurdRef = admin.firestore().collection("config").doc("hurd");
        const configSnapShot = await hurdRef.get();
        const configData = configSnapShot.data();
        if ((configData === null || configData === void 0 ? void 0 : configData.status) !== "OPEN") {
            resp.set("Location", "https://hurd.ai/beta-closed");
            resp.status(302).send();
            return;
        }
        const userRef = admin.firestore().collection("users").doc(email);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            const querySnapshot = await admin
                .firestore()
                .collection("licenseKeys")
                .where("email", "==", email)
                .limit(1)
                .get();
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                await (0, createLicenseKeyUtils_1.createWelcomeEmail)(admin.firestore(), doc.id, email);
            }
            resp.set("Location", "https://hurd.ai/beta");
            resp.status(302).send({ error: "Error creating user" });
            return;
        }
        else {
            await userRef.create({
                name,
                referral,
                occupation,
                recordingFrequency,
            });
        }
        await (0, createLicenseKey_1.default)({ email });
        (0, base_1.trackEvent)("user_created", {}, email);
        // Slack failure should not prevent user from being redirected
        try {
            await (0, sendMessageToSlack_1.default)(email, {
                Referral: referral,
                Occupation: occupation,
                Frequency: recordingFrequency,
            });
        }
        catch (error) {
            Sentry.captureException(error);
        }
        resp.set("Location", "https://hurd.ai/beta-download");
        resp.status(302).send();
    }
    catch (error) {
        Sentry.captureException(error);
        resp.set("Location", "https://hurd.ai/beta");
        resp.status(302).send({ error: "Error creating user" });
    }
}
exports.default = createUser;
//# sourceMappingURL=createUser.js.map