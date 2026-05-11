'use client';

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  Sparkle,
  Package,
  UserCircle,
  ChatCircle,
  Globe,
} from '@phosphor-icons/react';
import cn from 'classnames';
import { useChat, type CreativeMode } from '@/lib/chat-context';
import { useBrand } from '@/lib/brand-context';
import styles from './ChatInput.module.css';

const TAB_ICON_SIZE = 16;

/** Active text/icon color per mode — darker shades for ≥4.5:1 on white (pill) */
const TAB_ACTIVE_CLASS: Partial<Record<CreativeMode, string>> = {
  imagine: styles.promptModeTabActiveImagine,
  create: styles.promptModeTabActiveCreate,
  product: styles.promptModeTabActiveProduct,
  character: styles.promptModeTabActiveCharacter,
  assistant: styles.promptModeTabActiveAssistant,
};

/** Order: Imagery, Product, Character, Assistant, Market Adaption */
const PROMPT_TABS: {
  id: CreativeMode;
  label: string;
  Icon: PhosphorIcon;
}[] = [
  { id: 'imagine', label: 'Imagery', Icon: Sparkle },
  { id: 'product', label: 'Product', Icon: Package },
  { id: 'character', label: 'Character', Icon: UserCircle },
  { id: 'assistant', label: 'Assistant', Icon: ChatCircle },
  { id: 'create', label: 'Market Adaption', Icon: Globe },
];

export default function PromptModeTabs() {
  const { state, dispatch } = useChat();
  const { hasAssistant } = useBrand();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const visibleTabs = PROMPT_TABS.filter(
    (t) => t.id !== 'assistant' || hasAssistant
  );

  const selectedId: CreativeMode =
    state.mode === 'idle' ? 'imagine' : state.mode;

  const effectiveSelected = visibleTabs.some((t) => t.id === selectedId)
    ? selectedId
    : visibleTabs[0]?.id ?? 'imagine';

  const setTabRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  }, []);

  const focusTabByOffset = useCallback(
    (fromId: CreativeMode, delta: number) => {
      const idx = visibleTabs.findIndex((t) => t.id === fromId);
      if (idx < 0) return;
      const next =
        visibleTabs[(idx + delta + visibleTabs.length) % visibleTabs.length];
      if (!next) return;
      dispatch({ type: 'SET_MODE', payload: next.id });
      queueMicrotask(() => tabRefs.current.get(next.id)?.focus());
    },
    [dispatch, visibleTabs]
  );

  const onTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: CreativeMode) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusTabByOffset(tabId, 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusTabByOffset(tabId, -1);
          break;
        case 'Home':
          e.preventDefault();
          if (visibleTabs[0]) {
            dispatch({ type: 'SET_MODE', payload: visibleTabs[0].id });
            queueMicrotask(() =>
              tabRefs.current.get(visibleTabs[0].id)?.focus()
            );
          }
          break;
        case 'End':
          e.preventDefault();
          {
            const last = visibleTabs[visibleTabs.length - 1];
            if (last) {
              dispatch({ type: 'SET_MODE', payload: last.id });
              queueMicrotask(() => tabRefs.current.get(last.id)?.focus());
            }
          }
          break;
        default:
          break;
      }
    },
    [dispatch, focusTabByOffset, visibleTabs]
  );

  return (
    <div
      className={styles.promptModeTabList}
      role="tablist"
      aria-label="Creation mode"
    >
      {visibleTabs.map((tab) => {
        const selected = tab.id === effectiveSelected;
        const Icon = tab.Icon;
        return (
          <button
            key={tab.id}
            ref={(el) => setTabRef(tab.id, el)}
            type="button"
            role="tab"
            id={`prompt-mode-tab-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={styles.promptModeTab}
            onClick={() => dispatch({ type: 'SET_MODE', payload: tab.id })}
            onKeyDown={(e) => onTabKeyDown(e, tab.id)}
          >
            {selected && (
              <motion.span
                className={styles.promptModeTabIndicator}
                layoutId="promptModeFlipIndicator"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span
              className={cn(
                styles.promptModeTabInner,
                selected && TAB_ACTIVE_CLASS[tab.id]
              )}
            >
              <span className={styles.promptModeTabIcon} aria-hidden>
                <Icon size={TAB_ICON_SIZE} weight="regular" />
              </span>
              <span className={styles.promptModeTabLabel}>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
