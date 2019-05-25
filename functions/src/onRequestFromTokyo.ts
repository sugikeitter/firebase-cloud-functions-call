import * as functions from "firebase-functions";
import * as express from 'express';
import * as cors from 'cors';

const app = express();
app.use(cors({}));

app.get("/", (req, res) => {
    res.send({message: "Hello, " + req.query.name + ". onRequestFrom 🗼"})
});

export default functions
  .region("asia-northeast1")
  .https.onRequest(app);