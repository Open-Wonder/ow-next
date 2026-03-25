'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  MagnifyingGlass,
  DotsThree,
  DownloadSimple,
  Trash,
  PencilSimple,
  PaperPlaneRight,
  X,
  Folder,
  FolderPlus,
  Plus,
  CircleNotch,
} from '@phosphor-icons/react';
import cn from 'classnames';
import { toast } from 'sonner';
import {
  LIBRARY_BRAND_STYLES_ALL_ID,
  MOCK_LIBRARY_ASSETS,
  MOCK_LIBRARY_COLLECTIONS,
  MOCK_PRODUCTS,
  MOCK_PRODUCT_STYLES,
  isLibraryAssetInBrandStylesSidebar,
} from '@/lib/mock-data';
import ContextMenu, { type MenuItem } from '@/components/common/ContextMenu/ContextMenu';
import { Button } from '@/components/common/Button';
import MentionPopover, { type MentionProduct } from '@/components/chat/ChatInput/MentionPopover';
import AssetLightbox from '@/components/chat/AssetLightbox/AssetLightbox';
import { useChat } from '@/lib/chat-context';
import { countLikedAssetsInCollection, getCollectionIdsForAsset } from '@/lib/library-collections';
import styles from './LibraryView.module.css';

// ── Component ───────────────────────────────────────────────────────────

export default function LibraryView() {
  const { state, dispatch } = useChat();
  const styleFilter = state.activeLibraryCollection;
  const [productFilter, setProductFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [productPopoverSelectedIndex, setProductPopoverSelectedIndex] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    assetId: string;
  } | null>(null);

  /** When set, show prompt input for Modify from library; on submit we switch to image session */
  const [libraryModify, setLibraryModify] = useState<{
    asset: (typeof filteredAssets)[0];
    position: { x: number; y: number };
  } | null>(null);
  const [libraryModifyPrompt, setLibraryModifyPrompt] = useState('');
  const libraryModifyInputRef = useRef<HTMLInputElement>(null);
  const [newCollectionDraft, setNewCollectionDraft] = useState(false);
  const [newCollectionNameInput, setNewCollectionNameInput] = useState('');
  const hdGenerationTimeoutsRef = useRef<Map<string, number>>(new Map());

  const likedIds = state.likedAssetIds;

  useEffect(() => {
    const timeoutsMap = hdGenerationTimeoutsRef.current;
    return () => {
      timeoutsMap.forEach((t) => clearTimeout(t));
      timeoutsMap.clear();
    };
  }, []);

  const toggleLiked = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_LIKED_ASSET', payload: assetId });
  };

  // Clear product filter when collection changes
  useEffect(() => {
    setProductFilter('');
  }, [styleFilter]);

  // Filtered assets, sorted by most recent first (only show liked assets)
  const filteredAssets = useMemo(() => {
    let result = [...MOCK_LIBRARY_ASSETS];

    // Only show liked
    result = result.filter((a) => likedIds.has(a.id));

    // Collection filter
    if (styleFilter) {
      if (styleFilter === LIBRARY_BRAND_STYLES_ALL_ID) {
        result = result.filter((a) => isLibraryAssetInBrandStylesSidebar(a));
      } else {
        const isNamedLibraryCollection =
          MOCK_LIBRARY_COLLECTIONS.some((c) => c.id === styleFilter) ||
          state.userLibraryCollections.some((c) => c.id === styleFilter);
        if (isNamedLibraryCollection) {
          result = result.filter((a) =>
            getCollectionIdsForAsset(a.id, state.assetCollectionMembership).includes(styleFilter)
          );
        } else {
          const isProductStyle = MOCK_PRODUCT_STYLES.some((s) => s.id === styleFilter);
          if (isProductStyle) {
            result = result.filter(
              (a) => a.styleId === 'style-3' && 'productStyleId' in a && a.productStyleId === styleFilter
            );
          } else {
            result = result.filter((a) => a.styleId === styleFilter);
          }
        }
      }
    }

    // Product sub-filter within a product style collection
    if (productFilter) {
      result = result.filter((a) => 'productId' in a && a.productId === productFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }

    // Sort by createdAt descending (last saved at top)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [styleFilter, search, likedIds, productFilter, state.assetCollectionMembership, state.userLibraryCollections]);

  const isProductCollection = MOCK_PRODUCT_STYLES.some((s) => s.id === styleFilter);
  const productPopoverOpen = isProductCollection && searchFocused;

  const productMentionItems: MentionProduct[] = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MOCK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)).map((p) => ({
      type: 'product' as const,
      id: p.id,
      name: p.name,
      image: p.image,
    }));
  }, [search]);

  useEffect(() => {
    setProductPopoverSelectedIndex(0);
  }, [productMentionItems]);

  const getProductPopoverPosition = () => {
    if (!searchWrapRef.current) return { top: 0, left: 0 };
    const rect = searchWrapRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  const closeProductPopover = () => setSearchFocused(false);

  const handleProductPopoverKeyDown = (e: React.KeyboardEvent) => {
    if (!productPopoverOpen || productMentionItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProductPopoverSelectedIndex((i) => Math.min(i + 1, productMentionItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProductPopoverSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = productMentionItems[productPopoverSelectedIndex];
      if (item) {
        setProductFilter(item.id);
        closeProductPopover();
      }
    }
  };

  const selectedProduct = productFilter ? MOCK_PRODUCTS.find((p) => p.id === productFilter) : null;

  const handleContextMenu = (e: React.MouseEvent, assetId: string) => {
    e.preventDefault();
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, assetId });
  };

  const handleDotsClick = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 200; // matches ContextMenu min-width
    setContextMenu({
      position: { x: rect.right - menuWidth, y: rect.bottom + 4 },
      assetId,
    });
  };

  useEffect(() => {
    if (!contextMenu) {
      setNewCollectionDraft(false);
      setNewCollectionNameInput('');
    }
  }, [contextMenu]);

  const getContextItems = useCallback(
    (assetId: string): MenuItem[] => {
      const asset =
        filteredAssets.find((a) => a.id === assetId) ??
        MOCK_LIBRARY_ASSETS.find((a) => a.id === assetId);
      if (!asset) return [];

      const isIllustration = asset.styleId === 'style-2';
      const hdGenerating = state.hdGeneratingAssetIds.has(assetId);
      const hdReady = state.hdReadyAssetIds.has(assetId);

      const hdMenuItem: MenuItem = hdGenerating
        ? {
            id: 'download-hd',
            label: 'HD being generated...',
            icon: <CircleNotch size={16} className={styles.hdMenuSpinner} />,
            disabled: true,
          }
        : hdReady
          ? {
              id: 'download-hd',
              label: 'Download (HD)',
              icon: <DownloadSimple size={16} />,
              onAction: () => {},
            }
          : {
              id: 'download-hd',
              label: 'Download (HD)',
              icon: <DownloadSimple size={16} />,
              onAction: () => {
                const prev = hdGenerationTimeoutsRef.current.get(assetId);
                if (prev) clearTimeout(prev);
                dispatch({ type: 'START_HD_GENERATION', payload: assetId });
                toast('Your HD image is being generated');
                const t = window.setTimeout(() => {
                  hdGenerationTimeoutsRef.current.delete(assetId);
                  dispatch({ type: 'COMPLETE_HD_GENERATION', payload: assetId });
                  toast.success('Your HD image is ready');
                }, 8000);
                hdGenerationTimeoutsRef.current.set(assetId, t);
              },
            };

      const downloadItems: MenuItem[] = isIllustration
        ? [
            {
              id: 'download-sd',
              label: 'Download (SD)',
              icon: <DownloadSimple size={16} />,
              onAction: () => {},
            },
            {
              id: 'download-svg',
              label: 'Download (SVG)',
              icon: <DownloadSimple size={16} />,
              onAction: () => {},
            },
          ]
        : [
            {
              id: 'download-sd',
              label: 'Download (SD)',
              icon: <DownloadSimple size={16} />,
              onAction: () => {},
            },
            hdMenuItem,
          ];

      const allCollections = [
        ...MOCK_LIBRARY_COLLECTIONS.map((c) => ({ id: c.id, name: c.name })),
        ...state.userLibraryCollections,
      ];

      const collectionSubmenu: MenuItem[] = allCollections.map((c) => ({
        id: `col-${c.id}`,
        label: c.name,
        description: `${countLikedAssetsInCollection(c.id, state.likedAssetIds, state.assetCollectionMembership)} assets`,
        icon: <Folder size={16} weight="regular" />,
        checked: getCollectionIdsForAsset(assetId, state.assetCollectionMembership).includes(c.id),
        closeOnSelect: false,
        onAction: () => {
          dispatch({
            type: 'TOGGLE_ASSET_LIBRARY_COLLECTION',
            payload: { assetId, collectionId: c.id },
          });
        },
      }));

      const saveNewCollection = () => {
        const name = newCollectionNameInput.trim();
        if (!name) return;
        dispatch({
          type: 'ADD_USER_LIBRARY_COLLECTION',
          payload: { name, assetIdToAdd: assetId },
        });
        setNewCollectionDraft(false);
        setNewCollectionNameInput('');
      };

      const submenuFooter = (
        <div className={styles.collectionSubmenuFooter}>
          {newCollectionDraft ? (
            <div className={styles.collectionCreateRow}>
              <input
                className={styles.collectionCreateInput}
                value={newCollectionNameInput}
                onChange={(e) => setNewCollectionNameInput(e.target.value)}
                placeholder="New collection"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- inline create in submenu
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveNewCollection();
                  }
                  if (e.key === 'Escape') {
                    setNewCollectionDraft(false);
                    setNewCollectionNameInput('');
                  }
                }}
              />
              <button type="button" className={styles.collectionCreateSave} onClick={saveNewCollection}>
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.collectionCreateTrigger}
              onClick={() => {
                setNewCollectionDraft(true);
                setNewCollectionNameInput('');
              }}
            >
              <Plus size={16} weight="regular" />
              Create new collection
            </button>
          )}
        </div>
      );

      return [
        {
          id: 'modify',
          label: 'Modify',
          icon: <PencilSimple size={16} />,
          onAction: () => {
            if (asset && contextMenu) {
              setLibraryModify({ asset, position: { ...contextMenu.position } });
              setLibraryModifyPrompt('');
              setContextMenu(null);
              setTimeout(() => libraryModifyInputRef.current?.focus(), 100);
            }
          },
        },
        {
          id: 'add-to-collection',
          label: 'Add to Collection',
          icon: <FolderPlus size={16} weight="regular" />,
          submenu: collectionSubmenu,
          submenuFooter,
          submenuClassName: styles.collectionSubmenuWide,
        },
        ...downloadItems,
      ];
    },
    [
      filteredAssets,
      contextMenu,
      state.userLibraryCollections,
      state.assetCollectionMembership,
      state.likedAssetIds,
      state.hdGeneratingAssetIds,
      state.hdReadyAssetIds,
      newCollectionDraft,
      newCollectionNameInput,
      dispatch,
    ]
  );

  // Lightbox asset mapping
  const lightboxAssets = filteredAssets.map((a) => ({
    id: a.id,
    url: a.url,
    prompt: a.name,
    type: a.type,
    savedToLibrary: true,
  }));

  const actionMenuItems: MenuItem[] = useMemo(() => {
    const isNamedCollection =
      MOCK_LIBRARY_COLLECTIONS.some((c) => c.id === styleFilter) ||
      state.userLibraryCollections.some((c) => c.id === styleFilter);
    return [
      {
        id: 'download-all',
        label: 'Download all',
        icon: <DownloadSimple size={16} />,
        onAction: () => {},
      },
      {
        id: 'edit-style',
        label: isNamedCollection ? 'Edit Collection' : 'Edit style',
        icon: <PencilSimple size={16} />,
        onAction: () => {},
      },
      {
        id: 'delete-style',
        label: isNamedCollection ? 'Delete Collection' : 'Delete style',
        icon: <Trash size={16} />,
        danger: true,
        dividerBefore: true,
        onAction: () => {},
      },
    ];
  }, [styleFilter, state.userLibraryCollections]);

  const openActionMenu = () => {
    const rect = actionMenuTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 200; // matches ContextMenu min-width
      setActionMenuPosition({
        x: rect.right - menuWidth,
        y: rect.bottom + 4,
      });
      setActionMenuOpen(true);
    }
  };

  const submitLibraryModify = () => {
    const prompt = libraryModifyPrompt.trim();
    if (!libraryModify || !prompt) return;
    const { asset } = libraryModify;
    dispatch({
      type: 'OPEN_IMAGINE_FOR_MODIFY',
      payload: {
        asset: {
          id: asset.id,
          url: asset.url,
          prompt: asset.name,
          type: asset.type,
          aspectRatio: asset.aspectRatio,
          savedToLibrary: true,
        },
        modifyPrompt: prompt,
      },
    });
    setLibraryModify(null);
    setLibraryModifyPrompt('');
  };

  return (
    <div className={styles.layout}>
      {/* ── Main Content (collections are in global HistorySidebar) ─────── */}
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.mainHeader}>
          <div ref={searchWrapRef} className={styles.searchWrap}>
            <MagnifyingGlass size={20} weight="regular" className={styles.searchIcon} />
            {selectedProduct && (
              <div className={styles.searchTagsRow}>
                <span className={styles.searchTag}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedProduct.image} alt="" className={styles.searchTagImage} />
                  {selectedProduct.name}
                  <button
                    type="button"
                    className={styles.searchTagRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductFilter('');
                    }}
                    aria-label="Remove product filter"
                  >
                    <X size={10} />
                  </button>
                </span>
              </div>
            )}
            <input
              className={styles.searchInput}
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={handleProductPopoverKeyDown}
            />
          </div>

          {productPopoverOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <MentionPopover
                items={productMentionItems}
                selectedIndex={productPopoverSelectedIndex}
                onSelect={(item) => {
                  setProductFilter(item.id);
                  closeProductPopover();
                }}
                onClose={closeProductPopover}
                position={getProductPopoverPosition()}
                query={search}
                onQueryChange={setSearch}
                showSearch={false}
              />,
              document.body
            )}

          {/* Action menu */}
          <div className={styles.actionMenuWrap}>
            <Button
              ref={actionMenuTriggerRef}
              variant="secondary"
              size="md"
              icon={<DotsThree size={20} />}
              onClick={openActionMenu}
              aria-label="Style actions"
              aria-expanded={actionMenuOpen}
            />
            {typeof document !== 'undefined' &&
              actionMenuOpen &&
              createPortal(
                <AnimatePresence>
                  <ContextMenu
                    items={actionMenuItems}
                    position={actionMenuPosition}
                    onClose={() => setActionMenuOpen(false)}
                  />
                </AnimatePresence>,
                document.body
              )}
          </div>
        </div>

        {/* Asset Grid (most recent at top) */}
        <div className={styles.gridArea}>
          {filteredAssets.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No assets found</p>
            </div>
          ) : (
            <div
              className={styles.masonry}
            >
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={styles.masonryItem}
                  onClick={() => {
                    const idx = filteredAssets.findIndex((a) => a.id === asset.id);
                    if (idx >= 0) setLightboxIndex(idx);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, asset.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className={styles.masonryImage}
                    loading="lazy"
                  />
                  {state.hdGeneratingAssetIds.has(asset.id) && (
                    <span className={styles.hdBadge}>
                      <span className={styles.hdBadgeDot} aria-hidden />
                      HD being generated
                    </span>
                  )}
                  {state.hdReadyAssetIds.has(asset.id) &&
                    !state.hdGeneratingAssetIds.has(asset.id) && (
                      <span className={cn(styles.hdBadge, styles.hdBadgeReady)}>HD</span>
                    )}
                  <div className={styles.masonryOverlay}>
                    <div className={styles.masonryTopRow}>
                      <button
                        className={cn(
                          styles.heartBtn,
                          likedIds.has(asset.id) && styles.heartBtnLiked
                        )}
                        onClick={(e) => toggleLiked(e, asset.id)}
                        aria-label={likedIds.has(asset.id) ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          size={14}
                          weight={likedIds.has(asset.id) ? 'fill' : 'regular'}
                        />
                      </button>
                    </div>
                    <button
                      className={styles.masonryDotsBtn}
                      onClick={(e) => handleDotsClick(e, asset.id)}
                    >
                      <DotsThree size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Context Menu (portaled so it positions next to the trigger) */}
      {typeof document !== 'undefined' &&
        contextMenu &&
        createPortal(
          <AnimatePresence>
            <ContextMenu
              items={getContextItems(contextMenu.assetId)}
              position={contextMenu.position}
              onClose={() => setContextMenu(null)}
            />
          </AnimatePresence>,
          document.body
        )}

      {/* Modify prompt popover (library): enter prompt then switch to image session */}
      {typeof document !== 'undefined' &&
        libraryModify &&
        createPortal(
          <motion.div
            className={styles.modifyPopover}
            style={{
              left: libraryModify.position.x,
              top: libraryModify.position.y,
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.modifyInputRow}>
              <input
                ref={libraryModifyInputRef}
                type="text"
                className={styles.modifyInput}
                value={libraryModifyPrompt}
                onChange={(e) => setLibraryModifyPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitLibraryModify();
                  if (e.key === 'Escape') setLibraryModify(null);
                }}
                placeholder="Describe changes..."
                autoFocus
              />
              <button
                type="button"
                className={styles.modifySubmitBtn}
                onClick={submitLibraryModify}
                disabled={!libraryModifyPrompt.trim()}
                aria-label="Apply and open session"
              >
                <PaperPlaneRight size={16} />
              </button>
            </div>
          </motion.div>,
          document.body
        )}

      {/* Lightbox (portaled so it appears above TopBar and all content) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {lightboxIndex !== null && lightboxAssets.length > 0 && (
              <AssetLightbox
                key="lightbox"
                assets={lightboxAssets}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onModify={() => {}}
                onSaveToLibrary={() => {}}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
