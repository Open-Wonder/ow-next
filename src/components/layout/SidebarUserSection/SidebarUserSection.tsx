'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  GearSix,
  Palette,
  Package,
  UserCircle,
  SignOut,
  Swatches,
} from '@phosphor-icons/react';
import Avatar from '@/components/common/Avatar';
import { MOCK_USER } from '@/lib/mock-data';
import { useIsAdmin } from '@/lib/permissions';
import { useChat, ManagePanelType } from '@/lib/chat-context';
import styles from './SidebarUserSection.module.css';

interface MenuItemDef {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  divider?: boolean;
  danger?: boolean;
  adminOnly?: boolean;
  managePanel?: ManagePanelType;
}

export default function SidebarUserSection() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const { dispatch } = useChat();

  const USER_MENU_ITEMS: MenuItemDef[] = useMemo(
    () => [
      { id: 'account', label: 'Account Settings', icon: <GearSix size={16} /> },
      { id: 'brand', label: 'Brand Settings', icon: <Palette size={16} /> },
      { id: 'divider-1', divider: true, adminOnly: true },
      {
        id: 'styles',
        label: 'Image Styles',
        icon: <Swatches size={16} />,
        adminOnly: true,
        managePanel: 'styles',
      },
      {
        id: 'products',
        label: 'Manage Products',
        icon: <Package size={16} />,
        adminOnly: true,
        managePanel: 'products',
      },
      {
        id: 'characters',
        label: 'Manage Characters',
        icon: <UserCircle size={16} />,
        adminOnly: true,
        managePanel: 'characters',
      },
      { id: 'divider-2', divider: true },
      { id: 'logout', label: 'Sign Out', icon: <SignOut size={16} />, danger: true },
    ],
    []
  );

  const visibleItems = useMemo(() => {
    return USER_MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  }, [USER_MENU_ITEMS, isAdmin]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const handleItemClick = (item: MenuItemDef) => {
    setUserMenuOpen(false);
    if (item.managePanel) {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'manage' });
      dispatch({ type: 'SET_MANAGE_PANEL', payload: item.managePanel });
      router.push('/manage');
    }
  };

  return (
    <div className={styles.userSection} ref={menuRef}>
      <button
        type="button"
        className={styles.userTrigger}
        onClick={() => setUserMenuOpen((o) => !o)}
      >
        <Avatar name={MOCK_USER.name} size="xl" />
        <div className={styles.userInfo}>
          <span className={styles.userName}>{MOCK_USER.name}</span>
          <span className={styles.planTag}>{MOCK_USER.email}</span>
        </div>
      </button>

      {userMenuOpen && (
        <div className={styles.userMenu}>
          <div className={styles.menuHeader}>
            <Avatar name={MOCK_USER.name} size="xl" />
            <div className={styles.menuHeaderInfo}>
              <span className={styles.menuHeaderName}>{MOCK_USER.name}</span>
              <span className={styles.planTag}>{MOCK_USER.email}</span>
            </div>
          </div>
          {visibleItems.map((item) =>
            item.divider ? (
              <div key={item.id} className={styles.menuDivider} />
            ) : (
              <button
                key={item.id}
                type="button"
                className={
                  item.danger ? styles.menuItemDanger : styles.menuItem
                }
                onClick={() => handleItemClick(item)}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
