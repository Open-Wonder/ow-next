'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, DownloadSimple, PencilSimple, PaperPlaneRight, Heart } from '@phosphor-icons/react';
import { Button } from '@/components/common/Button';
import { useChat } from '@/lib/chat-context';
import { MOCK_FOLDERS } from '@/lib/mock-data';
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

  /** Convert aspect ratio string like "16:9" to CSS value like "16/9" */
  const getAspectCss = (ratio?: string) => {
    if (!ratio) return '1';
    const [w, h] = ratio.split(':');
    return `${w}/${h}`;
  };

  const handleModify = useCallback(
    (assetId: string, prompt: string) => {
      const original = state.currentSession?.generatedAssets.find((a) => a.id === assetId);
      dispatch({
        type: 'ADD_GENERATED_ASSET',
        payload: {
          id: `asset-mod-${Date.now()}`,
          url: `https://picsum.photos/seed/mod${Date.now()}/600/600`,
          prompt: `Modified: ${prompt}`,
          type: 'image',
          aspectRatio: original?.aspectRatio,
          savedToLibrary: false,
        },
      });
      setModifyAssetId(null);
      setModifyPrompt('');
      setModifyAnchor(null);
    },
    [dispatch, state.currentSession]
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

  const handleDownload = useCallback((asset: { url: string; id: string }) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `asset-${asset.id}`;
    link.click();
  }, []);

  const openModifyPopover = (asset: { id: string; prompt: string }, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setModifyAssetId(asset.id);
    setModifyPrompt(asset.prompt);
    setModifyAnchor({ top: rect.bottom + 6, left: rect.left });
  };

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
  }, [state.pendingModifyPrompt, dispatch]);

  const submitModify = () => {
    if (modifyAssetId && modifyPrompt.trim()) {
      handleModify(modifyAssetId, modifyPrompt.trim());
    }
  };

  if (!state.currentSession) return null;

  const assets = state.currentSession.generatedAssets;
  const isGenerating = state.isGeneratingImages;
  const skeletonCount = isGenerating ? 4 : 0;

  return (
    <motion.div
      className={embedded ? `${styles.canvas} ${styles.canvasEmbedded}` : styles.canvas}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Imagine Session</h3>
        <span className={styles.headerSpacer} />
        <Button
          variant="secondary"
          size="sm"
          icon={<X size={14} />}
          onClick={() => dispatch({ type: 'EXIT_MODE' })}
          aria-label="Close and return to start"
        >
          Close
        </Button>
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
                <div className={styles.thumbOverlay}>
                  <div className={styles.actionBar}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<DownloadSimple size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(asset);
                      }}
                    >
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={
                        <Heart
                          size={14}
                          weight={asset.savedToLibrary ? 'fill' : 'regular'}
                        />
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveToLibrary(asset.id);
                      }}
                    >
                      {asset.savedToLibrary ? 'Saved' : 'Save to Library'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PencilSimple size={14} />}
                      data-modify-trigger
                      onClick={(e) => {
                        e.stopPropagation();
                        openModifyPopover(asset, e);
                      }}
                    >
                      Modify
                    </Button>
                  </div>
                </div>
                {asset.savedToLibrary && (
                  <span className={styles.savedBadge} aria-label="Saved to library">
                    <Heart size={16} weight={asset.savedToLibrary ? 'fill' : 'regular'} />
                  </span>
                )}
              </motion.div>
            ))}
            {isGenerating &&
              Array.from({ length: skeletonCount }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  className={styles.assetThumb}
                  style={{ aspectRatio: getAspectCss(state.imagineOptions.aspectRatio) }}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.skeleton}>
                    <div className={styles.skeletonShimmer} />
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
    </motion.div>
  );
}
