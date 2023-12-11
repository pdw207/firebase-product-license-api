const admin = require("firebase-admin");

const serviceAccount = require("./firebase-config.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("users collection");
const db = admin.firestore();
const userRef = db.collection("users");

userRef
  .get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      console.log(doc.id);
    });
  })
  .catch((error) => {
    console.error(error);
  });
