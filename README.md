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

## データソース

- P2P地震情報: `wss://api.p2pquake.net/v2/ws`
- Wolfx JMA EEW: `wss://ws-api.wolfx.jp/jma_eew`
- 強震モニタ: `http://www.kmoni.bosai.go.jp/`

## 注意

このアプリは個人利用向けの補助ツールです。防災上の判断は、気象庁や自治体など公式情報を確認してください。

強震モニタ画像の転載・再配布には、提供元の利用条件を確認してください。
