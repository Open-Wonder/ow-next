'use client';

import FlipToggle from '@/components/layout/FlipToggle/FlipToggle';
import styles from './TopBar.module.css';

export default function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.left} />

      <div className={styles.center}>
        <FlipToggle />
      </div>

      <div className={styles.right} />
    </header>
  );
}
