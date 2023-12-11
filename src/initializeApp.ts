import admin = require("firebase-admin");
import * as amplitude from "@amplitude/analytics-node";

export default function initializeApp() {
  require("dotenv").config();
  if (process.env.DEV === "true") {
    console.log("process.env.DEV true, serving local firestore DB");
    admin.initializeApp({
      projectId: "hurd-46ce3",
      credential: admin.credential.applicationDefault(),
      databaseURL: "localhost:8080",
    });
  } else {
    if (!process.env.SENTRY_DSN) console.log("Sentry notinitialized");
    require("@sentry/serverless").GCPFunction.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });

    if (process.env.AMPLITUDE_KEY) {
      console.log("Amplitude initialized");
      amplitude.init(process.env.AMPLITUDE_KEY);
    } else {
      console.log("Amplitude not initialized");
    }
    admin.initializeApp({});
  }
}
