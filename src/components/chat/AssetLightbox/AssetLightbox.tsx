'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowUp,
  DownloadSimple,
  PencilSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/common/Button';
import styles from './AssetLightbox.module.css';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface AssetLightboxProps {
  assets: Array<{
    id: string;
    url: string;
    prompt: string;
    type: 'image' | 'video';
    savedToLibrary: boolean;
  }>;
  initialIndex: number;
  onClose: () => void;
  onModify: (assetId: string, prompt: string) => void;
  onSaveToLibrary: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function AssetLightbox({
  assets,
  initialIndex,
  onClose,
  onModify,
}: AssetLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showModifyPanel, setShowModifyPanel] = useState(false);
  const [modifyInputText, setModifyInputText] = useState('');
  const modifyInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentAsset = assets[currentIndex];
  const hasMultiple = assets.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < assets.length - 1;

  const goPrev = useCallback(() => {
    if (canGoPrev) setCurrentIndex((i) => i - 1);
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (canGoNext) setCurrentIndex((i) => i + 1);
  }, [canGoNext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showModifyPanel) {
        if (e.key === 'Escape') {
          setShowModifyPanel(false);
          setModifyInputText('');
        }
        return;
      }
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
      }
    },
    [showModifyPanel, onClose, goPrev, goNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (showModifyPanel) {
      setModifyInputText(currentAsset?.prompt ?? '');
      modifyInputRef.current?.focus();
    }
  }, [showModifyPanel, currentAsset?.prompt]);

  const handleBackdropClick = () => {
    onClose();
  };

  const handleDownload = () => {
    if (!currentAsset) return;
    const link = document.createElement('a');
    link.href = currentAsset.url;
    link.download = `asset-${currentAsset.id}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleModifyClick = () => {
    setShowModifyPanel(true);
  };

  const handleModifySubmit = () => {
    const trimmed = modifyInputText.trim();
    if (!trimmed || !currentAsset) return;
    onModify(currentAsset.id, trimmed);
    setShowModifyPanel(false);
    setModifyInputText('');
  };

  const handleModifyBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowModifyPanel(false);
      setModifyInputText('');
    }
  };

  if (!currentAsset) return null;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        aria-hidden
      />
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div ref={contentRef} className={styles.content}>
        <div className={styles.contentArea}>
          <div className={styles.assetWrapper}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAsset.id}
                className={styles.assetWrapper}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {currentAsset.type === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentAsset.url}
                    alt={currentAsset.prompt}
                    className={styles.assetImage}
                  />
                ) : (
                  <video
                    src={currentAsset.url}
                    controls
                    className={styles.assetVideo}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className={styles.actionBar}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleDownload}
              aria-label="Download"
            >
              <DownloadSimple size={20} />
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleModifyClick}
              aria-label="Modify"
            >
              <PencilSimple size={20} />
            </button>
          </div>
        </div>

        {showModifyPanel && (
          <div
            className={styles.modifyBackdrop}
            onClick={handleModifyBackdropClick}
          >
            <div
              className={styles.modifyPanel}
              onClick={(e) => e.stopPropagation()}
            >
              <form
                className={styles.modifyForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleModifySubmit();
                }}
              >
                <input
                  ref={modifyInputRef}
                  type="text"
                  className={styles.modifyInput}
                  value={modifyInputText}
                  onChange={(e) => setModifyInputText(e.target.value)}
                  placeholder="Describe changes..."
                />
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={!modifyInputText.trim()}
                  icon={<PaperPlaneRight size={18} weight="bold" />}
                  className={styles.modifySendBtn}
                  classNames={{ inner: styles.modifySendBtnInner }}
                  aria-label="Apply"
                />
              </form>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
