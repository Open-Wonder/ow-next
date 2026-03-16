'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useChat, ActiveView } from '@/lib/chat-context';
import styles from './FlipToggle.module.css';

const VIEWS: { id: ActiveView; label: string; href: string }[] = [
  { id: 'create', label: 'Create', href: '/' },
  { id: 'library', label: 'Explore', href: '/library' },
];

export default function FlipToggle() {
  const { state } = useChat();
  const pathname = usePathname();

  return (
    <div className={styles.toggle}>
      {VIEWS.map((view) => {
        const isActive = pathname === view.href || state.activeView === view.id;
        return (
          <Link
            key={view.id}
            href={view.href}
            className={styles.option}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.span
                className={styles.indicator}
                layoutId="flipIndicator"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className={isActive ? styles.labelActive : styles.label}>
              {view.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
