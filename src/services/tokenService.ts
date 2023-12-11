import {info} from "firebase-functions/logger";
import jwt = require("jsonwebtoken");
import {Timestamp} from "firebase-admin/firestore";
import {createSession} from "./utils/sessions";
import {v4 as uuidv4} from "uuid";

function getUserID(email: string, machineIdentifier: string) {
  return `${Buffer.from(email).toString("base64")}-${machineIdentifier.slice(
    0,
    10,
  )}`;
}
export function createOfflineToken(email: string) {
  const data = email;
  const signer = require("crypto").createSign("rsa-sha256");
  if (!process.env.HURD_PRIVATE_KEY) {
    throw new Error("HURD_PRIVATE_KEY config invalid");
  }
  const signature = signer.sign(process.env.HURD_PRIVATE_KEY, "hex");
  // // Combine the encoded data and signature to create a license key
  return `${Buffer.from(data).toString("base64")}.${signature}`;
}

export function createAccessToken(
  email: string,
  userId: string,
  plan: string,
  tokenIdentifier: string,
) {
  if (!process.env.ISS) throw new Error("ISS config invalid");
  const jwtPayload = {
    userId,
    email,
    plan,
    iss: process.env.ISS,
    tokenIdentifier,
    version: "1.0.0",
  };
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET config invalid");
  return jwt.sign(jwtPayload, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}
// Currenty, the refresh token has no expiration date. This is a security risk
// even though the refresh token is stored in the client file system, it is not encrypted
// and can be stolen. We would need to implement a refresh token rotation strategy
// that includes a refresh token expiration date and confirmation of the user's email
// by 1) introducing client side handling of requests with expired refresh tokens that direct
// the user to their email, 2) a new security mailer in the refresh endpoint that includes a
// confirm link, and 3) an email address confirmation endpoint that updates the refresh token
// The refresh token would be valid for 7 days  and the user would  need to confirm their
// email address every 7 days  to get a new refresh token.
export function createRefreshToken(userId: string, sessionId: string) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET config invalid");
  if (!process.env.ISS) throw new Error("ISS config invalid");
  return jwt.sign(
    {
      userId,
      sessionId,
      iss: process.env.ISS,
      version: "1.0.0",
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
    },
  );
}

export async function createSessionFromTokens(
  email: string,
  machineIdentifier: string,
  licenseKey: string,
  plan: string,
  firebase: any,
) {
  const tokenIdentifier = uuidv4();
  const userId = getUserID(email, machineIdentifier);
  const accessToken = createAccessToken(email, userId, plan, tokenIdentifier);

  // session created with accessToken
  const session = {
    email,
    userId,
    licenseKey,
    createdAt: Timestamp.now(),
    tokenIdentifier,
  };
  const sessionID = await createSession(session, firebase);
  info("created new session", sessionID);
  // update refresh token with session id
  const refreshToken = createRefreshToken(userId, sessionID);

  return {accessToken, refreshToken};
}
