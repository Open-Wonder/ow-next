'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Check, Plus, X } from '@phosphor-icons/react';
import cn from 'classnames';
import {
  MOCK_BRAND_STYLES,
  MOCK_IMAGES,
  MOCK_LIBRARY_ASSETS,
  MOCK_MARKETS,
} from '@/lib/mock-data';
import { useChat } from '@/lib/chat-context';
import { Button } from '@/components/common/Button';
import styles from './CreateModeImageField.module.css';

type Market = (typeof MOCK_MARKETS)[number];

interface MarketRowProps {
  market: Market;
  selected: boolean;
  onToggle: (id: string) => void;
}

function MarketRow({ market, selected, onToggle }: MarketRowProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLLabelElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (rowRef.current) {
        const rect = rowRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.left - 12,
        });
      }
      setShowPreview(true);
      timeoutRef.current = null;
    }, 150);
  }, []);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <label
        ref={rowRef}
        className={cn(styles.marketRow, selected && styles.marketRowSelected)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(market.id)}
          className={styles.marketCheckbox}
        />
        <span className={styles.marketLabel}>{market.label}</span>
      </label>
      {typeof document !== 'undefined' &&
        showPreview &&
        position &&
        createPortal(
          <div
            className={styles.marketPreviewCard}
            style={{ top: position.top, left: position.left }}
          >
            <div className={styles.marketPreviewImages}>
              {market.previews.slice(0, 3).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- preview
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={styles.marketPreviewImage}
                />
              ))}
            </div>
            <div className={styles.marketPreviewName}>{market.label}</div>
            <div className={styles.marketPreviewDescription}>{market.description}</div>
          </div>,
          document.body
        )}
    </>
  );
}

type LibraryAsset = (typeof MOCK_LIBRARY_ASSETS)[number];

const STYLE_FILTER_ALL = 'all';

export default function CreateModeImageField() {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftMarkets, setDraftMarkets] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState<string>(STYLE_FILTER_ALL);
  const { state, dispatch } = useChat();
  const ids = state.createOptions.sourceAssetIds;
  const persistedMarkets = state.createOptions.markets;

  const exploreAssets = useMemo(
    () =>
      [...MOCK_LIBRARY_ASSETS].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    []
  );

  const filteredAssets = useMemo(
    () =>
      styleFilter === STYLE_FILTER_ALL
        ? exploreAssets
        : exploreAssets.filter((a) => a.styleId === styleFilter),
    [exploreAssets, styleFilter]
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
    if (open) {
      setDraftIds([...ids]);
      setDraftMarkets([...persistedMarkets]);
      setStyleFilter(STYLE_FILTER_ALL);
    }
  }, [open, ids, persistedMarkets]);

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

  function toggleDraftMarket(id: string) {
    setDraftMarkets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function commitAndSend() {
    if (draftIds.length === 0 || draftMarkets.length === 0) return;
    setOpen(false);
    dispatch({
      type: 'SET_CREATE_OPTIONS',
      payload: { sourceAssetIds: draftIds, markets: draftMarkets },
    });

    const selectedMarkets = draftMarkets
      .map((id) => MOCK_MARKETS.find((m) => m.id === id))
      .filter((m): m is (typeof MOCK_MARKETS)[number] => Boolean(m));
    const marketLabels = selectedMarkets.map((m) => m.label);

    // One session per selected source image — each session contains the original
    // (tag: "Original") plus one adapted asset per market (tag: market label).
    const baseTime = Date.now();
    draftIds.forEach((sourceId, imgIdx) => {
      const sourceAsset = assetById.get(sourceId);
      if (!sourceAsset) return;
      const sessionId = `session-${baseTime}-${imgIdx}-${sourceId}`;
      const message = `Adapt ${sourceAsset.name} for ${marketLabels.join(', ')}`;

      dispatch({
        type: 'SEND_MESSAGE',
        payload: {
          id: `msg-${baseTime}-${imgIdx}`,
          role: 'user' as const,
          content: message,
          timestamp: new Date().toISOString(),
        },
        sessionId,
      });

      dispatch({
        type: 'ADD_GENERATED_ASSET',
        payload: {
          id: `asset-orig-${sessionId}`,
          url: sourceAsset.url,
          prompt: message,
          type: 'image' as const,
          aspectRatio: sourceAsset.aspectRatio,
          savedToLibrary: false,
          createdAt: new Date().toISOString(),
          tag: 'Original',
        },
        sessionId,
      });

      dispatch({
        type: 'SET_GENERATING_IMAGES',
        payload: { active: true, sessionId },
      });

      selectedMarkets.forEach((market, mIdx) => {
        const delay = 1500 + imgIdx * 250 + mIdx * 700;
        const isLast = mIdx === selectedMarkets.length - 1;
        setTimeout(() => {
          const randomImg = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
          dispatch({
            type: 'ADD_GENERATED_ASSET',
            payload: {
              id: `asset-${sessionId}-${market.id}`,
              url: randomImg.url,
              prompt: message,
              type: 'image' as const,
              aspectRatio: sourceAsset.aspectRatio,
              savedToLibrary: false,
              createdAt: new Date().toISOString(),
              tag: market.label,
            },
            sessionId,
          });
          if (isLast) {
            dispatch({
              type: 'SET_GENERATING_IMAGES',
              payload: { active: false, sessionId },
            });
          }
        }, delay);
      });
    });
  }

  function removeAsset(id: string) {
    dispatch({
      type: 'SET_CREATE_OPTIONS',
      payload: { sourceAssetIds: ids.filter((x) => x !== id) },
    });
  }

  const canSend = draftIds.length > 0 && draftMarkets.length > 0;

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
              <p className={styles.subtitle}>
                Choose images and markets to adapt them for
              </p>
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
          <div className={styles.splitBody}>
            <div className={styles.leftPane}>
              <div
                className={styles.styleFilterRow}
                role="tablist"
                aria-label="Filter by image style"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={styleFilter === STYLE_FILTER_ALL}
                  className={cn(
                    styles.styleFilterChip,
                    styleFilter === STYLE_FILTER_ALL && styles.styleFilterChipActive
                  )}
                  onClick={() => setStyleFilter(STYLE_FILTER_ALL)}
                >
                  All
                </button>
                {MOCK_BRAND_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    role="tab"
                    aria-selected={styleFilter === style.id}
                    className={cn(
                      styles.styleFilterChip,
                      styleFilter === style.id && styles.styleFilterChipActive
                    )}
                    onClick={() => setStyleFilter(style.id)}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
              <div className={styles.gridScroll}>
                {filteredAssets.length === 0 ? (
                  <p className={styles.emptyGrid}>No images in this style yet</p>
                ) : (
                  <div className={styles.masonry}>
                    {filteredAssets.map((asset) => {
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
                )}
              </div>
            </div>
            <div className={styles.divider} aria-hidden />
            <div className={styles.rightPane}>
              <div className={styles.rightPaneHeader}>
                <h3 className={styles.rightPaneTitle}>Markets</h3>
                <p className={styles.rightPaneHint}>
                  Pick one or more regions to adapt for
                </p>
              </div>
              <div
                className={styles.marketList}
                role="group"
                aria-label="Select markets"
              >
                {MOCK_MARKETS.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    selected={draftMarkets.includes(market.id)}
                    onToggle={toggleDraftMarket}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <span className={styles.selectionCount}>
              {draftIds.length === 0
                ? 'No images selected'
                : `${draftIds.length} image${draftIds.length === 1 ? '' : 's'}`}
              {' · '}
              {draftMarkets.length === 0
                ? 'No markets selected'
                : `${draftMarkets.length} market${draftMarkets.length === 1 ? '' : 's'}`}
            </span>
            <div className={styles.footerActions}>
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={commitAndSend}
                disabled={!canSend}
                icon={<ArrowUp size={16} weight="bold" />}
                iconPosition="right"
              >
                {draftIds.length > 1 ? 'Adapt Images' : 'Adapt Image'}
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
            Select your Images
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
