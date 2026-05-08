'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkle, Package, UserCircle, ChatCircle, Lock } from '@phosphor-icons/react';
import cn from 'classnames';
import Box from '@/components/common/Box';
import { useChat, CreativeMode } from '@/lib/chat-context';
import { useBrand } from '@/lib/brand-context';
import { isModeVisible } from '@/lib/mode-visibility';
import { isModeUnlocked } from '@/lib/mode-unlock';
import styles from './ModeBoxes.module.css';

const MODE_HEADLINES: Record<CreativeMode, { greeting: string; sub: string }> = {
  idle: {
    greeting: 'Hey, I\u2019m your brand AI.',
    sub: 'Ask me anything about your brand, create on-brand content, or just start a conversation.',
  },
  imagine: {
    greeting: "Let's bring your vision to life.",
    sub: "Describe what you see — I'll generate on-brand images and videos for you.",
  },
  product: {
    greeting: 'Showcase your products beautifully.',
    sub: 'Pick a product, choose a style, and tell me the scene you have in mind.',
  },
  character: {
    greeting: 'Create scenes with your characters.',
    sub: "Select your brand characters and describe the moment — I'll make it real.",
  },
  create: {
    greeting: 'Adapt your visuals for multiple markets',
    sub: 'Choose a format, set the style, and describe the ad you need.',
  },
  assistant: {
    greeting: 'Ask your brand anything',
    sub: 'Ask anything about your brand guidelines, assets, or content strategy.',
  },
};

const BOX_MODES: { id: CreativeMode; icon: React.ReactNode }[] = [
  { id: 'imagine', icon: <Sparkle size={20} /> },
  { id: 'product', icon: <Package size={20} /> },
  { id: 'character', icon: <UserCircle size={20} /> },
  { id: 'assistant', icon: <ChatCircle size={20} /> },
];

const MODE_LABELS: Record<CreativeMode, string> = {
  idle: 'General',
  imagine: 'On Brand Images',
  product: 'Product to Image',
  character: 'Character',
  create: 'Create',
  assistant: 'Brand Chat',
};

export default function ModeBoxes() {
  const { state, dispatch } = useChat();
  const { hasAssistant } = useBrand();
  const [hoveredLocked, setHoveredLocked] = useState<CreativeMode | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const effectiveMode = state.mode === 'idle' ? 'imagine' : state.mode;

  const visibleModes = BOX_MODES.filter(
    (m) =>
      m.id !== 'character' &&
      isModeVisible(m.id) &&
      (m.id !== 'assistant' || hasAssistant)
  );

  const handleLockedHover = (mode: CreativeMode, entering: boolean) => {
    if (!entering) {
      setHoveredLocked(null);
      setPopoverAnchor(null);
      return;
    }
    const el = boxRefs.current[mode];
    if (el) {
      const rect = el.getBoundingClientRect();
      setHoveredLocked(mode);
      setPopoverAnchor({ x: rect.left, y: rect.bottom + 8 });
    }
  };

  const handleUnlockClick = () => {
    // Placeholder: could open upgrade URL or modal
    window.open('mailto:support@openwonder.io?subject=Unlock%20Character%20mode', '_blank');
  };

  return (
    <div className={styles.boxes}>
      {visibleModes.map((mode) => {
        const unlocked = isModeUnlocked(mode.id);
        const headline = MODE_HEADLINES[mode.id];
        const label = MODE_LABELS[mode.id];

        if (unlocked) {
          return (
            <button
              key={mode.id}
              type="button"
              className={styles.boxButton}
              onClick={() => dispatch({ type: 'SET_MODE', payload: mode.id })}
            >
              <Box
                variant="grey"
                noPadding
                className={cn(
                  styles.item,
                  styles.itemFill,
                  effectiveMode === mode.id && styles.boxActive
                )}
              >
                <div className={styles.content}>
                  <h4 className={styles.headline}>
                    <span className={styles.boxIcon}>{mode.icon}</span>
                    <span className={styles.boxLabel}>{label}</span>
                  </h4>
                  <p className={styles.boxDesc}>{headline.sub}</p>
                </div>
              </Box>
            </button>
          );
        }

        return (
          <div
            key={mode.id}
            ref={(el) => { boxRefs.current[mode.id] = el; }}
            className={styles.boxWrapper}
            onMouseEnter={() => handleLockedHover(mode.id, true)}
            onMouseLeave={() => handleLockedHover(mode.id, false)}
          >
            <Box variant="grey" noPadding className={cn(styles.item, styles.itemFill, styles.boxLocked)}>
              <div className={styles.content}>
                <h4 className={styles.headline}>
                  <span className={styles.boxIcon}>{mode.icon}</span>
                  <span className={styles.boxLabel}>{label}</span>
                </h4>
                <p className={styles.boxDesc}>{headline.sub}</p>
              </div>
              <span className={styles.lockBadge}>
                <Lock size={12} />
              </span>
            </Box>
          </div>
        );
      })}

      {typeof document !== 'undefined' &&
        hoveredLocked &&
        popoverAnchor &&
        createPortal(
          <div
            className={styles.lockedPopover}
            style={{ left: popoverAnchor.x, top: popoverAnchor.y }}
            onMouseEnter={() => {}}
            onMouseLeave={() => {
              setHoveredLocked(null);
              setPopoverAnchor(null);
            }}
          >
            <h4 className={styles.lockedPopoverTitle}>Not unlocked</h4>
            <p className={styles.lockedPopoverText}>
              This mode is not currently available. Unlock it to create content with your brand
              characters and products.
            </p>
            <div className={styles.lockedPopoverActions}>
              <button
                type="button"
                className={styles.lockedUnlockBtn}
                onClick={handleUnlockClick}
              >
                Unlock
              </button>
              <a
                href="mailto:support@openwonder.io?subject=Unlock%20request"
                className={styles.lockedContactLink}
              >
                Contact support
              </a>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
