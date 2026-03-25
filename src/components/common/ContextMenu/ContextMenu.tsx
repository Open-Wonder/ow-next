'use client';

import { CaretRight, Check } from '@phosphor-icons/react';
import cn from 'classnames';
import { motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import styles from './ContextMenu.module.css';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface MenuItem {
  id: string;
  label: string;
  /** Secondary line (e.g. in submenu rows). */
  description?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  dividerBefore?: boolean;
  submenu?: MenuItem[];
  /** Extra content below submenu items (e.g. create row). */
  submenuFooter?: React.ReactNode;
  /** Applied to the submenu panel when this item is hovered. */
  submenuClassName?: string;
  checked?: boolean;
  /** When false, menu stays open after activating this item (e.g. checkbox rows). */
  closeOnSelect?: boolean;
  /** Non-interactive row (muted, no pointer). */
  disabled?: boolean;
  onAction?: () => void;
}

export interface ContextMenuProps {
  items: MenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

/* ── Submenu close delay ─────────────────────────────────────────────── */

const SUBMENU_CLOSE_DELAY_MS = 150;

/* ── Component ─────────────────────────────────────────────────────── */

export default function ContextMenu({
  items,
  position,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clampedPosition, setClampedPosition] = useState(position);
  const [hoveredSubmenuItemId, setHoveredSubmenuItemId] = useState<
    string | null
  >(null);
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null);

  // Viewport clamping
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    let x = rect.left;
    let y = rect.top;

    if (rect.right > innerWidth) {
      x = innerWidth - rect.width - 8;
    }
    if (rect.bottom > innerHeight) {
      y = innerHeight - rect.height - 8;
    }
    if (rect.left < 0) {
      x = 8;
    }
    if (rect.top < 0) {
      y = 8;
    }

    setClampedPosition((prev) =>
      prev.x !== x || prev.y !== y ? { x, y } : prev
    );
  }, [position.x, position.y]);

  // Outside click
  useEffect(() => {
    const handleMouseDown = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleItemMouseEnter = useCallback(
    (item: MenuItem, el: HTMLDivElement | null) => {
      clearCloseTimeout();
      if (item.submenu && item.submenu.length > 0) {
        setHoveredSubmenuItemId(item.id);
        if (el) {
          setHoveredItemRect(el.getBoundingClientRect());
        }
      } else {
        setHoveredSubmenuItemId(null);
        setHoveredItemRect(null);
      }
    },
    [clearCloseTimeout]
  );

  const handleItemMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredSubmenuItemId(null);
      setHoveredItemRect(null);
      closeTimeoutRef.current = null;
    }, SUBMENU_CLOSE_DELAY_MS);
  }, []);

  const handleSubmenuMouseEnter = useCallback(() => {
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handleSubmenuMouseLeave = useCallback(() => {
    setHoveredSubmenuItemId(null);
    setHoveredItemRect(null);
  }, []);

  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;
      if (item.submenu?.length) return;
      item.onAction?.();
      onClose();
    },
    [onClose]
  );

  const handleSubmenuItemClick = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;
      item.onAction?.();
      if (item.closeOnSelect !== false) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <motion.div
      ref={menuRef}
      className={styles.menu}
      style={{
        left: clampedPosition.x,
        top: clampedPosition.y,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.dividerBefore && <div className={styles.divider} />}
          {item.submenu && item.submenu.length > 0 ? (
            <div
              className={cn(styles.item, item.danger && styles.itemDanger)}
              onMouseEnter={(e) =>
                handleItemMouseEnter(item, e.currentTarget as HTMLDivElement)
              }
              onMouseLeave={handleItemMouseLeave}
            >
              {item.icon && (
                <span className={styles.itemIcon}>{item.icon}</span>
              )}
              <span className={styles.itemLabel}>
                {item.label}
              </span>
              <span className={styles.itemChevron}>
                <CaretRight size={12} />
              </span>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={item.disabled ? -1 : 0}
              aria-disabled={item.disabled ? true : undefined}
              className={cn(
                styles.item,
                item.danger && styles.itemDanger,
                item.disabled && styles.itemDisabled
              )}
              onClick={() => handleItemClick(item)}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (item.disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(item);
                }
              }}
            >
              {item.icon && (
                <span className={styles.itemIcon}>{item.icon}</span>
              )}
              <span className={styles.itemLabel}>{item.label}</span>
              {item.checked !== undefined && (
                <span
                  className={cn(
                    styles.itemCheckbox,
                    item.checked && styles.itemCheckboxChecked
                  )}
                >
                  {item.checked && (
                    <Check size={10} className={styles.checkIcon} />
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {hoveredSubmenuItemId && hoveredItemRect && (() => {
        const item = items.find((i) => i.id === hoveredSubmenuItemId);
        if (!item?.submenu?.length) return null;

        const submenuX = hoveredItemRect.right + 4;
        const submenuY = hoveredItemRect.top;

        return (
          <div
            className={cn(styles.submenu, item.submenuClassName)}
            style={{
              left: submenuX,
              top: submenuY,
            }}
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            {item.submenu.map((subItem) => (
              <div key={subItem.id}>
                {subItem.dividerBefore && (
                  <div className={styles.divider} />
                )}
                <div
                  role="button"
                  tabIndex={subItem.disabled ? -1 : 0}
                  aria-disabled={subItem.disabled ? true : undefined}
                  className={cn(
                    styles.item,
                    subItem.danger && styles.itemDanger,
                    subItem.disabled && styles.itemDisabled
                  )}
                  onClick={() => handleSubmenuItemClick(subItem)}
                  onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                    if (subItem.disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSubmenuItemClick(subItem);
                    }
                  }}
                >
                  {subItem.icon && (
                    <span className={styles.itemIcon}>{subItem.icon}</span>
                  )}
                  {subItem.description ? (
                    <span className={styles.itemLabelStack}>
                      <span className={styles.itemLabelPrimary}>{subItem.label}</span>
                      <span className={styles.itemLabelDescription}>{subItem.description}</span>
                    </span>
                  ) : (
                    <span className={styles.itemLabel}>{subItem.label}</span>
                  )}
                  {subItem.checked !== undefined && (
                    <span
                      className={cn(
                        styles.itemCheckbox,
                        subItem.checked && styles.itemCheckboxChecked
                      )}
                    >
                      {subItem.checked && (
                        <Check
                          size={10}
                          className={styles.checkIcon}
                        />
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {item.submenuFooter ? (
              <div className={styles.submenuFooter}>{item.submenuFooter}</div>
            ) : null}
          </div>
        );
      })()}
    </motion.div>
  );
}
