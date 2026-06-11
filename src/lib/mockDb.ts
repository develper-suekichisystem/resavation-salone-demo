// ============================================================
// モックデータベース
// localStorage に永続化し、Supabase の代わりに動作するデモ用データ層。
// 各関数は実際のAPI通信を模して少し待ってから結果を返す。
// ============================================================
import type { Menu, User, Reservation, AvailableSlot } from '../types';

const STORAGE_KEY = 'reservation_demo_db_v1';
const LATENCY_MS = 400;

interface DbData {
  menus: Menu[];
  users: User[];
  reservations: Reservation[];
  slots: AvailableSlot[];
}

const delay = () => new Promise(resolve => setTimeout(resolve, LATENCY_MS));
const uuid = () => crypto.randomUUID();

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ── 初期データ生成 ──────────────────────────────────────────
function seed(): DbData {
  const now = new Date().toISOString();

  const menus: Menu[] = [
    {
      id: uuid(), name: 'カット', price: 4500,
      customer_duration_minutes: 60, provider_duration_minutes: 60,
      description: 'シャンプー・ブロー込みのベーシックカット', is_active: true, sort_order: 1,
    },
    {
      id: uuid(), name: 'カット＋カラー', price: 9800,
      customer_duration_minutes: 120, provider_duration_minutes: 120,
      description: 'カットと全体カラーのセットメニュー', is_active: true, sort_order: 2,
    },
    {
      id: uuid(), name: 'ヘッドスパ', price: 6000,
      customer_duration_minutes: 60, provider_duration_minutes: 90,
      description: '頭皮ケアとリラクゼーションを兼ねた人気メニュー', is_active: true, sort_order: 3,
    },
    {
      id: uuid(), name: 'トリートメント', price: 5500,
      customer_duration_minutes: 60, provider_duration_minutes: 60,
      description: '髪質改善トリートメントでうるおいツヤ髪に', is_active: true, sort_order: 4,
    },
    {
      id: uuid(), name: '初回体験コース', price: 3800,
      customer_duration_minutes: 60, provider_duration_minutes: 60,
      description: '初めての方限定のお試しコース', is_active: true, sort_order: 5,
    },
  ];

  // 受付枠：今日から28日分（水曜定休）。平日 10〜16時、土日 10〜13時。
  const slots: AvailableSlot[] = [];
  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const d = addDays(today, i);
    const dow = d.getDay();
    if (dow === 3) continue; // 水曜定休
    const hours = dow === 0 || dow === 6 ? [10, 11, 12, 13] : [10, 11, 12, 13, 14, 15, 16];
    for (const h of hours) {
      slots.push({ id: uuid(), date: formatDate(d), time: `${String(h).padStart(2, '0')}:00` });
    }
  }

  // 既存予約（デモ用に2件入れて「×」表示を見せる）
  const sampleUser: User = {
    id: uuid(), line_user_id: 'demo-sample-user', name: '佐藤 美咲',
    is_first_visit: false, created_at: now,
  };

  const findFutureDate = (offset: number): string => {
    let d = addDays(today, offset);
    if (d.getDay() === 3) d = addDays(d, 1); // 定休日を避ける
    return formatDate(d);
  };

  const reservations: Reservation[] = [
    {
      id: uuid(), user_id: sampleUser.id, menu_id: menus[1].id,
      date: findFutureDate(2), time: '11:00', status: 'confirmed', created_at: now,
    },
    {
      id: uuid(), user_id: sampleUser.id, menu_id: menus[0].id,
      date: findFutureDate(5), time: '14:00', status: 'confirmed', created_at: now,
    },
  ];

  return { menus, users: [sampleUser], reservations, slots };
}

// ── 永続化 ──────────────────────────────────────────────────
function load(): DbData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DbData;
    } catch {
      // 壊れていたら作り直す
    }
  }
  const data = seed();
  save(data);
  return data;
}

function save(db: DbData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export async function resetDemoData(): Promise<void> {
  await delay();
  save(seed());
}

// ── メニュー ────────────────────────────────────────────────
export async function fetchActiveMenus(): Promise<Menu[]> {
  await delay();
  return load().menus
    .filter(m => m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchAllMenus(): Promise<Menu[]> {
  await delay();
  return load().menus.sort((a, b) => a.sort_order - b.sort_order);
}

export interface MenuPayload {
  name: string;
  price: number;
  description: string | null;
  customer_duration_minutes: number;
  provider_duration_minutes: number;
  is_active: boolean;
}

export async function createMenu(payload: MenuPayload): Promise<void> {
  await delay();
  const db = load();
  const maxOrder = db.menus.length > 0 ? Math.max(...db.menus.map(m => m.sort_order)) + 1 : 1;
  db.menus.push({
    id: uuid(),
    ...payload,
    description: payload.description ?? undefined,
    sort_order: maxOrder,
  });
  save(db);
}

export async function updateMenu(id: string, payload: MenuPayload): Promise<void> {
  await delay();
  const db = load();
  const menu = db.menus.find(m => m.id === id);
  if (menu) {
    Object.assign(menu, payload, { description: payload.description ?? undefined });
    save(db);
  }
}

export async function setMenuActive(id: string, isActive: boolean): Promise<void> {
  await delay();
  const db = load();
  const menu = db.menus.find(m => m.id === id);
  if (menu) {
    menu.is_active = isActive;
    save(db);
  }
}

export async function deleteMenu(id: string): Promise<void> {
  await delay();
  const db = load();
  db.menus = db.menus.filter(m => m.id !== id);
  save(db);
}

export async function updateMenuOrders(orderedIds: string[]): Promise<void> {
  await delay();
  const db = load();
  orderedIds.forEach((id, i) => {
    const menu = db.menus.find(m => m.id === id);
    if (menu) menu.sort_order = i + 1;
  });
  save(db);
}

// ── 受付枠 ──────────────────────────────────────────────────
export async function fetchAvailableDates(fromDate: string): Promise<string[]> {
  await delay();
  const dates = load().slots.filter(s => s.date >= fromDate).map(s => s.date);
  return [...new Set(dates)];
}

export async function fetchSlotTimes(date: string): Promise<string[]> {
  await delay();
  return load().slots
    .filter(s => s.date === date)
    .map(s => s.time)
    .sort();
}

export async function fetchAllSlots(fromDate: string): Promise<AvailableSlot[]> {
  await delay();
  return load().slots
    .filter(s => s.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export async function saveSlotsForDate(date: string, times: string[]): Promise<void> {
  await delay();
  const db = load();
  db.slots = db.slots.filter(s => s.date !== date);
  for (const time of times) {
    db.slots.push({ id: uuid(), date, time });
  }
  save(db);
}

export async function deleteSlot(id: string): Promise<void> {
  await delay();
  const db = load();
  db.slots = db.slots.filter(s => s.id !== id);
  save(db);
}

// ── ユーザー ────────────────────────────────────────────────
export async function getIsFirstVisit(lineUserId: string): Promise<boolean> {
  await delay();
  const user = load().users.find(u => u.line_user_id === lineUserId);
  return user ? user.is_first_visit : true;
}

// ── 予約 ────────────────────────────────────────────────────
export interface BookedSlot {
  time: string;
  provider_duration_minutes: number;
}

export async function fetchBookedSlots(date: string): Promise<BookedSlot[]> {
  await delay();
  const db = load();
  return db.reservations
    .filter(r => r.date === date && r.status === 'confirmed')
    .map(r => ({
      time: r.time,
      provider_duration_minutes:
        db.menus.find(m => m.id === r.menu_id)?.provider_duration_minutes ?? 60,
    }));
}

export interface CreateReservationParams {
  lineUserId: string;
  userName: string;
  menuId: string;
  date: string;
  time: string;
  referrerName: string | null;
}

export async function createReservation(params: CreateReservationParams): Promise<Reservation> {
  await delay();
  const db = load();

  // ユーザーをupsert
  let user = db.users.find(u => u.line_user_id === params.lineUserId);
  if (!user) {
    user = {
      id: uuid(), line_user_id: params.lineUserId, name: params.userName,
      is_first_visit: true, created_at: new Date().toISOString(),
    };
    db.users.push(user);
  } else {
    user.name = params.userName;
  }

  // 二重予約チェック（provider_duration_minutes で重複判定）
  const menu = db.menus.find(m => m.id === params.menuId);
  if (!menu) throw new Error('メニューが見つかりません');
  const newStart = timeToMinutes(params.time);
  const newDuration = menu.provider_duration_minutes;
  const hasConflict = db.reservations
    .filter(r => r.date === params.date && r.status === 'confirmed')
    .some(r => {
      const rStart = timeToMinutes(r.time);
      const rDuration = db.menus.find(m => m.id === r.menu_id)?.provider_duration_minutes ?? 60;
      return newStart < rStart + rDuration && rStart < newStart + newDuration;
    });
  if (hasConflict) throw new Error('この時間はすでに予約されています。別の時間をお選びください。');

  const reservation: Reservation = {
    id: uuid(), user_id: user.id, menu_id: params.menuId,
    date: params.date, time: params.time, status: 'confirmed',
    referrer_name: params.referrerName ?? undefined,
    created_at: new Date().toISOString(),
  };
  db.reservations.push(reservation);

  // 初回フラグ更新
  user.is_first_visit = false;

  save(db);
  return reservation;
}

export async function fetchReservationsWithDetails(date: string): Promise<Reservation[]> {
  await delay();
  const db = load();
  return db.reservations
    .filter(r => r.date === date && r.status === 'confirmed')
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(r => ({
      ...r,
      user: db.users.find(u => u.id === r.user_id),
      menu: db.menus.find(m => m.id === r.menu_id),
    }));
}

export async function cancelReservation(id: string): Promise<void> {
  await delay();
  const db = load();
  const reservation = db.reservations.find(r => r.id === id);
  if (reservation) {
    reservation.status = 'cancelled';
    save(db);
  }
}
