import admin = require("firebase-admin");
import {error} from "firebase-functions/logger";
import createLicense from "./createLicenseKey";
import {trackEvent} from "./utils/base";
import sendMessageToSlack from "../services/sendMessageToSlack";
import {createWelcomeEmail} from "./utils/createLicenseKeyUtils";
const Sentry = require("@sentry/serverless");

export default async function createUser(req: any, resp: any) {
  try {
    const {
      email,
      name,
      how_heard: referral,
      occupation,
      recording_frequency: recordingFrequency,
    } = req.body;

    if (!email || !name) {
      error("Email and name required");
      resp.set("Location", process.env.REDIRECT_OPEN_URL);
      resp.status(302).send({error: "Error creating user"});
      return;
    }
    const appRef = admin
      .firestore()
      .collection("config")
      .doc(process.env.DOC_NAME || "App");
    const configSnapShot = await appRef.get();
    const configData = configSnapShot.data();
    if (configData?.status !== "OPEN") {
      resp.set("Location", process.env.REDIRECT_CLOSED_URL);
      resp.status(302).send();
      return;
    }
    const userRef = admin.firestore().collection("users").doc(email);

    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const querySnapshot = await admin
        .firestore()
        .collection("licenseKeys")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        await createWelcomeEmail(admin.firestore(), doc.id, email);
      }
      resp.set("Location", process.env.REDIRECT_OPEN_URL);
      resp.status(302).send({error: "Error creating user"});
      return;
    } else {
      await userRef.create({
        name,
        referral,
        occupation,
        recordingFrequency,
      });
    }

    await createLicense({email});
    trackEvent("user_created", {}, email);

    try {
      await sendMessageToSlack(email, {
        Referral: referral,
        Occupation: occupation,
        Frequency: recordingFrequency,
      });
    } catch (error) {
      Sentry.captureException(error);
    }

    resp.set("Location", process.env.REDIRECT_SUCCESS_URL);
    resp.status(302).send();
  } catch (error) {
    Sentry.captureException(error);
    resp.set("Location", process.env.REDIRECT_OPEN_URL);
    resp.status(302).send({error: "Error creating user"});
  }
}
