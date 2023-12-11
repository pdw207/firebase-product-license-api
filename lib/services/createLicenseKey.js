"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLicenseKey = void 0;
const createLicenseKeyUtils_1 = require("./utils/createLicenseKeyUtils");
const logger_1 = require("firebase-functions/logger");
const uuid_1 = require("uuid");
const Sentry = require("@sentry/serverless");
// injecting admin to make testing easier
const createLicenseKey = async (user, admin) => {
    try {
        if (!admin) {
            admin = require("firebase-admin");
        }
        const licenseKey = (0, uuid_1.v4)();
        const email = user.email;
        if (!email) {
            throw new Error("email not present in user");
        }
        await (0, createLicenseKeyUtils_1.createLicense)(admin.firestore(), licenseKey, email);
        await (0, createLicenseKeyUtils_1.createWelcomeEmail)(admin.firestore(), licenseKey, email);
        (0, logger_1.info)(`Created license key ${licenseKey} and linked to user ${user.email}`);
        return null;
    }
    catch (err) {
        (0, logger_1.error)(err);
        Sentry.captureException(err);
        return Promise.reject(err);
    }
};
exports.createLicenseKey = createLicenseKey;
exports.default = (user) => (0, exports.createLicenseKey)(user, null);
//# sourceMappingURL=createLicenseKey.js.map