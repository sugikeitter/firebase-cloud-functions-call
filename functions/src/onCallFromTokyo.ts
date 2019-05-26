import * as functions from 'firebase-functions';

export default functions
  .region("asia-northeast1")
  .https
  .onCall((data, context) => {
    const name = data.name;
    return {
      message: "Hello, " + name + ". onCallFrom 🗼"
    }
  });