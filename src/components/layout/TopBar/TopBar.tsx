'use client';

import FlipToggle from '@/components/layout/FlipToggle/FlipToggle';
import { useChat } from '@/lib/chat-context';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { state } = useChat();
  const showCenter = state.activeView !== 'settings';

  return (
    <header className={styles.bar}>
      <div className={styles.left} />

      {showCenter && (
        <div className={styles.center}>
          <FlipToggle />
        </div>
      )}

      <div className={styles.right} />
    </header>
  );
}
