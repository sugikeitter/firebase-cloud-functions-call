# はじめに

静的なWebアプリをさくっと公開できる[Firebase](https://firebase.google.com/)の[Hosting](https://firebase.google.com/docs/hosting/)は、同じく[Firebase](https://firebase.google.com/)の[Cloud Functions](https://firebase.google.com/docs/functions/)と連携させることで動的なWebアプリにすることができて素敵だったので色々遊んでみました。
調べると連携方法がいくつかあったので、それぞれの簡単な実装でパフォーマンス（レスポンスが返ってくるまでの時間）を測定し、現時点でのメリットとデメリットをまとめてみました。

## サンプルページ

https://functions-call.firebaseapp.com
それぞれのCloud Functionsの呼び出し方法ごとにレスポンスにかかった時間をみれるだけのWebアプリ

## サンプルコード

https://github.com/sugikeitter/firebase-cloud-functions-call

※下の実装例と細かい変更点はある

# 要約

現在利用できる方法を自分なりに大きく3パターンに分け、それぞれの特徴をまとめた。

|No.|呼び出し方法              |認証処理|東京リージョン     |Firebaseアプリ以外からの呼び出し|CORS対応|
|---|-----------------------|------|----------------|-------|--------|
|1  |[Firebaseアプリからのリクエスト](https://firebase.google.com/docs/functions/callable)                  |✅Firebaseの認証|✅利用可              |⛔️   |✅不要(オリジンサーバと`Cloud Functions`のドメインは異なるが、FirebaseのSDKを利用するため)|
|2  |[HTTPでのリクエスト(Firebase Hosting連携)](https://firebase.google.com/docs/hosting/functions.html)  |✴️自前で設定が必要 |⛔️2019年4月では利用不可 |✅可能|✅不要(オリジンサーバとCloud Functionsのドメインが同じになるため)|
|3  |[HTTPでのリクエスト(CORS対応のためExpress利用)](https://firebase.google.com/docs/functions/http-events)|✴️自前で設定が必要 |✅利用可              |✅可能|✴️自前で設定が必要|

これらの特徴を踏まえて、どれを選択するかはこんな感じ

- Cloud Functionsを呼び出しはFirebaseのSDKを利用したものだけの想定であれば、[1. Firebaseアプリからのリクエスト](https://firebase.google.com/docs/functions/callable)を利用するのが良い
- Cloud Functionsにの呼び出しURLにカスタムドメインを設定したり、Hostingを利用してSSR(サーバサイドレンダリング)を利用したSPAを作りたいのであれば[2. HTTPでのリクエスト(Firebase Hosting連携](https://firebase.google.com/docs/hosting/functions.html))に限られる
  - [2019/05/11現在ではこれが利用できるのは`us-central1`(Iowa)に限られている](https://firebase.google.com/docs/functions/locations)ので、日本からアクセスする場合にレスポンス時間が少し悪くなる
- 日本からの利用のみでパフォーマンスを求める必要があり、Firebaseアプリ以外からの呼び出しにもCloud Functionsを利用したい場合は東京リージョンを利用するために[3. HTTPでのリクエスト(CORS対応のためExpress利用)](https://firebase.google.com/docs/functions/http-events) を利用することになる


# それぞれの実装例

## [Firebaseアプリからのリクエスト](https://firebase.google.com/docs/functions/callable)
### Cloud Functions側のコード

[functions.https.onCall](https://firebase.google.com/docs/reference/functions/functions.https#.onCall)を利用する。

```typescript
import * as functions from 'firebase-functions';

export onCallFromTokyo = functions
    .region("asia-northeast1")  // デフォルトでは東京リージョン指定できないため、.region("リージョン名")で指定
    .https
    .onCall((data, context) => {
      const name = data.name;
      return {
        message: "Hello, " + name + ". onCallFrom 🗼"
      }
    });
```

### Hosting側のコード

[firebase.functions.Functions.httpscallable](https://firebase.google.com/docs/reference/js/firebase.functions.Functions.html#httpscallable)を利用する。

```typescript
import firebase from 'firebase/app';
import 'firebase/functions';

const REGION_TOKYO = "asia-northeast1";

/* ~~~省略~~~ */

private onCall = async (): Promise<string> => {
  // Firebaseの
  const onCallFromTokyo = firebase.app()
      .functions(REGION_TOKYO) // Functionsのデプロイされているregion指定
      .httpsCallable("onCallFromTokyo"); // Functionsの関数名指定

  try {
    const result = await onCallFromTokyo({name: "sugi"});
    return result.data.message;
  } catch(e) {
    throw e;
  }
};
```


## [HTTPでのリクエスト(Firebase Hosting連携)](https://firebase.google.com/docs/hosting/functions.html)
### Cloud Functions側のコード

[functions.https.onRequest](https://firebase.google.com/docs/reference/functions/functions.https#.onRequest)を利用する。
一番シンプルなCloud Functionsの実装方法で、region指定しないと`us-central1`になる。

```typescript
import * as functions from 'firebase-functions';

export onRequestFrom = functions.https.onRequest((req, res) => {
  res.send({message: "Hello, " + req.query.name + ". onRequestFrom 🇺🇸"})
});
```

### firebase.jsonの設定
"hosting"->"rewrites"に、URLとアクセスリソースへのマッピングを定義する。
Hostingのみの利用でSPAであれば、`firebase init --hosting`で作成された状態が、`https://<YOUR_DOMAINE>`へのリクエストはパスがなんであれ`index.html`へのアクセスになる設定がされている。

```json
{
  "source": "**",  // ここより上に設定されているrewriteルールにマッチしないどんなパスでも
  "destination": "/index.html"  // このリソースを表示する
}
````

`sources`に対して`function`というキーワードを使うことで、Hostingのドメインを利用してCloud Functionsの呼び出しURLをマッピングさせることができる。

```json
**省略**
"hosting": {
**省略**
  "rewrites": [
    {
      "source": "/onRequestWithRewrite",  // このパスの場合
      "function": "onRequestFromUS"  // この名前のCloud Functionsを呼び出す
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
**省略**
```

### Hosting側のコード

通常のHTTPリクエストであるため[axios](https://github.com/axios/axios)を利用。

```typescript
import axios from "axios";

/* ~~~省略~~~ */

private onRequestWithRewrite = async (): Promise<string> => {
  try {
    // 同じドメインのパスへリクエストを送るため、axiosのGETであればパスの指定だけで良い
    const response = await axios.get("/onRequestWithRewrite?name=sugi");
    return response.data.message;
  } catch(e) {
    throw e;
  }
};
```

## [HTTPでのリクエスト(CORS対応のためExpress利用)](https://firebase.google.com/docs/functions/http-events)
### Cloud Functions側のコード

[functions.https.onRequest](https://firebase.google.com/docs/reference/functions/functions.https#.onRequest)を利用するが、HostingしているオリジンサーバとCloud Functionsのドメインは異なるため、CORS設定が必要になる。
そのため[公式ドキュメント](https://firebase.google.com/docs/functions/http-events#using_existing_express_apps)に従い、[Express](https://expressjs.com/)を利用して実装する。

```typescript
import * as functions from "firebase-functions";
import * as express from 'express';
import * as cors from 'cors';

const REGION_TOKYO = "asia-northeast1";
// Hostingから呼び出すため、CORS設定が必要になるので必要なモジュールを準備
const app = express();
app.use(cors({}));  // どのサイトからでも呼び出せるガバガバ設定

// Expressを利用してAPIの処理を実装
app.get("/", (req, res) => {  // リクエストパスを設定
    res.send({message: "Hello, " + req.query.name + ". onRequestFrom 🗼"})
});
onRequestFromTokyo = functions  // ここでhttps://<DOMAIN>/onRequestFromTokyo/がエンドポイントとなる
    .region(REGION_TOKYO)  // 東京リージョン指定
    .https.onRequest(app);  // onRequestにExpressアプリを渡す

export default onRequestFromTokyo;
```

### Hosting側のコード

通常のHTTPリクエストであるため[axios](https://github.com/axios/axios)を利用。

```typescript
import axios from "axios";

const REGION_TOKYO = "asia-northeast1";
const PROJECTID = "functions-call";
const FUNCTIONS_DOMAIN_TOKYO = REGION_TOKYO + "-" + PROJECTID + ".cloudfunctions.net";

/* ~~~省略~~~ */

private onRequest = async (): Promise<string> => {
  try {
    // デプロイしたFunctionsのURLを指定してGETリクエスト
    const response = await axios.get(
        "https://" + FUNCTIONS_DOMAIN_TOKYO + "/onRequestFromTokyo?name=sugi");
    return response.data.message;
  } catch(e) {
    throw e;
  }
};
```

# 参考資料
- https://firebase.google.com/docs
- [今からCloud Functions for Firebaseをやるならこうしたかったこと、その1](https://medium.com/@oogatta/%E4%BB%8A%E3%81%8B%E3%82%89cloud-functions-for-firebase%E3%82%92%E3%82%84%E3%82%8B%E3%81%AA%E3%82%89%E3%81%93%E3%81%86%E3%81%97%E3%81%9F%E3%81%8B%E3%81%A3%E3%81%9F-%E3%81%9D%E3%81%AE1-8a6413bcc308)
- [GincoにおけるCloud Functionsの利用とその高速化](https://tech.ginco.io/post/ginco-engineer-meetup-2018-cloud-functions/)
