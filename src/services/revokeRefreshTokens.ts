import {error, info} from "firebase-functions/logger";
import {revokeSessions} from "./utils/sessions";
import {verifyToken} from "./utils/verifyToken";
const Sentry = require("@sentry/serverless");

export default async function revokeRefreshTokens(
  req: any,
  res: any,
  admin: any,
) {
  try {
    const {refreshToken, revokeSelf = true} = req.body;
    if (!admin) admin = require("firebase-admin");
    if (!process.env.JWT_SECRET) throw new Error("Server config invalid");

    const decodedRefreshToken: any = await verifyToken(
      refreshToken,
      process.env.JWT_SECRET,
    );

    if (!decodedRefreshToken.sessionId) {
      return res.status(400).send({error: "Bad request"});
    }

    info("revokeRefreshTokens", decodedRefreshToken);
    await revokeSessions(decodedRefreshToken, revokeSelf, admin);

    return res.status(200).send({message: "OK"});
  } catch (e) {
    Sentry.captureException(e);
    error(e);
    return res.status(500).send({error: "Server error"});
  }
}
