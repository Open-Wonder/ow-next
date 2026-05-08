'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, PaperPlaneRight, Heart } from '@phosphor-icons/react';
import cn from 'classnames';
import { Button } from '@/components/common/Button';
import { useChat } from '@/lib/chat-context';
import { MOCK_FOLDERS } from '@/lib/mock-data';
import AssetLightbox from '@/components/chat/AssetLightbox';
import GenerationLoader from './GenerationLoader';
import styles from './EditCanvas.module.css';

interface EditCanvasProps {
  embedded?: boolean;
}

export default function EditCanvas({ embedded }: EditCanvasProps = {}) {
  const { state, dispatch } = useChat();
  const [modifyAssetId, setModifyAssetId] = useState<string | null>(null);
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [modifyAnchor, setModifyAnchor] = useState<{ top: number; left: number } | null>(null);
  const modifyPopoverRef = useRef<HTMLDivElement>(null);
  const firstAssetThumbRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /** Convert aspect ratio string like "16:9" to CSS value like "16/9" */
  const getAspectCss = (ratio?: string) => {
    if (!ratio) return '1';
    const [w, h] = ratio.split(':');
    return `${w}/${h}`;
  };

  const handleModify = useCallback(
    (assetId: string, prompt: string) => {
      const original = state.currentSession?.generatedAssets.find((a) => a.id === assetId);
      const sessionId = state.currentSession?.id;
      setModifyAssetId(null);
      setModifyPrompt('');
      setModifyAnchor(null);

      const payload = {
        id: `asset-mod-${Date.now()}`,
        url: `https://picsum.photos/seed/mod${Date.now()}/600/600`,
        prompt: `Modified: ${prompt}`,
        type: 'image' as const,
        aspectRatio: original?.aspectRatio,
        savedToLibrary: false,
      };

      if (sessionId) {
        dispatch({ type: 'SET_MODIFYING_IMAGE', payload: { active: true, sessionId } });
      }
      setTimeout(() => {
        dispatch({ type: 'ADD_GENERATED_ASSET', payload, sessionId });
        if (sessionId) {
          dispatch({ type: 'SET_MODIFYING_IMAGE', payload: { active: false, sessionId } });
        }
      }, 1200);
    },
    [dispatch, state.currentSession]
  );

  const handleToggleSave = useCallback(
    (assetId: string, savedToLibrary: boolean) => {
      if (savedToLibrary) {
        dispatch({ type: 'UNSAVE_ASSET', payload: assetId });
      } else {
        dispatch({
          type: 'SAVE_ASSET_TO_LIBRARY',
          payload: { assetId, folderId: MOCK_FOLDERS[0].id },
        });
      }
    },
    [dispatch]
  );

  const handleSaveToLibrary = useCallback(
    (assetId: string) => {
      dispatch({
        type: 'SAVE_ASSET_TO_LIBRARY',
        payload: { assetId, folderId: MOCK_FOLDERS[0].id },
      });
    },
    [dispatch]
  );

  useEffect(() => {
    if (!modifyAssetId) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        modifyPopoverRef.current?.contains(ev.target as Node) ||
        (ev.target as HTMLElement).closest?.('[data-modify-trigger]')
      ) {
        return;
      }
      setModifyAssetId(null);
      setModifyPrompt('');
      setModifyAnchor(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modifyAssetId]);

  /** When opened from library Modify with a prompt, open the modify popover for the single asset */
  useEffect(() => {
    const prompt = state.pendingModifyPrompt;
    if (!prompt) return;
    const assets = state.currentSession?.generatedAssets ?? [];
    if (assets.length !== 1) return;
    const asset = assets[0];
    setModifyAssetId(asset.id);
    setModifyPrompt(prompt);
    dispatch({ type: 'CLEAR_PENDING_MODIFY' });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = firstAssetThumbRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          setModifyAnchor({ top: rect.bottom + 6, left: rect.left });
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [state.pendingModifyPrompt, state.currentSession?.generatedAssets, dispatch]);

  const submitModify = () => {
    if (modifyAssetId && modifyPrompt.trim()) {
      handleModify(modifyAssetId, modifyPrompt.trim());
    }
  };

  if (!state.currentSession) return null;

  const assets = state.currentSession.generatedAssets;
  const sessionId = state.currentSession.id;
  const isGenerating = state.generatingSessionIds.has(sessionId);
  const isModifying = state.modifyingSessionIds.has(sessionId);
  const showBatchPlaceholder = isGenerating && assets.length > 0;

  return (
    <motion.div
      className={embedded ? `${styles.canvas} ${styles.canvasEmbedded}` : styles.canvas}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.header}>
        <Button
          variant="secondary"
          size="sm"
          icon={<CaretLeft size={18} weight="bold" />}
          onClick={() => dispatch({ type: 'EXIT_MODE' })}
          aria-label="Close and return to start"
          className={styles.backButton}
        />
        <h3 className={styles.title}>Image Session</h3>
        <span className={styles.headerSpacer} />
      </div>

      <div
        className={`${styles.dotGrid} ${assets.length === 0 && isGenerating && !embedded ? styles.dotGridLoaderActive : ''}`}
      >
        {assets.length === 0 && isGenerating && !embedded ? (
          <GenerationLoader mode={state.mode} />
        ) : assets.length === 0 && isGenerating && embedded ? (
          /* Loader rendered by ChatLanding as full-viewport overlay */
          null
        ) : (
          <div className={styles.assetGrid}>
            {/*
              Newest assets are first in state (see ADD_GENERATED_ASSET). Grid reads top-left → right:
              loading slots first so they sit where the next image(s) will appear.
            */}
            {(showBatchPlaceholder || isModifying) && (
              <div
                className={`${styles.assetThumb} ${styles.imageSlotOutline}`}
                style={{ aspectRatio: getAspectCss(state.imagineOptions.aspectRatio) }}
                aria-busy
                aria-label="Generating images"
              >
                <div className={styles.imageSlotTextPill}>
                  <span className={styles.imageSlotGeneratingText}>Generating Images</span>
                </div>
              </div>
            )}
            {assets.map((asset, i) => (
              <motion.div
                key={asset.id}
                ref={i === 0 ? firstAssetThumbRef : undefined}
                className={styles.assetThumb}
                style={{ aspectRatio: getAspectCss(asset.aspectRatio) }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: i * 0.05,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.prompt} className={styles.thumbImage} />
                {asset.savedToLibrary && (
                  <span className={styles.savedHeartOnly} aria-hidden>
                    <Heart size={14} weight="regular" />
                  </span>
                )}
                <div
                  className={styles.thumbOverlay}
                  onClick={() => setLightboxIndex(i)}
                  onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(i)}
                  role="button"
                  tabIndex={0}
                  aria-label="View full size"
                >
                  <button
                    type="button"
                    className={cn(styles.heartButton, asset.savedToLibrary && styles.heartButtonLiked)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSave(asset.id, asset.savedToLibrary);
                    }}
                    aria-label={
                      asset.savedToLibrary ? 'Remove from library' : 'Save to library'
                    }
                  >
                    <Heart
                      size={14}
                      weight={asset.savedToLibrary ? 'bold' : 'regular'}
                    />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modify popover - appears next to Modify button */}
      {modifyAssetId && modifyAnchor && typeof document !== 'undefined' &&
        createPortal(
          <motion.div
            ref={modifyPopoverRef}
            className={styles.modifyPopover}
            style={{ top: modifyAnchor.top, left: modifyAnchor.left }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.modifyInputRow}>
              <input
                type="text"
                className={styles.modifyInput}
                value={modifyPrompt}
                onChange={(e) => setModifyPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitModify();
                  if (e.key === 'Escape') {
                    setModifyAssetId(null);
                    setModifyPrompt('');
                    setModifyAnchor(null);
                  }
                }}
                placeholder="Describe changes..."
                autoFocus
              />
              <button
                type="button"
                className={styles.modifySubmitBtn}
                onClick={submitModify}
                disabled={!modifyPrompt.trim()}
                aria-label="Apply"
              >
                <PaperPlaneRight size={16} />
              </button>
            </div>
          </motion.div>,
          document.body
        )}

      {/* Lightbox overlay - portaled to body so it appears above everything */}
      {typeof document !== 'undefined' &&
        lightboxIndex !== null &&
        assets.length > 0 &&
        createPortal(
          <AnimatePresence>
            <AssetLightbox
              assets={assets}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onModify={handleModify}
              onSaveToLibrary={handleSaveToLibrary}
            />
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}
