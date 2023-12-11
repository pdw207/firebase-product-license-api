"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jwt = require("jsonwebtoken");
function verifyToken(token, secret) {
    return new Promise((resolve, reject) => {
        return jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            else {
                return resolve(decoded);
            }
        });
    });
}
exports.verifyToken = verifyToken;
//# sourceMappingURL=verifyToken.js.map