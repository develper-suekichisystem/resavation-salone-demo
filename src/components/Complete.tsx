import { IS_MOCK_LIFF } from '../lib/liff';

interface Props {
  reservationId: string;
  onRestart: () => void;
}

export function Complete({ reservationId, onRestart }: Props) {
  return (
    <div className="complete">
      <div className="complete-icon">✓</div>
      <h2 className="complete-title">予約が完了しました</h2>
      <p className="complete-message">
        ご予約ありがとうございます。<br />
        {IS_MOCK_LIFF
          ? 'LINEにご予約の確認メッセージをお送りしました。'
          : 'LINEにご予約控えをお送りしましたのでご確認ください。'}
      </p>
      <p className="complete-id">予約番号: {reservationId.slice(0, 8).toUpperCase()}</p>
      <p className="complete-note">
        キャンセルの場合はLINEよりご連絡ください。
      </p>
      <p className="demo-note">
        ※ こちらはデモです。実際の予約は登録されません。
      </p>
      <button className="btn-back" onClick={onRestart}>最初の画面に戻る</button>
    </div>
  );
}
