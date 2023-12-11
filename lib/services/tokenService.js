"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionFromTokens = exports.createRefreshToken = exports.createAccessToken = exports.createOfflineToken = void 0;
const logger_1 = require("firebase-functions/logger");
const jwt = require("jsonwebtoken");
const firestore_1 = require("firebase-admin/firestore");
const sessions_1 = require("./utils/sessions");
const uuid_1 = require("uuid");
function getUserID(email, machineIdentifier) {
    return `${Buffer.from(email).toString("base64")}-${machineIdentifier.slice(0, 10)}`;
}
function createOfflineToken(email) {
    const data = email;
    const signer = require("crypto").createSign("rsa-sha256");
    if (!process.env.HURD_PRIVATE_KEY) {
        throw new Error("HURD_PRIVATE_KEY config invalid");
    }
    const signature = signer.sign(process.env.HURD_PRIVATE_KEY, "hex");
    // // Combine the encoded data and signature to create a license key
    return `${Buffer.from(data).toString("base64")}.${signature}`;
}
exports.createOfflineToken = createOfflineToken;
function createAccessToken(email, userId, plan, tokenIdentifier) {
    if (!process.env.ISS)
        throw new Error("ISS config invalid");
    const jwtPayload = {
        userId,
        email,
        plan,
        iss: process.env.ISS,
        tokenIdentifier,
        version: "1.0.0",
    };
    if (!process.env.JWT_SECRET)
        throw new Error("JWT_SECRET config invalid");
    return jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: "1h",
    });
}
exports.createAccessToken = createAccessToken;
// Currenty, the refresh token has no expiration date. This is a security risk
// even though the refresh token is stored in the client file system, it is not encrypted
// and can be stolen. We would need to implement a refresh token rotation strategy
// that includes a refresh token expiration date and confirmation of the user's email
// by 1) introducing client side handling of requests with expired refresh tokens that direct
// the user to their email, 2) a new security mailer in the refresh endpoint that includes a
// confirm link, and 3) an email address confirmation endpoint that updates the refresh token
// The refresh token would be valid for 7 days  and the user would  need to confirm their
// email address every 7 days  to get a new refresh token.
function createRefreshToken(userId, sessionId) {
    if (!process.env.JWT_SECRET)
        throw new Error("JWT_SECRET config invalid");
    if (!process.env.ISS)
        throw new Error("ISS config invalid");
    return jwt.sign({
        userId,
        sessionId,
        iss: process.env.ISS,
        version: "1.0.0",
    }, process.env.JWT_SECRET, {
        algorithm: "HS256",
    });
}
exports.createRefreshToken = createRefreshToken;
async function createSessionFromTokens(email, machineIdentifier, licenseKey, plan, firebase) {
    const tokenIdentifier = (0, uuid_1.v4)();
    const userId = getUserID(email, machineIdentifier);
    const accessToken = createAccessToken(email, userId, plan, tokenIdentifier);
    // session created with accessToken
    const session = {
        email,
        userId,
        licenseKey,
        createdAt: firestore_1.Timestamp.now(),
        tokenIdentifier,
    };
    const sessionID = await (0, sessions_1.createSession)(session, firebase);
    (0, logger_1.info)("created new session", sessionID);
    // update refresh token with session id
    const refreshToken = createRefreshToken(userId, sessionID);
    return { accessToken, refreshToken };
}
exports.createSessionFromTokens = createSessionFromTokens;
//# sourceMappingURL=tokenService.js.map