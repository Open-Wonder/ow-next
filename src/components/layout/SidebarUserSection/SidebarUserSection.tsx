'use client';

import { useRouter } from 'next/navigation';
import { GearSix, CaretRight, SignOut } from '@phosphor-icons/react';
import Avatar from '@/components/common/Avatar';
import { MOCK_USER } from '@/lib/mock-data';
import { useChat } from '@/lib/chat-context';
import styles from './SidebarUserSection.module.css';

interface SidebarUserSectionProps {
  hideSettingsButton?: boolean;
}

export default function SidebarUserSection({ hideSettingsButton }: SidebarUserSectionProps) {
  const router = useRouter();
  const { state, dispatch } = useChat();

  const isSettingsActive = state.activeView === 'settings';

  const handleSettingsClick = () => {
    if (isSettingsActive) return;
    dispatch({ type: 'OPEN_SETTINGS' });
    router.push('/manage');
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Sign out handler
  };

  return (
    <div className={styles.userSection}>
      {!hideSettingsButton ? (
        <div className={styles.settingsBlock}>
          <div className={styles.settingsDivider} />
          <button
            type="button"
            className={`${styles.settingsButton} ${isSettingsActive ? styles.settingsButtonActive : ''}`}
            onClick={handleSettingsClick}
          >
            <GearSix size={20} weight="regular" />
            <span className={styles.settingsLabel}>Settings</span>
            <CaretRight size={14} weight="bold" className={styles.settingsArrow} />
          </button>
          <div className={styles.settingsDivider} />
        </div>
      ) : (
        <div className={styles.settingsDivider} />
      )}

      <div className={styles.userRow}>
        <Avatar name={MOCK_USER.name} size="xs" />
        <span className={styles.userName}>{MOCK_USER.name}</span>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <SignOut size={20} />
        </button>
      </div>
    </div>
  );
}
