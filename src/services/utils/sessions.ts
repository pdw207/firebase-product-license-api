import {Timestamp} from "firebase-admin/firestore";

// Define the structure of the session document
interface Session {
  email: string;
  userId: string;
  tokenIdentifier: string;
  licenseKey: string;
  createdAt: Timestamp;
}

// Create a new session document
const createSession = async (session: Session, firebase: any) => {
  const docRef = await firebase.firestore().collection("sessions").add(session);
  return docRef.id;
};

// Get a session document by ID
const getSessionById = async (sessionId: string, firebase: any) => {
  const snapshot = await firebase
    .firestore()
    .collection("sessions")
    .doc(sessionId)
    .get();
  return (snapshot.data() || {}) as Session;
};

// Update a session document
const updateSession = async (
  sessionId: string,
  session: Partial<Session>,
  firebase: any,
) => {
  await firebase
    .firestore()
    .collection("sessions")
    .doc(sessionId)
    .update(session);
};

// Delete a session document
const deleteSession = async (sessionId: string, firebase: any) => {
  await firebase.firestore().collection("sessions").doc(sessionId).delete();
};

const revokeSessions = async (
  token: {
    sessionId: string;
    userId: string;
    licenseKey: string;
  },
  revokeSelf: boolean,
  firebase: any,
) => {
  const sessionsRef = firebase.firestore().collection("sessions");

  // create a query to find sessions that match the specified conditions
  const querySnapshot = await sessionsRef
    .where("userId", "==", token.userId)
    .get();

  // revoke the sessions by deleting their documents
  const batch = firebase.firestore().batch();
  querySnapshot.forEach((doc: any) => {
    if (doc.id !== token.sessionId) {
      batch.delete(doc.ref);
    } else if (revokeSelf) {
      batch.delete(doc.ref);
    }
  });
  await batch.commit();
};
export {
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  revokeSessions,
};
