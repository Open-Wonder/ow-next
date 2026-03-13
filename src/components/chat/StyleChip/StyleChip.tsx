'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import styles from './StyleChip.module.css';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface StyleChipProps {
  name: string;
  image: string;
  description?: string;
  previews?: string[];
  isActive: boolean;
  onClick: () => void;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function StyleChip({
  name,
  image,
  description,
  previews,
  isActive,
  onClick,
}: StyleChipProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
      timeoutRef.current = null;
    }, 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowPreview(false);
  }, []);

  // Calculate position when preview becomes visible
  useEffect(() => {
    if (showPreview && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPortalPosition({
        top: rect.top - 8, // 8px gap above the chip
        left: rect.left + rect.width / 2,
      });
    }
  }, [showPreview]);

  const hasPreviewContent = (previews && previews.length > 0) || description;

  const previewCard = showPreview && hasPreviewContent && portalPosition ? (
    <div
      className={styles.previewCard}
      style={{ top: portalPosition.top, left: portalPosition.left }}
    >
      {previews && previews.length > 0 && (
        <div className={styles.previewImages}>
          {previews.map((url, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={i}
              src={url}
              alt=""
              className={styles.previewImage}
            />
          ))}
        </div>
      )}
      <div className={styles.previewName}>{name}</div>
      {description && (
        <div className={styles.previewDescription}>{description}</div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={cn(styles.chip, isActive && styles.chipActive)}
        onClick={onClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className={styles.thumbnail} />
        {name}
      </button>

      {/* #region agent log */}
      {(() => { fetch('http://127.0.0.1:7242/ingest/9e12a5bc-bcf8-4863-ba85-1864bc6b6f1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StyleChip.tsx:portal',message:'StyleChip portal check',data:{hasDocument:typeof document !== 'undefined',showPreview},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{}); return null; })()}
      {/* #endregion */}
      {typeof document !== 'undefined' && previewCard && createPortal(previewCard, document.body)}
    </div>
  );
}
