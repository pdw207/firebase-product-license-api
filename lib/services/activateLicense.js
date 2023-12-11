"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
const jwt = require("jsonwebtoken");
const logger_1 = require("firebase-functions/logger");
const firestore_1 = require("firebase-admin/firestore");
const userSecurityEmails_1 = require("./utils/userSecurityEmails");
const randomTimeout = (ms = 5000) =>
  new Promise((res) => setTimeout(res, Math.floor(Math.random() * ms)));
/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 */
async function activateLicense(req, res, admin) {
  if (!admin) {
    admin = require("firebase-admin");
  }
  const {licenseKey} = req.body;
  try {
    const licenseRef = admin
      .firestore()
      .collection("licenseKeys")
      .doc(licenseKey);
    const licenseSnapshot = await licenseRef.get();
    const licenseData = licenseSnapshot.data();
    if (!process.env.JWT_SECRET) {
      return res.status(500).send({error: "Server configuration invalid"});
    }
    // License key not found or deactivated
    if (!licenseData || licenseData.status !== "ACTIVE") {
      await randomTimeout();
      return res.status(401).send({error: "Invalid license key"});
    }
    const {expiresAt, activations, maxActivations, email, emailConfirmedAt} =
      licenseData;
    if (!email || !req.ip) {
      if (process.env.verbose)
        (0, logger_1.error)(`Invalid ip address ${req.ip} or email ${email} `);
      return res.status(401).send({error: "Email and/or IP address not found"});
    }
    // Max activations exceeded
    if (activations >= maxActivations) {
      await randomTimeout();
      if (process.env.verbose)
        (0, logger_1.error)(
          `Attempting ${activations} but max activations are ${maxActivations} `
        );
      return res.status(403).send({error: "Max activations exceeded"});
    }
    const currentTime = new Date().toISOString();
    // Check if license has expired
    if (expiresAt && currentTime > expiresAt) {
      await randomTimeout();
      return res.status(403).send({error: "Expired license key"});
    }
    const newIP = await admin
      .firestore()
      .collection("licenseKeys")
      .where("ipAddresses", "array-contains", req.ip)
      .get().empty;
    const oldEmailConfirmation =
      emailConfirmedAt &&
      emailConfirmedAt.toDate() &&
      new Date().getTime() - emailConfirmedAt.toDate().getTime() > 3600000;
    if (newIP) {
      // TODO implement endpoint for confirmation
      if (!emailConfirmedAt || oldEmailConfirmation) {
        await (0, userSecurityEmails_1.emailConfirmationEmail)(
          email,
          licenseKey,
          admin
        );
        (0, logger_1.info)(
          "Email confirmation sent for unrecognized IP or stale confirmation"
        );
        return res
          .status(403)
          .send({message: "Confirmation Required. Email confirmation sent"});
      }
      await licenseRef.update({
        activations: firestore_1.FieldValue.increment(1),
        ipAddresses: firestore_1.FieldValue.arrayUnion(req.ip),
        activatedAt: firestore_1.FieldValue.arrayUnion(currentTime)
      });
    }
    // Send activation security notice
    await (0, userSecurityEmails_1.sendMachineAddedEmail)(
      email,
      licenseKey,
      admin
    );
    // Create and sign JWT
    const jwtPayload = {
      licenseKey,
      email,
      ip: req.ip
    };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      algorithm: "HS256" // currently no expiration date set
    });
    return res.status(200).send({token});
  } catch (e) {
    (0, logger_1.error)(e);
    return res.status(401).send({message: "Invalid or expired token"});
  }
}
exports.default = activateLicense;
//# sourceMappingURL=activateLicense.js.map
