'use client';

import cn from 'classnames';
import { CaretUpDown, Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useBrand } from '@/lib/brand-context';
import { MOCK_BRANDS } from '@/lib/mock-data';
import styles from './BrandSwitcher.module.css';

interface BrandSwitcherProps {
  collapsed?: boolean;
}

const dropdownAnimation = {
  initial: { opacity: 0, y: -4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1 },
  },
} as const;

export default function BrandSwitcher({ collapsed }: BrandSwitcherProps) {
  const { activeBrand, setActiveBrand } = useBrand();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Group brands by organization (like open-wonder BrandSelect)
  const optionsByOrg = MOCK_BRANDS.reduce<Record<string, typeof MOCK_BRANDS>>(
    (acc, brand) => {
      const org = (brand as { organization?: string }).organization ?? 'Brands';
      if (!acc[org]) acc[org] = [];
      acc[org].push(brand);
      return acc;
    },
    {}
  );

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        type="button"
        className={cn(styles.trigger, collapsed && styles.collapsed)}
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? activeBrand.name : undefined}
      >
        <span className={styles.brandLogo}>
          {activeBrand.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeBrand.logoUrl}
              alt={activeBrand.name}
              className={styles.brandLogoImage}
            />
          ) : (
            <span
              className={styles.brandLogoInitials}
              style={{ backgroundColor: activeBrand.color }}
            >
              {activeBrand.initials}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className={styles.brandName}>{activeBrand.name}</span>
            <CaretUpDown size={14} weight="bold" className={styles.caret} />
          </>
        )}
      </button>

      {typeof document !== 'undefined' &&
        open &&
        createPortal(
          <div ref={dropdownRef} className={styles.dropdownPortal}>
            <motion.div
              {...dropdownAnimation}
              className={styles.dropdown}
              style={{
                position: 'fixed',
                top: containerRef.current
                  ? containerRef.current.getBoundingClientRect().bottom + 8
                  : 0,
                left: containerRef.current
                  ? containerRef.current.getBoundingClientRect().left
                  : 0,
              }}
            >
              {Object.entries(optionsByOrg).map(([organization, brands]) => (
                <div key={organization} className={styles.orgGroup}>
                  <span className={styles.organizationLabel}>
                    {organization}
                  </span>
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      className={cn(
                        styles.dropdownItem,
                        brand.id === activeBrand.id && styles.activeItem
                      )}
                      onClick={() => {
                        setActiveBrand(brand);
                        setOpen(false);
                      }}
                    >
                      <span className={styles.brandLogo}>
                        {brand.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className={styles.brandLogoImage}
                          />
                        ) : (
                          <span
                            className={styles.brandLogoInitials}
                            style={{ backgroundColor: brand.color }}
                          >
                            {brand.initials}
                          </span>
                        )}
                      </span>
                      <span className={styles.brandName}>{brand.name}</span>
                      {brand.id === activeBrand.id && (
                        <span className={styles.selectedIcon}>
                          <Check size={14} weight="bold" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
