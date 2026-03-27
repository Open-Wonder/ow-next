'use client';

import { ClockCounterClockwise } from '@phosphor-icons/react';
import cn from 'classnames';
import { useChat, CreativeMode } from '@/lib/chat-context';
import { formatRelativeDate } from '@/lib/format-date';
import styles from './ChatSessionHistory.module.css';

const MODE_LABELS: Record<CreativeMode, string> = {
  idle: 'General',
  imagine: 'Imagine',
  product: 'Product',
  character: 'Character',
  create: 'Create',
  assistant: 'Chat',
};

/**
 * Compact inline history shown at the top of the chat panel
 * when canvas is open (active creative mode).
 */
export default function ChatSessionHistory() {
  const { state, dispatch } = useChat();

  // Only show when canvas is open (active creative session)
  if (!state.canvasOpen) return null;

  // Filter sessions to current mode, exclude current session
  const relevantSessions = state.sessions.filter(
    (s) =>
      s.mode === state.mode &&
      s.id !== state.currentSession?.id &&
      s.generatedAssets.length > 0
  );

  if (relevantSessions.length === 0) return null;

  const handleLoadSession = (id: string) => {
    dispatch({ type: 'LOAD_SESSION', payload: id });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClockCounterClockwise size={12} className={styles.headerIcon} />
        <span className={styles.headerTitle}>
          {MODE_LABELS[state.mode]} History
        </span>
      </div>

      <div className={styles.scrollRow}>
        {relevantSessions.map((session) => (
          <button
            key={session.id}
            className={cn(
              styles.sessionCard,
              state.currentSession?.id === session.id && styles.sessionCardActive
            )}
            onClick={() => handleLoadSession(session.id)}
          >
            {/* Thumbnail cluster: show up to 3 asset thumbnails */}
            {session.generatedAssets.length > 0 && (
              <div className={styles.thumbCluster}>
                {session.generatedAssets.slice(0, 3).map((asset) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={asset.id}
                    src={asset.url}
                    alt=""
                    className={styles.thumbImg}
                  />
                ))}
              </div>
            )}
            <div className={styles.sessionInfo}>
              <span className={styles.sessionTitle}>{session.title}</span>
              <span className={styles.sessionMeta}>
                {session.generatedAssets.length} assets &middot;{' '}
                {formatRelativeDate(session.createdAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
