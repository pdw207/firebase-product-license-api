import {error} from "firebase-functions/logger";
import extractUserDataFromToken from "./utils/extractUserDataFromToken";
import {createSessionFromTokens} from "./tokenService";
const Sentry = require("@sentry/serverless");

const randomTimeout = (ms = 5000) =>
  new Promise((res) => setTimeout(res, Math.floor(Math.random() * ms)));

/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 * @return {int} The sum of the two numbers.
 */
export default async function refreshToken(req: any, res: any, admin: any) {
  const {token, machineIdentifier} = req.body;
  if (!admin) admin = require("firebase-admin");

  try {
    let jwtSecret;
    if (process.env.JWT_SECRET) {
      jwtSecret = process.env.JWT_SECRET;
    } else {
      throw new Error("Server config invalid");
    }
    if (!token || !machineIdentifier) {
      if (!machineIdentifier) error("Machine identifier or token missing");
      return res.status(400).send({error: "Bad request"});
    }

    const {session, license, sessionId, userId} =
      (await extractUserDataFromToken(token, jwtSecret, admin)) || {};
    if (!session) {
      Sentry.captureException(`unauthorized token: ${token}`);
      return res.status(401).send({error: "Unauthorized"});
    }

    // License key not found or deactivated
    if (session.userId !== userId) {
      Sentry.captureException(`User ID mismatch for session ${sessionId}`);
      await randomTimeout();
      return res.status(401).send({error: "Invalid Session UserId"});
    }
    // License key not found or deactivated
    if (license.status !== "ACTIVE") {
      Sentry.captureException(`Key ${session.licenseKey} not active`);
      await randomTimeout();
      return res.status(401).send({error: "Invalid license key"});
    }

    // Don't refresh the token if the client does not have the machine identifier
    if (!license.machines.includes(machineIdentifier)) {
      Sentry.captureException(
        `Machine identifier not found in license key ${session.licenseKey}`,
      );
      return res.status(401).send({message: "Invalid token"});
    }

    const sessionPayload = await createSessionFromTokens(
      session.email,
      machineIdentifier,
      session.licenseKey,
      license.plan,
      admin,
    );

    return res.status(200).send(sessionPayload);
  } catch (e) {
    error(e);
    Sentry.captureException(e);
    return res.status(500).send({error: "Server error"});
  }
}
