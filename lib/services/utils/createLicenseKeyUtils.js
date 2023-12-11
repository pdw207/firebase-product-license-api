"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWelcomeEmail = exports.createLicense = void 0;
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("firebase-functions/logger");
const createWelcomeEmail = (firestore, licenseKey, email) => {
    firestore.collection("mail").add({
        createdAt: firestore_1.Timestamp.now(),
        to: [email],
        template: {
            data: {
                accessKey: licenseKey
            },
            name: "welcome"
        }
    });
};
exports.createWelcomeEmail = createWelcomeEmail;
const updateLicenseKeyinUser = async (firestore, licenseKey, email) => {
    const userRef = firestore.collection("users").doc(email);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        await userRef.update({ licenseKey, updatedAt: firestore_1.Timestamp.now() });
        (0, logger_1.info)("User license key updated successfully");
    }
    else {
        throw new Error("User license key not updated because no user was found");
    }
};
const createLicense = async (firestore, licenseKey, email) => {
    await updateLicenseKeyinUser(firestore, licenseKey, email);
    const currentDate = new Date();
    // Add one week to the current date and time
    const onWeekFromNow = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    await firestore
        .collection("licenseKeys")
        .doc(licenseKey)
        .set({
        createdAt: firestore_1.Timestamp.now(),
        email: email,
        expiresAt: firestore_1.Timestamp.fromDate(onWeekFromNow),
        activations: 0,
        maxActivations: 1,
        machines: [],
        activatedAt: [],
        status: "ACTIVE",
        plan: "BASIC_TRIAL"
    });
};
exports.createLicense = createLicense;
//# sourceMappingURL=createLicenseKeyUtils.js.map