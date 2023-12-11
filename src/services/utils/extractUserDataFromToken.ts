import {error} from "firebase-functions/logger";
import {getSessionById} from "./sessions";
const Sentry = require("@sentry/serverless");
import {verifyToken} from "./verifyToken";

export default async function extractUserDataFromToken(
  token: string,
  jwtSecret: string,
  admin: any,
) {
  try {
    const decoded: any = await verifyToken(token, jwtSecret);

    const session = await getSessionById(decoded.sessionId, admin);
    if (!session) {
      throw new Error(
        `Session ${decoded.sessionId} for user ${decoded.userId} not found`,
      );
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
      throw new Error(
        `License key not found in for session ${decoded.sessionId} and key ${session.licenseKey}`,
      );
    }

    return {
      license,
      session,
      sessionId: decoded.sessionId,
      userId: decoded.userId,
    };
  } catch (e: any) {
    Sentry.captureException(e);
    error("License key not found", e);
    return {};
  }
}
