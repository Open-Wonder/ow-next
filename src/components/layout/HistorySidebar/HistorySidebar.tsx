'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Trash,
  CaretLeft,
  GearSix,
  Palette,
  Swatches,
  Package,
  UserCircle,
  MapPin,
} from '@phosphor-icons/react';
import cn from 'classnames';
import { useChat, CreativeMode, ChatSession, SettingsPanelType } from '@/lib/chat-context';
import {
  MOCK_BRAND_STYLES,
  MOCK_IMAGE_STYLES,
  MOCK_PRODUCT_STYLES,
  MOCK_LIBRARY_ASSETS,
} from '@/lib/mock-data';
import { useIsAdmin } from '@/lib/permissions';
import BrandSwitcher from '@/components/layout/BrandSwitcher/BrandSwitcher';
import SidebarUserSection from '@/components/layout/SidebarUserSection/SidebarUserSection';
import styles from './HistorySidebar.module.css';

interface SettingsNavItem {
  id: SettingsPanelType;
  label: string;
  icon: React.ElementType;
  indent?: boolean;
}

interface SettingsSection {
  heading: string;
  adminOnly?: boolean;
  items: SettingsNavItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    heading: 'Account',
    items: [
      { id: 'account', label: 'User Settings', icon: GearSix },
    ],
  },
  {
    heading: 'Brand',
    items: [
      { id: 'brand', label: 'Brand Settings', icon: Palette },
    ],
  },
  {
    heading: 'Content Management',
    adminOnly: true,
    items: [
      { id: 'styles', label: 'Image Styles', icon: Swatches },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'product-styles', label: 'Product Styles', icon: Package, indent: true },
      { id: 'characters', label: 'Characters', icon: UserCircle },
      { id: 'character-locations', label: 'Locations', icon: MapPin, indent: true },
    ],
  },
];

const MODE_LABELS: Record<CreativeMode, string> = {
  idle: 'General',
  imagine: 'Imagine',
  product: 'Product',
  character: 'Character',
  create: 'Create',
  assistant: 'Chat',
};

function getStyleName(session: ChatSession): string | null {
  if (!session.styleId) return null;
  const imageStyle = MOCK_IMAGE_STYLES.find((s) => s.id === session.styleId);
  if (imageStyle) return imageStyle.name;
  const productStyle = MOCK_PRODUCT_STYLES.find((s) => s.id === session.styleId);
  if (productStyle) return productStyle.name;
  return null;
}

function getAspectRatio(session: ChatSession): string | null {
  return (
    session.aspectRatio ??
    session.generatedAssets[0]?.aspectRatio ??
    null
  );
}

export default function HistorySidebar() {
  const router = useRouter();
  const { state, dispatch } = useChat();
  const isAdmin = useIsAdmin();

  // Default to first image style when switching to library
  useEffect(() => {
    if (
      state.activeView === 'library' &&
      !state.activeLibraryCollection &&
      MOCK_IMAGE_STYLES[0]
    ) {
      dispatch({
        type: 'SET_ACTIVE_LIBRARY_COLLECTION',
        payload: MOCK_IMAGE_STYLES[0].id,
      });
    }
  }, [state.activeView, state.activeLibraryCollection, dispatch]);

  const handleLoadSession = (id: string) => {
    dispatch({ type: 'LOAD_SESSION', payload: id });
  };

  const handleCollectionSelect = (styleId: string) => {
    dispatch({ type: 'SET_ACTIVE_LIBRARY_COLLECTION', payload: styleId });
  };

  const filteredSessions =
    state.mode === 'idle'
      ? state.sessions
      : state.sessions.filter((s) => s.mode === state.mode);

  const emptyMessage =
    state.mode === 'idle'
      ? 'No previous conversations'
      : `No ${MODE_LABELS[state.mode].toLowerCase()} conversations yet`;

  // Collection counts (liked assets per style)
  const collectionCounts = Object.fromEntries(
    [...MOCK_IMAGE_STYLES, ...MOCK_PRODUCT_STYLES].map((s) => [s.id, 0])
  );
  for (const asset of MOCK_LIBRARY_ASSETS) {
    if (!state.likedAssetIds.has(asset.id)) continue;
    if (asset.styleId === 'style-3' && 'productStyleId' in asset) {
      const id = asset.productStyleId as string;
      collectionCounts[id] = (collectionCounts[id] ?? 0) + 1;
    } else if (asset.styleId) {
      collectionCounts[asset.styleId] =
        (collectionCounts[asset.styleId] ?? 0) + 1;
    }
  }

  const imageStyles = MOCK_BRAND_STYLES.filter((s) => s.isImageStyle !== false);
  const productStyles = MOCK_PRODUCT_STYLES.slice(0, 3);

  const showCollections = state.activeView === 'library';
  const showHistory = state.activeView === 'create';
  const showSettings = state.activeView === 'settings';

  const handleSettingsNav = (panel: SettingsPanelType) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' });
    dispatch({ type: 'SET_SETTINGS_PANEL', payload: panel });
  };

  const handleBackFromSettings = () => {
    const targetView = state.viewBeforeSettings;
    dispatch({ type: 'CLOSE_SETTINGS' });
    router.push(targetView === 'library' ? '/library' : '/');
  };

  const slideTransition = {
    type: 'tween',
    ease: [0.25, 0.1, 0.25, 1],
    x: { duration: 0.22 },
    opacity: { duration: 0.06 },
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandSection}>
        <BrandSwitcher collapsed={false} />
      </div>

      {showCollections && (
        <div className={styles.list}>
          <div className={styles.collectionSection}>
            {imageStyles.map((style) => (
              <button
                key={style.id}
                className={cn(
                  styles.collectionItem,
                  state.activeLibraryCollection === style.id &&
                    styles.collectionItemActive
                )}
                onClick={() => handleCollectionSelect(style.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={style.image} alt="" className={styles.collectionThumb} />
                <span className={styles.collectionLabel}>{style.name}</span>
                <span className={styles.collectionCount}>
                  {collectionCounts[style.id] ?? 0}
                </span>
              </button>
            ))}
            {productStyles.map((style) => (
              <button
                key={style.id}
                className={cn(
                  styles.collectionItem,
                  state.activeLibraryCollection === style.id &&
                    styles.collectionItemActive
                )}
                onClick={() => handleCollectionSelect(style.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={style.image} alt="" className={styles.collectionThumb} />
                <span className={styles.collectionLabel}>{style.name}</span>
                <span className={styles.collectionCount}>
                  {collectionCounts[style.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showCollections && (
        <div className={styles.listSlideWrapper}>
          <AnimatePresence initial={false}>
            {showHistory && (
              <motion.div
                key="history"
                className={styles.listSlide}
                initial={{ x: '60%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '60%', opacity: 0 }}
                transition={slideTransition}
              >
                <div className={styles.list}>
                  <h3 className={cn(styles.listHeading, styles.listHeadingTop)}>
                    {state.mode === 'assistant' ? 'Chat History' : 'Creation History'}
                  </h3>
                  {filteredSessions.length === 0 ? (
                    <p className={styles.empty}>{emptyMessage}</p>
                  ) : (
                    filteredSessions.map((session) => {
                      const isGenerating = state.generatingSessionId === session.id;
                      const isUnseenCompleted = state.unseenCompletedSessionIds.has(session.id);
                      const styleName = getStyleName(session);
                      const aspectRatio = getAspectRatio(session);
                      const meta = [styleName ?? '—', aspectRatio ?? '—'].join(' · ');
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            styles.sessionItem,
                            state.currentSession?.id === session.id &&
                              styles.sessionItemActive
                          )}
                        >
                          <button
                            type="button"
                            className={styles.sessionContent}
                            onClick={() => handleLoadSession(session.id)}
                          >
                            {isUnseenCompleted && (
                              <span className={styles.completedDot} aria-hidden />
                            )}
                            <span className={styles.sessionTextBlock}>
                              <span className={styles.sessionTitle}>{session.title}</span>
                              {session.mode !== 'assistant' &&
                                (isGenerating ? (
                                  <span className={styles.generatingIndicator}>
                                    <span className={styles.pulsingDot} aria-hidden />
                                    Generating images...
                                  </span>
                                ) : (
                                  <span className={styles.sessionMeta}>{meta}</span>
                                ))}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'DELETE_SESSION', payload: session.id });
                            }}
                            aria-label="Delete session"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {showSettings && (
              <motion.div
                key="settings"
                className={styles.listSlide}
                initial={{ x: '-60%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-60%', opacity: 0 }}
                transition={slideTransition}
              >
                <div className={styles.list}>
                  <button
                    type="button"
                    className={styles.settingsBackBtn}
                    onClick={handleBackFromSettings}
                    aria-label="Back"
                  >
                    <CaretLeft size={20} weight="regular" className={styles.settingsBackIcon} />
                    <span className={styles.settingsBackLabel}>Settings</span>
                  </button>

                  {SETTINGS_SECTIONS.map((section) => {
                    if (section.adminOnly && !isAdmin) return null;
                    return (
                      <div key={section.heading} className={styles.settingsSection}>
                        <h3 className={styles.listHeading}>{section.heading}</h3>
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = state.activeSettingsPanel === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={cn(
                                styles.settingsItem,
                                isActive && styles.settingsItemActive,
                                item.indent && styles.settingsItemIndent
                              )}
                              onClick={() => handleSettingsNav(item.id)}
                            >
                              {!item.indent && <Icon size={20} />}
                              <span className={styles.settingsLabel}>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <SidebarUserSection hideSettingsButton={showSettings} />
    </aside>
  );
}
