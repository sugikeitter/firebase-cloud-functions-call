import * as functions from 'firebase-functions';

export default functions.https.onRequest((req, res) => {
  res.send({message: "Hello, " + req.query.name + ". onRequestFrom 🇺🇸"})
});