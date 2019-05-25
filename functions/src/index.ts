// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exportIfNeeded("onCallFromTokyo", exports);
exportIfNeeded("onRequestFromUS", exports);
exportIfNeeded("onRequestFromTokyo", exports);

/**
 * @see {@link https://medium.com/@oogatta/%E4%BB%8A%E3%81%8B%E3%82%89cloud-functions-for-firebase%E3%82%92%E3%82%84%E3%82%8B%E3%81%AA%E3%82%89%E3%81%93%E3%81%86%E3%81%97%E3%81%9F%E3%81%8B%E3%81%A3%E3%81%9F-%E3%81%9D%E3%81%AE1-8a6413bcc308}
 * @see {@link https://tech.ginco.io/post/ginco-engineer-meetup-2018-cloud-functions/}
 * @param functionName
 * @param exports
 */
export default function exportIfNeeded(functionName: string, exports: {[key: string]: any}): void {
  if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === functionName) {
    exports[functionName] = require(`./${functionName}`).default;
  }
}