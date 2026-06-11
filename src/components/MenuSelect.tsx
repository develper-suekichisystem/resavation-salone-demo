import { useEffect, useState } from 'react';
import { fetchActiveMenus } from '../lib/mockDb';
import { useLoading } from '../contexts/LoadingContext';
import type { Menu } from '../types';

interface Props {
  onSelect: (menu: Menu) => void;
}

export function MenuSelect({ onSelect }: Props) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const { withLoading } = useLoading();

  useEffect(() => {
    withLoading(async () => {
      setMenus(await fetchActiveMenus());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="menu-select">
      <h2 className="section-title">メニューを選択</h2>
      <div className="menu-list">
        {menus.map(menu => (
          <button key={menu.id} className="menu-card" onClick={() => onSelect(menu)}>
            <div className="menu-name">{menu.name}</div>
            {menu.description && (
              <div className="menu-desc">{menu.description}</div>
            )}
            <div className="menu-footer">
              <span className="menu-price">¥{menu.price.toLocaleString()}</span>
              <span className="menu-duration">{menu.customer_duration_minutes}分</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
