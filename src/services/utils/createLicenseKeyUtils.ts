import {Timestamp} from "firebase-admin/firestore";
import {info} from "firebase-functions/logger";

const createWelcomeEmail = (
  firestore: any,
  licenseKey: string,
  email: string
) => {
  firestore.collection("mail").add({
    createdAt: Timestamp.now(),
    to: [email],
    template: {
      data: {
        accessKey: licenseKey
      },
      name: "welcome"
    }
  });
};

const updateLicenseKeyinUser = async (
  firestore: any,
  licenseKey: string,
  email: string
) => {
  const userRef = firestore.collection("users").doc(email);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.update({licenseKey, updatedAt: Timestamp.now()});
    info("User license key updated successfully");
  } else {
    throw new Error("User license key not updated because no user was found");
  }
};
const createLicense = async (
  firestore: any,
  licenseKey: string,
  email: string
) => {
  await updateLicenseKeyinUser(firestore, licenseKey, email);

  const currentDate = new Date();
  // Add one week to the current date and time
  const onWeekFromNow = new Date(
    currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  await firestore
    .collection("licenseKeys")
    .doc(licenseKey)
    .set({
      createdAt: Timestamp.now(),
      email: email,
      expiresAt: Timestamp.fromDate(onWeekFromNow),
      activations: 0,
      maxActivations: 1,
      machines: [],
      activatedAt: [],
      status: "ACTIVE",
      plan: "BASIC_TRIAL"
    });
};

export {createLicense, createWelcomeEmail};
