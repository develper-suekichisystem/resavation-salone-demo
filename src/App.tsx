import { useState } from 'react';
import { useLoading } from './contexts/LoadingContext';
import { useLiff } from './hooks/useLiff';
import { StepIndicator } from './components/StepIndicator';
import { MenuSelect } from './components/MenuSelect';
import { CalendarPicker } from './components/CalendarPicker';
import { TimePicker } from './components/TimePicker';
import { ReservationForm } from './components/ReservationForm';
import { Confirmation } from './components/Confirmation';
import { Complete } from './components/Complete';
import { AdminPage } from './components/admin/AdminPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { getIsFirstVisit, createReservation } from './lib/mockDb';
import { IS_MOCK_LIFF } from './lib/liff';
import type { Step, ReservationState, Menu } from './types';

const INITIAL_STATE: ReservationState = {
  selectedMenu: null,
  selectedDate: null,
  selectedTime: null,
  referrerName: '',
};

function ReservationApp() {
  const { isReady, isLoggedIn, userId, displayName, pictureUrl, error } = useLiff();
  const { withLoading } = useLoading();
  const [step, setStep] = useState<Step>('menu');
  const [state, setState] = useState<ReservationState>(INITIAL_STATE);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedId, setCompletedId] = useState('');

  if (!isReady || (!isLoggedIn && !error)) return <LoadingSpinner />;
  if (error)    return <div className="error-screen">エラー: {error}</div>;
  if (!userId)  return <LoadingSpinner />;

  const name = displayName ?? 'ゲスト';

  function update(updates: Partial<ReservationState>) {
    setState(prev => ({ ...prev, ...updates }));
  }

  async function handleMenuSelect(menu: Menu) {
    update({ selectedMenu: menu });
    await withLoading(async () => {
      setIsFirstVisit(await getIsFirstVisit(userId!));
    });
    setStep('calendar');
  }

  function handleTimeSelect(time: string) {
    update({ selectedTime: time });
    // 初回以外は入力フォームをスキップして確認へ
    setStep(isFirstVisit ? 'form' : 'confirm');
  }

  async function handleConfirm() {
    if (!state.selectedMenu || !state.selectedDate || !state.selectedTime) return;
    const menu = state.selectedMenu;
    const date = state.selectedDate;
    const time = state.selectedTime;
    setSubmitting(true);

    await withLoading(async () => { try {
      const reservation = await createReservation({
        lineUserId: userId!,
        userName: name,
        menuId: menu.id,
        date,
        time,
        referrerName: state.referrerName || null,
      });

      // Messaging API で予約控えを送信（失敗しても予約は成功扱い）。
      // モックLIFF時はLINEユーザーIDが実在しないためスキップ。
      if (!IS_MOCK_LIFF) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userName: name,
            menuName: menu.name,
            date,
            time,
            reservationId: reservation.id,
            customerDurationMinutes: menu.customer_duration_minutes,
          }),
        }).catch(console.error);
      }

      setCompletedId(reservation.id);
      setStep('complete');
    } catch (err) {
      alert(err instanceof Error ? err.message : '予約に失敗しました');
    } finally {
      setSubmitting(false);
    } });
  }

  function restart() {
    setState(INITIAL_STATE);
    setCompletedId('');
    setStep('menu');
  }

  // 確認画面から戻る先（初回 → form、それ以外 → time）
  const backFromConfirm = () => setStep(isFirstVisit ? 'form' : 'time');

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">LINE予約デモ</h1>
        <p className="app-subtitle">サンプルサロン</p>
      </header>

      {step !== 'complete' && <StepIndicator currentStep={step} />}

      <main className="app-main">
        {step === 'menu' && (
          <MenuSelect onSelect={handleMenuSelect} />
        )}
        {step === 'calendar' && (
          <CalendarPicker
            onSelect={date => { update({ selectedDate: date }); setStep('time'); }}
            onBack={() => setStep('menu')}
          />
        )}
        {step === 'time' && state.selectedDate && state.selectedMenu && (
          <TimePicker
            date={state.selectedDate}
            menu={state.selectedMenu}
            onSelect={handleTimeSelect}
            onBack={() => setStep('calendar')}
          />
        )}
        {step === 'form' && (
          <ReservationForm
            state={state}
            isFirstVisit={isFirstVisit}
            displayName={name}
            pictureUrl={pictureUrl}
            onChange={update}
            onNext={() => setStep('confirm')}
            onBack={() => setStep('time')}
          />
        )}
        {step === 'confirm' && (
          <Confirmation
            state={state}
            displayName={name}
            pictureUrl={pictureUrl}
            isFirstVisit={isFirstVisit}
            onConfirm={handleConfirm}
            onBack={backFromConfirm}
            submitting={submitting}
          />
        )}
        {step === 'complete' && (
          <Complete reservationId={completedId} onRestart={restart} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;
  return <ReservationApp />;
}
