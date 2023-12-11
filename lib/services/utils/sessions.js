"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSessions = exports.deleteSession = exports.updateSession = exports.getSessionById = exports.createSession = void 0;
// Create a new session document
const createSession = async (session, firebase) => {
    const docRef = await firebase.firestore().collection("sessions").add(session);
    return docRef.id;
};
exports.createSession = createSession;
// Get a session document by ID
const getSessionById = async (sessionId, firebase) => {
    const snapshot = await firebase
        .firestore()
        .collection("sessions")
        .doc(sessionId)
        .get();
    return (snapshot.data() || {});
};
exports.getSessionById = getSessionById;
// Update a session document
const updateSession = async (sessionId, session, firebase) => {
    await firebase
        .firestore()
        .collection("sessions")
        .doc(sessionId)
        .update(session);
};
exports.updateSession = updateSession;
// Delete a session document
const deleteSession = async (sessionId, firebase) => {
    await firebase.firestore().collection("sessions").doc(sessionId).delete();
};
exports.deleteSession = deleteSession;
const revokeSessions = async (token, revokeSelf, firebase) => {
    const sessionsRef = firebase.firestore().collection("sessions");
    // create a query to find sessions that match the specified conditions
    const querySnapshot = await sessionsRef
        .where("userId", "==", token.userId)
        .get();
    // revoke the sessions by deleting their documents
    const batch = firebase.firestore().batch();
    querySnapshot.forEach((doc) => {
        if (doc.id !== token.sessionId) {
            batch.delete(doc.ref);
        }
        else if (revokeSelf) {
            batch.delete(doc.ref);
        }
    });
    await batch.commit();
};
exports.revokeSessions = revokeSessions;
//# sourceMappingURL=sessions.js.map