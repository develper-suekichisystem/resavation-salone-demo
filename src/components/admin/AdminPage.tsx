import { useEffect, useState } from 'react';
import { fetchReservationsWithDetails, cancelReservation, resetDemoData } from '../../lib/mockDb';
import { MenuAdmin } from './MenuAdmin';
import { ScheduleAdmin } from './ScheduleAdmin';
import { AdminLogin, isAdminAuthenticated } from './AdminLogin';
import type { Reservation } from '../../types';

type AdminTab = 'reservations' | 'menus' | 'schedule';

function ReservationAdmin() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function fetchList() {
    setLoading(true);
    setReservations(await fetchReservationsWithDetails(selectedDate));
    setLoading(false);
  }

  async function handleCancel(id: string) {
    if (!confirm('この予約をキャンセルしますか？')) return;
    await cancelReservation(id);
    fetchList();
  }

  return (
    <>
      <div className="admin-date-picker">
        <label>日付：</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : reservations.length === 0 ? (
        <p className="no-data">この日の予約はありません</p>
      ) : (
        <div className="admin-list">
          {reservations.map(r => (
            <div key={r.id} className="admin-card">
              <div className="admin-time">{r.time}</div>
              <div className="admin-info">
                <div className="admin-name">{r.user?.name}</div>
                <div className="admin-menu">{r.menu?.name}</div>
                {r.referrer_name && (
                  <div className="admin-referrer">紹介者: {r.referrer_name}</div>
                )}
              </div>
              <button className="btn-cancel" onClick={() => handleCancel(r.id)}>
                キャンセル
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthenticated());
  const [tab, setTab] = useState<AdminTab>('reservations');
  const [resetting, setResetting] = useState(false);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  async function handleReset() {
    if (!confirm('デモデータを初期状態に戻しますか？\n（予約・メニュー・受付枠がすべてリセットされます）')) return;
    setResetting(true);
    await resetDemoData();
    location.reload();
  }

  return (
    <div className="admin-page">
      <header className="app-header">
        <h1 className="app-title">LINE予約デモ</h1>
        <p className="app-subtitle">管理画面</p>
      </header>

      <div className="admin-tabs">
        <button
          className={`admin-tab${tab === 'reservations' ? ' active' : ''}`}
          onClick={() => setTab('reservations')}
        >
          予約一覧
        </button>
        <button
          className={`admin-tab${tab === 'menus' ? ' active' : ''}`}
          onClick={() => setTab('menus')}
        >
          メニュー管理
        </button>
        <button
          className={`admin-tab${tab === 'schedule' ? ' active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          受付設定
        </button>
      </div>

      <div className="admin-content">
        {tab === 'reservations' && <ReservationAdmin />}
        {tab === 'menus' && <MenuAdmin />}
        {tab === 'schedule' && <ScheduleAdmin />}
      </div>

      <div className="admin-footer">
        <button className="btn-reset" onClick={handleReset} disabled={resetting}>
          {resetting ? 'リセット中...' : 'デモデータをリセット'}
        </button>
      </div>
    </div>
  );
}
