import firebase from 'firebase/app';
import 'firebase/functions';

firebase.initializeApp({
  "apiKey": YOUR_API_KEY,
  "databaseURL": YOUR_DATABASE_URL,
  "storageBucket": YOUR_STORAGE_BUCKET,
  "authDomain": YOUR_AUTH_DOMAIN,
  "messagingSenderId": YOUR_MESSAGING_SENDER_ID,
  "projectId": YOUR_PROJECT_ID
});

export default firebase;