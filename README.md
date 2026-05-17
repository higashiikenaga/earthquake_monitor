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

## 注意

このアプリは個人利用向けの補助ツールです。防災上の判断は、気象庁や自治体など公式情報を確認してください。

強震モニタ画像の転載・再配布には、提供元の利用条件を確認してください。
