"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailConfirmationEmail = exports.sendMachineAddedEmail = void 0;
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("firebase-functions/logger");
const CONFIRM_EMAIL_URL = "https://hurd.ai/confirm";
const sendMachineAddedEmail = (email, licenseKey, admin) => {
    const mailRef = admin.firestore().collection("mail").doc();
    return mailRef.set({
        createdAt: firestore_1.Timestamp.now(),
        to: [email],
        template: {
            data: {
                accessKey: licenseKey,
            },
            name: "security",
        },
    });
};
exports.sendMachineAddedEmail = sendMachineAddedEmail;
const emailConfirmationEmail = (email, licenseKey, admin) => {
    const mailData = {
        to: [email],
        message: {
            // eslint-disable-next-line max-len
            text: `Click the following link to confirm your email address: ${CONFIRM_EMAIL_URL}/${licenseKey}`,
            // eslint-disable-next-line max-len
            html: `Click the following link to confirm your email address: <a href="${CONFIRM_EMAIL_URL}/${licenseKey}">${CONFIRM_EMAIL_URL}/${licenseKey}</a>`,
        },
    };
    (0, logger_1.info)("confirmation email sent to user");
    return admin.firestore().collection("mail").add(mailData);
};
exports.emailConfirmationEmail = emailConfirmationEmail;
//# sourceMappingURL=userSecurityEmails.js.map