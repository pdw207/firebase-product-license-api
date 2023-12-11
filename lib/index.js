"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const services_1 = require("./services");
const initializeApp_1 = require("./initializeApp");
(0, initializeApp_1.default)();
exports.createUser = functions.https.onRequest((req, res) => {
    (0, services_1.verifyCaptcha)(req, res, async () => await (0, services_1.createUser)(req, res));
});
exports.generateToken = functions.https.onRequest((req, resp) => (0, services_1.generateToken)(req, resp, null));
exports.refreshToken = functions.https.onRequest((req, resp) => (0, services_1.refreshToken)(req, resp, null));
exports.revokeRefreshTokens = functions.https.onRequest((req, resp) => (0, services_1.revokeRefreshTokens)(req, resp, null));
//# sourceMappingURL=index.js.map