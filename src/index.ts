import functions = require("firebase-functions");
import {
  createUser,
  generateToken,
  refreshToken,
  verifyCaptcha,
  revokeRefreshTokens,
} from "./services";
import initializeApp from "./initializeApp";

initializeApp();

exports.createUser = functions.https.onRequest((req: any, res: any) => {
  verifyCaptcha(req, res, async () => await createUser(req, res));
});

exports.generateToken = functions.https.onRequest((req: any, resp: any) =>
  generateToken(req, resp, null),
);

exports.refreshToken = functions.https.onRequest((req: any, resp: any) =>
  refreshToken(req, resp, null),
);

exports.revokeRefreshTokens = functions.https.onRequest((req: any, resp: any) =>
  revokeRefreshTokens(req, resp, null),
);

exports.summarize = functions.https.onRequest((req: any, resp: any) =>
  summarize({body}, resp, null),
);
