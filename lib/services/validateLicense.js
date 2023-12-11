"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("firebase-functions/logger");
const jwt = require("jsonwebtoken");
/**
 * Activate function for firebase public REST endpoint
 * @param {any} req HTTP Request Object.
 * @param {any} res HTTP Response Object.
 * @param {any} admin Firebase-admin dependency injection.
 * @return {int} The sum of the two numbers.
 */
async function validateLicense(req, res, admin) {
    if (!admin) {
        admin = require("firebase-admin");
    }
    const { token } = req.body;
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("Server configuration invalid");
        }
        var decoded = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                (0, logger_1.info)("Invalid license key");
                return res.status(401).send({ error: "Invalid license key" });
            }
            (0, logger_1.info)("Valid license key");
            return res.status(200).send({ message: "Valid license key" });
        });
        // TODO Handle update to license key with new ip address
        // should send new ip address confirmation email
        if (decoded.ip != req.ip) {
            (0, logger_1.error)("IP Address does not match license key");
            return res.status(401).send({ error: "Li" });
        }
    }
    catch (e) {
        return res.status(500).send({ error: "Server error" });
    }
}
exports.default = validateLicense;
//# sourceMappingURL=validateLicense.js.map