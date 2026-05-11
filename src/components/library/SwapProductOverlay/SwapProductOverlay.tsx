'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsLeftRight, Check, X } from '@phosphor-icons/react';
import cn from 'classnames';
import { Button } from '@/components/common/Button';
import {
  MOCK_PRODUCTS,
  PRODUCT_GROUP_LABELS,
  getSwapCandidatesForProduct,
} from '@/lib/mock-data';
import styles from './SwapProductOverlay.module.css';

interface SwapProductOverlayProps {
  open: boolean;
  /** Library asset whose product should be swapped. */
  asset: {
    id: string;
    name: string;
    url: string;
    productId?: string;
  } | null;
  onClose: () => void;
  onConfirm: (selectedProductIds: string[]) => void;
}

export default function SwapProductOverlay({
  open,
  asset,
  onClose,
  onConfirm,
}: SwapProductOverlayProps) {
  const [draftIds, setDraftIds] = useState<string[]>([]);

  const originalProduct = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.id === asset?.productId) ?? null,
    [asset?.productId]
  );

  const candidates = useMemo(
    () => (asset?.productId ? getSwapCandidatesForProduct(asset.productId) : []),
    [asset?.productId]
  );

  useEffect(() => {
    if (open) setDraftIds([]);
  }, [open, asset?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !asset || typeof document === 'undefined') return null;

  const groupLabel = originalProduct
    ? PRODUCT_GROUP_LABELS[originalProduct.groupId] ?? originalProduct.groupId
    : undefined;

  function toggleDraft(id: string) {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    if (draftIds.length === 0) return;
    onConfirm(draftIds);
  }

  return createPortal(
    <div className={styles.overlayRoot} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-product-dialog-title"
      >
        <div className={styles.header}>
          <div>
            <div id="swap-product-dialog-title" className={styles.title}>
              Swap product
            </div>
            <p className={styles.subtitle}>
              Pick one or more products to generate variants for this image
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Currently used</span>
            <div className={styles.currentRow}>
              {originalProduct ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- mock product */}
                  <img
                    src={originalProduct.image}
                    alt=""
                    className={styles.currentThumb}
                  />
                  <div className={styles.currentText}>
                    <span className={styles.currentName}>{originalProduct.name}</span>
                    {groupLabel && (
                      <span className={styles.currentGroup}>{groupLabel}</span>
                    )}
                  </div>
                </>
              ) : (
                <span className={styles.currentName}>Unknown product</span>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>Swap with</span>
            {candidates.length === 0 ? (
              <p className={styles.emptyState}>
                No other products in this group yet
              </p>
            ) : (
              <div className={styles.candidateGrid}>
                {candidates.map((product) => {
                  const isOn = draftIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={cn(styles.tile, isOn && styles.tileSelected)}
                      onClick={() => toggleDraft(product.id)}
                      aria-pressed={isOn}
                    >
                      <span className={styles.tileMarker}>
                        {isOn ? <Check size={14} weight="bold" aria-hidden /> : null}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- mock product */}
                      <img src={product.image} alt="" className={styles.tileImage} />
                      <span className={styles.tileLabel}>{product.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.selectionCount}>
            {draftIds.length === 0
              ? 'No swap selected'
              : `${draftIds.length} swap${draftIds.length === 1 ? '' : 's'} selected`}
          </span>
          <div className={styles.footerActions}>
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleConfirm}
              disabled={draftIds.length === 0}
              icon={<ArrowsLeftRight size={16} weight="bold" />}
              iconPosition="right"
            >
              Swap Now
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
