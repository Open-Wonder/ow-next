'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, X } from '@phosphor-icons/react';
import cn from 'classnames';
import { MOCK_LIBRARY_ASSETS } from '@/lib/mock-data';
import { useChat } from '@/lib/chat-context';
import { Button } from '@/components/common/Button';
import styles from './CreateModeImageField.module.css';

type LibraryAsset = (typeof MOCK_LIBRARY_ASSETS)[number];

export default function CreateModeImageField() {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const { state, dispatch } = useChat();
  const ids = state.createOptions.sourceAssetIds;

  const exploreAssets = useMemo(
    () =>
      [...MOCK_LIBRARY_ASSETS].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    []
  );

  const assetById = useMemo(() => new Map(exploreAssets.map((a) => [a.id, a])), [exploreAssets]);

  const resolvedAssets = useMemo(() => {
    const out: LibraryAsset[] = [];
    for (const id of ids) {
      const a = assetById.get(id);
      if (a) out.push(a);
    }
    return out;
  }, [ids, assetById]);

  useEffect(() => {
    if (open) setDraftIds([...ids]);
  }, [open, ids]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function toggleDraft(id: string) {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function commitAndClose() {
    dispatch({ type: 'SET_CREATE_OPTIONS', payload: { sourceAssetIds: draftIds } });
    setOpen(false);
  }

  function removeAsset(id: string) {
    dispatch({
      type: 'SET_CREATE_OPTIONS',
      payload: { sourceAssetIds: ids.filter((x) => x !== id) },
    });
  }

  const overlay =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div className={styles.overlayRoot} role="presentation">
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close"
          onClick={() => setOpen(false)}
        />
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-explore-image-dialog-title"
        >
          <div className={styles.header}>
            <div>
              <div id="create-explore-image-dialog-title" className={styles.title}>
                Explore
              </div>
              <p className={styles.subtitle}>Choose one or more images from your library</p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={20} weight="regular" />
            </button>
          </div>
          <div className={styles.gridScroll}>
            <div className={styles.masonry}>
              {exploreAssets.map((asset) => {
                const isOn = draftIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={cn(styles.tile, isOn && styles.tileSelected)}
                    onClick={() => toggleDraft(asset.id)}
                    aria-pressed={isOn}
                  >
                    <span className={styles.tileMarker}>
                      {isOn ? <Check size={14} weight="bold" aria-hidden /> : null}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element -- grid thumbs */}
                    <img src={asset.url} alt="" className={styles.image} />
                    <span className={styles.tileCaption}>{asset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.footer}>
            <span className={styles.selectionCount}>
              {draftIds.length === 0
                ? 'No images selected'
                : `${draftIds.length} image${draftIds.length === 1 ? '' : 's'} selected`}
            </span>
            <div className={styles.footerActions}>
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={commitAndClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div
      className={cn(
        styles.fieldShell,
        resolvedAssets.length === 0 && styles.fieldShellEmpty
      )}
    >
      {resolvedAssets.length === 0 ? (
        <button
          type="button"
          className={styles.emptyHint}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={styles.emptyHintIcon} aria-hidden>
            <Plus size={20} weight="regular" />
          </span>
          <span className={styles.emptyHintLabel}>
            Click to select your image
          </span>
        </button>
      ) : (
        <>
          <div className={styles.thumbStrip} role="list">
            {resolvedAssets.map((asset) => (
              <div key={asset.id} className={styles.thumbWrap} role="listitem">
                {/* eslint-disable-next-line @next/next/no-img-element -- thumb */}
                <img src={asset.url} alt="" className={styles.thumbImg} />
                <button
                  type="button"
                  className={styles.thumbRemove}
                  onClick={() => removeAsset(asset.id)}
                  aria-label={`Remove ${asset.name}`}
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.addMore}
            onClick={() => setOpen(true)}
            aria-label="Add more images from Explore"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Plus size={20} weight="regular" />
          </button>
        </>
      )}
      {overlay}
    </div>
  );
}
