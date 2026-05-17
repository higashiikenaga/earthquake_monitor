# 地震・EEW・津波通知モニタ

地震情報、緊急地震速報、津波情報、強震モニタを1画面で確認し、ブラウザ通知とDiscord Webhookへ送信できるHTMLアプリです。

## 主な機能

- P2P地震情報 WebSocket API による地震・津波情報の受信
- Wolfx JMA EEW WebSocket による緊急地震速報の受信
- 最新地震情報、EEW発表状況、過去10件の地震履歴を表示
- 防災科研 強震モニタ画像の表示
- 地震・EEW・津波・強震モニタ検知のブラウザ通知
- Discord Webhook通知
- Discord通知への地図画像添付
- YouTube Live Chat中継URLへのEEW自動コメント送信
- 最新地震情報への震度地図表示
- OBSなどの配信用にURLやWebhook設定を隠す配信モード
- PWA対応

## 使い方

ローカルサーバーで配信して開いてください。PWAとService Workerは `file://` では動作しません。

```powershell
cd path\to\earthquake_monitor
python -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000/
```

画面左の `通知を許可` を押してから、`接続` を押してください。

## Discord Webhook

右側のDiscord Webhook欄にWebhook URLを入力し、`Discordにも送信する` を有効にすると通知が送信されます。

Webhook URLはパスワードに近い扱いです。公開リポジトリへ実際のWebhook URLを入れたまま保存しないでください。

## YouTube Live Chat

YouTubeへのコメント投稿はOAuth認証が必要です。ブラウザに認証情報を保存せず、Cloudflare Workersなどの中継URLを使ってください。

画面右側の `コメント中継URL` に中継先を入力し、`EEWをYouTubeにも自動コメントする` を有効にすると、EEW受信時に震源・最大予想震度・マグニチュードを含むJSONをPOSTします。サンプル実装は `youtube-live-chat-worker.js` です。

サンプルWorkerには、YouTubeチャンネルへ投稿できるGoogle OAuthクライアントの `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN` を環境変数として設定してください。必要なOAuthスコープは `https://www.googleapis.com/auth/youtube.force-ssl` です。

### Workerの使い方

1. Google CloudでYouTube Data API v3を有効にします。
2. OAuthクライアントを作成し、投稿に使うYouTubeアカウントで認可してRefresh Tokenを取得します。
   - スコープは `https://www.googleapis.com/auth/youtube.force-ssl` を使います。
   - Refresh Tokenはパスワード相当なので、GitHubやHTMLへ書かないでください。
3. Cloudflare Workersで新しいWorkerを作成し、`youtube-live-chat-worker.js` の内容を貼り付けます。
4. Workerの環境変数またはSecretに次の3つを設定します。

```text
GOOGLE_CLIENT_ID=Google OAuthクライアントID
GOOGLE_CLIENT_SECRET=Google OAuthクライアントシークレット
GOOGLE_REFRESH_TOKEN=投稿用アカウントのRefresh Token
```

5. Workerをデプロイし、発行されたURLをアプリの `コメント中継URL` に入力します。
   - 例: `https://example.workers.dev/youtube-live-chat`
   - GitHubへ共有する時は実URLではなく、このようなダミーURLにしてください。
6. アプリの `YouTube Live URL` に配信URLを入力します。
   - 既定値は `https://youtube.com/live/hjZbm3gphYA` です。
7. `EEWをYouTubeにも自動コメントする` を有効にして、`接続` を押します。

Wranglerを使う場合の例です。

```powershell
npx wrangler deploy youtube-live-chat-worker.js --name eew-youtube-relay
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

デプロイ後、Workerへ直接POSTして動作確認できます。

```powershell
$body = @{
  videoUrl = "https://youtube.com/live/hjZbm3gphYA"
  videoId = "hjZbm3gphYA"
  message = "テスト: EEW通知のYouTubeコメント中継"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://example.workers.dev/youtube-live-chat" `
  -ContentType "application/json" `
  -Body $body
```

配信が開始されていない、ライブチャットが無効、認可したアカウントに投稿権限がない、YouTube Data APIのクォータが不足している場合は投稿に失敗します。

中継先には次のJSONを送ります。

```json
{
  "videoUrl": "https://youtube.com/live/hjZbm3gphYA",
  "videoId": "hjZbm3gphYA",
  "message": "緊急地震速報（予報） / 震源: ... / 最大予想震度: ... / M: ...",
  "event": {}
}
```

## 配信モード

`配信モード（URL等を隠す）` を有効にすると、OBSなどで画面を配信する時にデータソース設定やDiscord Webhook設定を隠します。

## データソース

- P2P地震情報: `wss://api.p2pquake.net/v2/ws`
- Wolfx JMA EEW: `wss://ws-api.wolfx.jp/jma_eew`
- 強震モニタ: `http://www.kmoni.bosai.go.jp/`
- 気象庁震度観測点一覧表: `station-locations.json` の生成元

## 震度観測点マスタの更新

地震情報の地図は、P2P地震情報の観測点に緯度経度が無い場合、同梱の `station-locations.json` で震度観測点の座標を補完します。気象庁、地方公共団体、防災科学技術研究所の観測点を含む座標データを優先し、取得できない場合は気象庁震度観測点一覧表だけで生成します。

観測点マスタを更新する場合は、ネットワーク接続がある環境で次を実行してください。

```powershell
node build-station-locations.js
```

このスクリプトは震度観測点座標データを取得して `station-locations.json` を作成します。

## 注意

このアプリは個人利用向けの補助ツールです。防災上の判断は、気象庁や自治体など公式情報を確認してください。

強震モニタ画像の転載・再配布には、提供元の利用条件を確認してください。
