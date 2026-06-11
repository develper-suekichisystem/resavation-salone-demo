# LINE予約デモ (reservation-salone-demo)

LINE予約アプリのデモ。`reservation-yuka-rinpa`（本番版）を元にした、**LIFFアプリとして設置するプレゼン用デモ**です。

- **LIFFログイン**: デモを見る相手のLINEプロフィール（名前・アイコン）を実際に取得して表示
- **予約控え送信**: Messaging API で予約確認メッセージをLINEに送信（デモである旨を明記）
- **DB保存なし**: 予約データはサーバーに保存せず、閲覧者の端末の localStorage にのみ保存

> **localStorage について**: LIFFブラウザでは cookie / localStorage / sessionStorage の利用が
> 公式にサポートされています（[LIFFアプリ開発ガイドライン](https://developers.line.biz/ja/docs/liff/development-guidelines/)）。

## ローカルでの起動（LINE設定なし）

```bash
npm install
npm run dev
```

`VITE_LIFF_ID` 未設定の場合は、LIFFを使わずダミーユーザー（山田 花子）で自動ログインします。
LINE通知もスキップされるので、環境変数なしでフル動作確認できます。

| 画面 | URL |
|------|-----|
| 予約画面（お客様用） | http://localhost:5173/ |
| 管理画面 | http://localhost:5173/admin （パスワード: `demo`） |

## LIFFアプリとして設置する手順

1. [LINE Developers](https://developers.line.biz/) でプロバイダー＋Messaging APIチャネルを作成
2. LIFFアプリを追加（エンドポイントURL = VercelのデプロイURL、スコープ: `profile`）
3. Vercel にデプロイし、環境変数を設定:
   - `VITE_LIFF_ID` — LIFFアプリのID
   - `LINE_CHANNEL_ACCESS_TOKEN` — Messaging API のチャネルアクセストークン
   - `ADMIN_LINE_USER_ID` — （任意）デモ予約の通知を受け取る自分のLINEユーザーID
4. LIFF URL（`https://liff.line.me/xxxx-xxxx`）を相手にLINEで送れば、LINE内でデモが開きます

※ Messaging API でプッシュ送信するには、相手がそのチャネルのLINE公式アカウントを
友だち追加している必要があります。デモ前に友だち追加の案内をしてください。

## デモの仕組み

- **データ層**: Supabase の代わりに `src/lib/mockDb.ts` が localStorage にデータを保存。
  予約・メニュー編集・受付枠の変更は**閲覧者の端末内にのみ**永続化されます。
  端末をまたいだ共有はされない（= 管理画面で見えるのは同じ端末で入れた予約のみ）点に注意。
- **予約控え**: `api/notify.ts`（Vercel Function）が Messaging API で送信。
  メッセージには「デモであり実際の予約は登録されない」旨を明記しています。
- **初期データ**: 初回アクセス時に自動生成されます。
  - メニュー5件（カット、カット＋カラー など）
  - 受付枠：今日から28日分（水曜定休、平日10〜16時、土日10〜13時）
  - 既存予約2件（時間枠の「×」表示のデモ用）
- **リセット**: 管理画面下部の「デモデータをリセット」ボタンで初期状態に戻せます。

## 予約フロー

メニュー選択 → 日付選択 → 時間選択 → 予約者情報（初回のみ） → 確認 → 完了

- メニューごとに「お客様向け所要時間」と「実所要時間（準備・片付け込み）」を別管理
- 実所要時間ベースで予約枠の重複チェック（120分メニューは連続2枠が必要）
- 2回目以降のユーザーは入力フォームをスキップ

## 管理画面の機能

- **予約一覧**: 日付別の予約確認・キャンセル
- **メニュー管理**: 追加・編集・削除・公開切替・並び替え
- **受付設定**: カレンダーで日付を選び、受付時間帯をトグルで設定

## 本番版との違い

| 項目 | 本番版 (reservation-yuka-rinpa) | デモ版 |
|------|------|------|
| データベース | Supabase (PostgreSQL) | localStorage（端末内のみ） |
| ログイン | LINE LIFF | LINE LIFF（未設定時はダミーユーザー） |
| 予約通知 | LINE Messaging API | 同じ（デモ文言入り） |
| 管理画面パスワード | 環境変数 | `demo` 固定 |

## 技術スタック

- React 19 + Vite + TypeScript
- @line/liff + Messaging API（Vercel Function 経由）
