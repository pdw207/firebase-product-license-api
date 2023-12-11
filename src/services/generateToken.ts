import {Timestamp, FieldValue} from "firebase-admin/firestore";
import {error, warn, info} from "firebase-functions/logger";
import {trackEvent} from "./utils/base";
import {sendMachineAddedEmail} from "./utils/userSecurityEmails";
import {createSessionFromTokens} from "./tokenService";
const Sentry = require("@sentry/serverless");

const randomTimeout = (ms = 5000) =>
  new Promise((res) => setTimeout(res, Math.floor(Math.random() * ms)));

/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 */
export default async function generateToken(req: any, res: any, admin: any) {
  if (!admin) {
    admin = require("firebase-admin");
  }
  const {licenseKey, machineIdentifier} = req.body;
  if (!licenseKey) throw new Error("License key not provided");
  try {
    const licenseRef = admin
      .firestore()
      .collection("licenseKeys")
      .doc(licenseKey);
    const licenseSnapshot = await licenseRef.get();
    const licenseData = licenseSnapshot.data();

    if (!process.env.JWT_SECRET) {
      error("JWT_SECRET not set in environment variables");
      Sentry.captureException("JWT_SECRET not set in environment variables");
      return res.status(500).send({error: "Server configuration invalid"});
    }

    // License key not found or deactivated
    if (!licenseData || licenseData.status !== "ACTIVE") {
      warn(`Key ${licenseKey} not active or not found`);
      Sentry.captureException(`Key ${licenseKey} not active or not found`);
      await randomTimeout();
      return res.status(401).send({error: "Invalid license key"});
    }

    const {expiresAt, activations, maxActivations, email, machines, plan} =
      licenseData;

    if (!email || !machineIdentifier) {
      warn(
        `Invalid machine identifier ${machineIdentifier} or email ${email} for key ${licenseKey}`,
      );
      return res.status(401).send({error: "Email and/or machine ID not found"});
    }

    // Machine already activated
    if (machines.includes(machineIdentifier)) {
      throw new Error(`Machine already activated for key ${licenseKey}`);
    }

    // Max activations exceeded
    if (activations >= maxActivations) {
      await randomTimeout();

      warn(
        `{Attempting ${activations} activation but max activations are ${maxActivations} for key ${licenseKey}`,
      );

      return res.status(403).send({error: "Max activations exceeded"});
    }
    const currentTime = Timestamp.now();

    // Check if license has expired

    if (expiresAt < currentTime) {
      warn(
        `generate token failed due to  expired license for key ${licenseKey}`,
      );
      Sentry.captureException(
        `generate token failed due to  expired license for key ${licenseKey}`,
      );
      await randomTimeout();
      return res.status(403).send({error: "Expired license key"});
    }

    await licenseRef.update({
      activations: FieldValue.increment(1),
      machines: FieldValue.arrayUnion(machineIdentifier),
      activatedAt: FieldValue.arrayUnion(currentTime),
    });

    // Send activation security notice for all new activations
    await sendMachineAddedEmail(email, licenseKey, admin);

    const sessionPayload = await createSessionFromTokens(
      email,
      machineIdentifier,
      licenseKey,
      plan,
      admin,
    );

    info("token generated");
    trackEvent("token_generated", {}, email);
    return res.status(200).send(sessionPayload);
  } catch (e) {
    error(e);
    Sentry.captureException(e);
    return res.status(401).send({error: "Token failed to generate"});
  }
}
