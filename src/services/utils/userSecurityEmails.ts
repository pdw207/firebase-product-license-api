import {Timestamp} from "firebase-admin/firestore";
import {info} from "firebase-functions/logger";
const CONFIRM_EMAIL_URL = "https://hurd.ai/confirm";

export const sendMachineAddedEmail = (
  email: string,
  licenseKey: string,
  admin: any,
) => {
  const mailRef = admin.firestore().collection("mail").doc();
  return mailRef.set({
    createdAt: Timestamp.now(),
    to: [email],

    template: {
      data: {
        accessKey: licenseKey,
      },
      name: "security",
    },
  });
};

export const emailConfirmationEmail = (
  email: string,
  licenseKey: string,
  admin: any,
) => {
  const mailData = {
    to: [email],
    message: {
      // eslint-disable-next-line max-len
      text: `Click the following link to confirm your email address: ${CONFIRM_EMAIL_URL}/${licenseKey}`,
      // eslint-disable-next-line max-len
      html: `Click the following link to confirm your email address: <a href="${CONFIRM_EMAIL_URL}/${licenseKey}">${CONFIRM_EMAIL_URL}/${licenseKey}</a>`,
    },
  };
  info("confirmation email sent to user");
  return admin.firestore().collection("mail").add(mailData);
};
