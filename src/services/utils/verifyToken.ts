import jwt = require("jsonwebtoken");

export function verifyToken(token: string, secret: string) {
  return new Promise((resolve, reject) => {
    return jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(decoded);
      }
    });
  });
}
