'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/lib/chat-context';
import styles from './ViewTransition.module.css';

interface ViewTransitionProps {
  createView: React.ReactNode;
  libraryView: React.ReactNode;
  settingsView?: React.ReactNode;
}

const fadeTransition = { duration: 0.12, ease: [0, 0, 0.2, 1] as const };

export default function ViewTransition({ createView, libraryView, settingsView }: ViewTransitionProps) {
  const { state } = useChat();
  const isCreate = state.activeView === 'create';
  const isLibrary = state.activeView === 'library';
  const isSettings = state.activeView === 'settings';

  return (
    <div className={styles.container}>
      {/* Create View – always mounted */}
      <motion.div
        className={styles.view}
        initial={{ opacity: 1 }}
        animate={{ opacity: isCreate ? 1 : 0 }}
        transition={fadeTransition}
        style={{
          pointerEvents: isCreate ? 'auto' : 'none',
          position: isCreate ? 'relative' : 'absolute',
          zIndex: isCreate ? 1 : 0,
        }}
      >
        {createView}
      </motion.div>

      {/* Library View – always mounted */}
      <motion.div
        className={styles.view}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLibrary ? 1 : 0 }}
        transition={fadeTransition}
        style={{
          pointerEvents: isLibrary ? 'auto' : 'none',
          position: isLibrary ? 'relative' : 'absolute',
          zIndex: isLibrary ? 1 : 0,
        }}
      >
        {libraryView}
      </motion.div>

      {/* Settings View – always mounted */}
      {settingsView && (
        <motion.div
          className={styles.view}
          initial={{ opacity: 0 }}
          animate={{ opacity: isSettings ? 1 : 0 }}
          transition={fadeTransition}
          style={{
            pointerEvents: isSettings ? 'auto' : 'none',
            position: isSettings ? 'relative' : 'absolute',
            zIndex: isSettings ? 1 : 0,
          }}
        >
          {settingsView}
        </motion.div>
      )}
    </div>
  );
}
