import {createLicense, createWelcomeEmail} from "./utils/createLicenseKeyUtils";
import {info, error} from "firebase-functions/logger";
import {v4} from "uuid";
const Sentry = require("@sentry/serverless");

// injecting admin to make testing easier
export const createLicenseKey = async (user: any, admin: any) => {
  try {
    if (!admin) {
      admin = require("firebase-admin");
    }

    const licenseKey = v4();
    const email = user.email;
    if (!email) {
      throw new Error("email not present in user");
    }
    await createLicense(admin.firestore(), licenseKey, email);
    await createWelcomeEmail(admin.firestore(), licenseKey, email);

    info(`Created license key ${licenseKey} and linked to user ${user.email}`);

    return null;
  } catch (err: any) {
    error(err);
    Sentry.captureException(err);
    return Promise.reject(err);
  }
};
export default (user: any) => createLicenseKey(user, null);
