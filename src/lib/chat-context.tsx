'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MOCK_LIBRARY_ASSETS, MOCK_USER } from '@/lib/mock-data';
import { getCollectionIdsForAsset } from '@/lib/library-collections';

// ── Types ──────────────────────────────────────────────────────────────

export type CreativeMode = 'idle' | 'imagine' | 'product' | 'character' | 'create' | 'assistant';
export type ActiveView = 'create' | 'library' | 'manage' | 'settings';
export type OutputType = 'image' | 'video';
export type SettingsPanelType =
  | 'account'
  | 'brand'
  | 'styles'
  | 'products'
  | 'product-styles'
  | 'characters'
  | 'character-locations'
  | null;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tags?: { type: 'product' | 'character'; id: string; name: string }[];
}

export interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
  aspectRatio?: string;
  savedToLibrary: boolean;
  folderIds?: string[];
  /** Product used to generate this asset (Product mode). */
  productId?: string;
  /** Character used to generate this asset (Character mode). */
  characterId?: string;
  /** ISO timestamp when the asset was generated. */
  createdAt?: string;
  /**
   * Short label rendered as a chip on the asset thumbnail.
   * In Market Adaption sessions this is either "Original" (the source asset)
   * or a market label such as "South Africa".
   */
  tag?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: CreativeMode;
  messages: ChatMessage[];
  generatedAssets: GeneratedAsset[];
  createdAt: string;
  /** Shown in history subline (e.g. current user); optional for older persisted sessions. */
  authorName?: string;
  /** Style ID used when session was created (brandStyle for imagine/create, shotStyle for product). */
  styleId?: string;
  /** Aspect ratio used when session was created. */
  aspectRatio?: string;
  /** Marks a session generated via the Library "Swap Product" flow — renders a small swap indicator on the mode badge. */
  isSwapSession?: boolean;
}

export interface ImagineOptions {
  aspectRatio: '16:9' | '1:1' | '4:5';
  outputType: OutputType;
  duration: number;
  brandStyle: string;
}

export interface ProductOptions {
  selectedProducts: { id: string; name: string; image: string }[];
  shotStyle: string;
}

export interface CharacterOptions {
  selectedCharacters: { id: string; name: string; role: string; image: string }[];
  location: string;
}

export interface CreateOptions {
  adFormat: string;
  brandStyle: string;
  /** Selected market region ids (multi-market create). */
  markets: string[];
  /** Library / Explore assets used as source images for multi-market create. */
  sourceAssetIds: string[];
}

export type ManagePanelType = 'styles' | 'products' | 'shots' | 'characters' | null;
export type ManagerModalType = 'imageStyle' | 'products' | 'characters' | null;

export type ManagerModalFormInit =
  | {
      modal: ManagerModalType;
      action: 'create' | 'edit';
      tab?: 'products' | 'styles' | 'characters' | 'locations';
      item?: unknown;
    }
  | null;

export interface ChatState {
  activeView: ActiveView;
  mode: CreativeMode;
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  canvasOpen: boolean;
  historyOpen: boolean;
  activeManagePanel: ManagePanelType;
  activeManagerModal: ManagerModalType;
  /** When set, the opened modal shows the form overlay immediately (from ManageListView). */
  managerModalFormInit: ManagerModalFormInit;
  imagineOptions: ImagineOptions;
  productOptions: ProductOptions;
  characterOptions: CharacterOptions;
  createOptions: CreateOptions;
  /** When set, EditCanvas opens modify popover for the single asset with this prompt (from library Modify). */
  pendingModifyPrompt: string | null;
  /** Landing intro chips: inject full prompt into ChatInput PromptEditor, then cleared by ChatInput. */
  pendingPromptDraft: string | null;
  /** Active library collection (style id). Used when activeView is 'library'. */
  activeLibraryCollection: string;
  /** Asset IDs that are liked (in library). */
  likedAssetIds: Set<string>;
  /** User-created library collections (sidebar + Add to Collection). */
  userLibraryCollections: { id: string; name: string }[];
  /** Per-asset list of collection IDs (overrides mock `libraryCollectionId` when set). */
  assetCollectionMembership: Record<string, string[]>;
  /** Session IDs with in-flight image generation (supports parallel sessions). */
  generatingSessionIds: Set<string>;
  /** Session IDs with in-flight modify (single new image). */
  modifyingSessionIds: Set<string>;
  /** Session IDs that completed generation but user hasn't opened them yet (green dot). */
  unseenCompletedSessionIds: Set<string>;
  /** Library assets currently generating HD upscale. */
  hdGeneratingAssetIds: Set<string>;
  /** Library assets with HD version available. */
  hdReadyAssetIds: Set<string>;
  /** Which settings panel is active when activeView is 'settings'. */
  activeSettingsPanel: SettingsPanelType;
  /** View to restore when closing settings (create or library). */
  viewBeforeSettings: 'create' | 'library';
}

// ── Actions ────────────────────────────────────────────────────────────

type ChatAction =
  | { type: 'SET_ACTIVE_VIEW'; payload: ActiveView }
  | { type: 'SET_MODE'; payload: CreativeMode }
  /** Optional `sessionId` when creating a new session (keeps client timers aligned with the session row). */
  | { type: 'SEND_MESSAGE'; payload: ChatMessage; sessionId?: string; isSwapSession?: boolean }
  | { type: 'ADD_ASSISTANT_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_GENERATED_ASSET'; payload: GeneratedAsset; sessionId?: string }
  | { type: 'SAVE_ASSET_TO_LIBRARY'; payload: { assetId: string; folderId: string } }
  | { type: 'UNSAVE_ASSET'; payload: string }
  | { type: 'REMOVE_ASSET_FROM_FOLDER'; payload: { assetId: string; folderId: string } }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'SET_CANVAS_OPEN'; payload: boolean }
  | { type: 'SET_HISTORY_OPEN'; payload: boolean }
  | { type: 'NEW_CHAT'; nextMode?: CreativeMode }
  | { type: 'LOAD_SESSION'; payload: string }
  | { type: 'SET_IMAGINE_OPTIONS'; payload: Partial<ImagineOptions> }
  | { type: 'SET_PRODUCT_OPTIONS'; payload: Partial<ProductOptions> }
  | { type: 'SET_CHARACTER_OPTIONS'; payload: Partial<CharacterOptions> }
  | { type: 'SET_CREATE_OPTIONS'; payload: Partial<CreateOptions> }
  | { type: 'LOAD_SESSIONS'; payload: ChatSession[] }
  | { type: 'EXIT_MODE' }
  | { type: 'OPEN_IMAGINE_FOR_MODIFY'; payload: { asset: GeneratedAsset; modifyPrompt?: string } }
  | { type: 'CLEAR_PENDING_MODIFY' }
  | { type: 'SET_PROMPT_DRAFT'; payload: string }
  | { type: 'CLEAR_PROMPT_DRAFT' }
  | { type: 'SET_MANAGE_PANEL'; payload: ManagePanelType }
  | { type: 'SET_MANAGER_MODAL'; payload: ManagerModalType }
  | { type: 'SET_MANAGER_MODAL_FORM_INIT'; payload: ManagerModalFormInit }
  | { type: 'SET_GENERATING_IMAGES'; payload: { active: boolean; sessionId?: string } }
  | { type: 'SET_MODIFYING_IMAGE'; payload: { active: boolean; sessionId?: string } }
  | { type: 'SET_ACTIVE_LIBRARY_COLLECTION'; payload: string }
  | { type: 'TOGGLE_LIKED_ASSET'; payload: string }
  | {
      type: 'ADD_USER_LIBRARY_COLLECTION';
      payload: { name: string; assetIdToAdd?: string };
    }
  | { type: 'TOGGLE_ASSET_LIBRARY_COLLECTION'; payload: { assetId: string; collectionId: string } }
  | { type: 'START_HD_GENERATION'; payload: string }
  | { type: 'COMPLETE_HD_GENERATION'; payload: string }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'CLEAR_ALL_SESSIONS' }
  | { type: 'SET_SETTINGS_PANEL'; payload: SettingsPanelType }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_SETTINGS' };

// ── Initial State ──────────────────────────────────────────────────────

const initialState: ChatState = {
  activeView: 'create',
  mode: 'idle',
  currentSession: null,
  sessions: [],
  canvasOpen: false,
  historyOpen: false,
  activeManagePanel: null,
  activeManagerModal: null,
  managerModalFormInit: null,
  imagineOptions: {
    aspectRatio: '16:9',
    outputType: 'image',
    duration: 5,
    brandStyle: 'style-1',
  },
  productOptions: {
    selectedProducts: [],
    shotStyle: 'pstyle-1',
  },
  characterOptions: {
    selectedCharacters: [],
    location: 'cloc-1',
  },
  createOptions: {
    adFormat: '',
    brandStyle: 'style-1',
    markets: [],
    sourceAssetIds: [],
  },
  pendingModifyPrompt: null,
  pendingPromptDraft: null,
  activeLibraryCollection: '',
  likedAssetIds: new Set(MOCK_LIBRARY_ASSETS.filter((a) => a.liked).map((a) => a.id)),
  userLibraryCollections: [],
  assetCollectionMembership: {},
  generatingSessionIds: new Set(),
  modifyingSessionIds: new Set(),
  unseenCompletedSessionIds: new Set(),
  hdGeneratingAssetIds: new Set(),
  hdReadyAssetIds: new Set(),
  activeSettingsPanel: null,
  viewBeforeSettings: 'create',
};

// ── Helpers ────────────────────────────────────────────────────────────

function createSession(
  mode: CreativeMode,
  styleId?: string,
  aspectRatio?: string
): ChatSession {
  return {
    id: `session-${Date.now()}`,
    title: 'New conversation',
    mode,
    messages: [],
    generatedAssets: [],
    createdAt: new Date().toISOString(),
    authorName: MOCK_USER.name,
    styleId,
    aspectRatio,
  };
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New conversation';
  const text = firstUserMsg.content;
  return text.length > 50 ? text.slice(0, 50) + '...' : text;
}

// ── Reducer ────────────────────────────────────────────────────────────

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };

    case 'OPEN_SETTINGS': {
      const from = state.activeView === 'library' ? 'library' : 'create';
      return {
        ...state,
        activeView: 'settings',
        activeSettingsPanel: 'account',
        viewBeforeSettings: from,
      };
    }

    case 'CLOSE_SETTINGS':
      return {
        ...state,
        activeView: state.viewBeforeSettings,
        activeSettingsPanel: null,
      };

    case 'SET_ACTIVE_LIBRARY_COLLECTION':
      return { ...state, activeLibraryCollection: action.payload };

    case 'TOGGLE_LIKED_ASSET': {
      const id = action.payload;
      const next = new Set(state.likedAssetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...state, likedAssetIds: next };
    }

    case 'ADD_USER_LIBRARY_COLLECTION': {
      const newId = `collection-user-${Date.now()}`;
      const { name, assetIdToAdd } = action.payload;
      let nextMembership = { ...state.assetCollectionMembership };
      if (assetIdToAdd) {
        const current = getCollectionIdsForAsset(assetIdToAdd, nextMembership);
        nextMembership = {
          ...nextMembership,
          [assetIdToAdd]: [...current, newId],
        };
      }
      return {
        ...state,
        userLibraryCollections: [
          ...state.userLibraryCollections,
          { id: newId, name },
        ],
        assetCollectionMembership: nextMembership,
      };
    }

    case 'TOGGLE_ASSET_LIBRARY_COLLECTION': {
      const { assetId, collectionId } = action.payload;
      const current = getCollectionIdsForAsset(assetId, state.assetCollectionMembership);
      const nextIds = current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId];
      return {
        ...state,
        assetCollectionMembership: {
          ...state.assetCollectionMembership,
          [assetId]: nextIds,
        },
      };
    }

    case 'START_HD_GENERATION': {
      const assetId = action.payload;
      const nextGen = new Set(state.hdGeneratingAssetIds);
      nextGen.add(assetId);
      return { ...state, hdGeneratingAssetIds: nextGen };
    }

    case 'COMPLETE_HD_GENERATION': {
      const assetId = action.payload;
      const nextGen = new Set(state.hdGeneratingAssetIds);
      nextGen.delete(assetId);
      const nextReady = new Set(state.hdReadyAssetIds);
      nextReady.add(assetId);
      return {
        ...state,
        hdGeneratingAssetIds: nextGen,
        hdReadyAssetIds: nextReady,
      };
    }

    case 'DELETE_SESSION': {
      const id = action.payload;
      const updatedSessions = state.sessions.filter((s) => s.id !== id);
      const wasCurrent = state.currentSession?.id === id;
      const nextUnseen = new Set(state.unseenCompletedSessionIds);
      nextUnseen.delete(id);
      const nextGenerating = new Set(state.generatingSessionIds);
      nextGenerating.delete(id);
      const nextModifying = new Set(state.modifyingSessionIds);
      nextModifying.delete(id);
      return {
        ...state,
        sessions: updatedSessions,
        currentSession: wasCurrent ? null : state.currentSession,
        unseenCompletedSessionIds: nextUnseen,
        generatingSessionIds: nextGenerating,
        modifyingSessionIds: nextModifying,
      };
    }

    case 'CLEAR_ALL_SESSIONS':
      return {
        ...state,
        sessions: [],
        currentSession: null,
        generatingSessionIds: new Set(),
        modifyingSessionIds: new Set(),
      };

    case 'SET_MODE': {
      const newMode = action.payload;
      // When going back to idle, close the canvas too
      if (newMode === 'idle') {
        return {
          ...state,
          mode: 'idle',
          canvasOpen: false,
          pendingPromptDraft: null,
        };
      }
      return { ...state, mode: newMode, pendingPromptDraft: null };
    }

    case 'EXIT_MODE': {
      // Full reset: go back to landing state, clear current session.
      // Use the session's mode so the correct tab is active (Imagine → Imagine, Chat → Chat).
      // Keep generatingSessionIds so sidebar still shows loading state
      // when user closes session while generation runs; green dot appears when it finishes.
      const exitMode = state.currentSession?.mode ?? 'imagine';
      const exitSid = state.currentSession?.id;
      const nextModifying = new Set(state.modifyingSessionIds);
      if (exitSid) nextModifying.delete(exitSid);
      return {
        ...state,
        mode: exitMode,
        currentSession: null,
        canvasOpen: false,
        pendingModifyPrompt: null,
        pendingPromptDraft: null,
        imagineOptions: initialState.imagineOptions,
        productOptions: initialState.productOptions,
        characterOptions: initialState.characterOptions,
        createOptions: initialState.createOptions,
        modifyingSessionIds: nextModifying,
      };
    }

    case 'SEND_MESSAGE': {
      let session = state.currentSession;
      // When the caller passes an explicit sessionId, route to that session
      // (existing one in state.sessions or a brand-new one). Lets flows like
      // Market Adaption create multiple sessions back-to-back without each
      // dispatch falling back to state.currentSession.
      if (action.sessionId && session?.id !== action.sessionId) {
        session = state.sessions.find((s) => s.id === action.sessionId) ?? null;
      }
      if (!session) {
        const styleId =
          state.mode === 'imagine' || state.mode === 'create'
            ? state.imagineOptions.brandStyle
            : state.mode === 'product'
              ? state.productOptions.shotStyle
              : undefined;
        const aspectRatio =
          state.mode === 'imagine' ||
          state.mode === 'product' ||
          state.mode === 'character' ||
          state.mode === 'create'
            ? state.imagineOptions.aspectRatio
            : undefined;
        let created = createSession(state.mode, styleId, aspectRatio);
        if (action.sessionId) {
          created = { ...created, id: action.sessionId };
        }
        if (action.isSwapSession) {
          created = { ...created, isSwapSession: true };
        }
        session = created;
      }
      const updatedMessages = [...session.messages, action.payload];
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        title: generateTitle(updatedMessages),
        mode: state.mode,
      };
      // Update session in history
      const sessionExists = state.sessions.some((s) => s.id === updatedSession.id);
      const updatedSessions = sessionExists
        ? state.sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        : [updatedSession, ...state.sessions];
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'ADD_ASSISTANT_MESSAGE': {
      if (!state.currentSession) return state;
      const updatedMessages = [...state.currentSession.messages, action.payload];
      const updatedSession = { ...state.currentSession, messages: updatedMessages };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'ADD_GENERATED_ASSET': {
      // Prefer explicit sessionId (e.g. from async simulation) so assets attach to the
      // correct session when the user has switched away.
      const onlyGeneratingSessionId =
        state.generatingSessionIds.size === 1
          ? state.generatingSessionIds.values().next().value
          : undefined;
      const targetId =
        action.sessionId ?? onlyGeneratingSessionId ?? state.currentSession?.id;
      if (!targetId) return state;
      const baseSession = state.sessions.find((s) => s.id === targetId);
      if (!baseSession) return state;

      const updatedAssets = [action.payload, ...baseSession.generatedAssets];
      const updatedSession = {
        ...baseSession,
        generatedAssets: updatedAssets,
        aspectRatio: baseSession.aspectRatio ?? action.payload.aspectRatio,
      };
      const updatedSessions = state.sessions.map((s) =>
        s.id === targetId ? updatedSession : s
      );
      const viewingTarget = state.currentSession?.id === targetId;
      return {
        ...state,
        currentSession: viewingTarget ? updatedSession : state.currentSession,
        sessions: updatedSessions,
        canvasOpen: viewingTarget ? true : state.canvasOpen,
      };
    }

    case 'SAVE_ASSET_TO_LIBRARY': {
      if (!state.currentSession) return state;
      const { assetId, folderId } = action.payload;
      const updatedAssets = state.currentSession.generatedAssets.map((a) => {
        if (a.id !== assetId) return a;
        const existing = a.folderIds ?? [];
        return {
          ...a,
          savedToLibrary: true,
          folderIds: existing.includes(folderId) ? existing : [...existing, folderId],
        };
      });
      const updatedSession = { ...state.currentSession, generatedAssets: updatedAssets };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'UNSAVE_ASSET': {
      if (!state.currentSession) return state;
      const assetId = action.payload;
      const updatedAssets = state.currentSession.generatedAssets.map((a) =>
        a.id === assetId ? { ...a, savedToLibrary: false, folderIds: [] } : a
      );
      const updatedSession = { ...state.currentSession, generatedAssets: updatedAssets };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'REMOVE_ASSET_FROM_FOLDER': {
      if (!state.currentSession) return state;
      const { assetId, folderId } = action.payload;
      const updatedAssets = state.currentSession.generatedAssets.map((a) => {
        if (a.id !== assetId) return a;
        const updated = (a.folderIds ?? []).filter((id) => id !== folderId);
        return { ...a, folderIds: updated, savedToLibrary: updated.length > 0 || a.savedToLibrary };
      });
      const updatedSession = { ...state.currentSession, generatedAssets: updatedAssets };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'DELETE_ASSET': {
      if (!state.currentSession) return state;
      const updatedAssets = state.currentSession.generatedAssets.filter(
        (a) => a.id !== action.payload
      );
      const updatedSession = { ...state.currentSession, generatedAssets: updatedAssets };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
      };
    }

    case 'SET_CANVAS_OPEN':
      return { ...state, canvasOpen: action.payload };

    case 'SET_HISTORY_OPEN':
      return { ...state, historyOpen: action.payload };

    case 'NEW_CHAT': {
      const nextMode = action.nextMode ?? 'idle';
      return {
        ...state,
        currentSession: null,
        mode: nextMode,
        canvasOpen: false,
        pendingModifyPrompt: null,
        pendingPromptDraft: null,
        imagineOptions: initialState.imagineOptions,
        productOptions: initialState.productOptions,
        characterOptions: initialState.characterOptions,
        createOptions: initialState.createOptions,
      };
    }

    case 'LOAD_SESSION': {
      const session = state.sessions.find((s) => s.id === action.payload);
      if (!session) return state;
      const nextUnseen = new Set(state.unseenCompletedSessionIds);
      nextUnseen.delete(action.payload);
      return {
        ...state,
        currentSession: session,
        mode: session.mode,
        canvasOpen: session.generatedAssets.length > 0,
        historyOpen: false,
        unseenCompletedSessionIds: nextUnseen,
      };
    }

    case 'SET_IMAGINE_OPTIONS':
      return { ...state, imagineOptions: { ...state.imagineOptions, ...action.payload } };

    case 'SET_PRODUCT_OPTIONS':
      return { ...state, productOptions: { ...state.productOptions, ...action.payload } };

    case 'SET_CHARACTER_OPTIONS':
      return { ...state, characterOptions: { ...state.characterOptions, ...action.payload } };

    case 'SET_CREATE_OPTIONS':
      return { ...state, createOptions: { ...state.createOptions, ...action.payload } };

    case 'LOAD_SESSIONS':
      return { ...state, sessions: action.payload };

    case 'OPEN_IMAGINE_FOR_MODIFY': {
      const { asset, modifyPrompt } =
        'asset' in action.payload
          ? action.payload as { asset: GeneratedAsset; modifyPrompt?: string }
          : { asset: action.payload as GeneratedAsset, modifyPrompt: undefined };
      const session: ChatSession = {
        id: `session-modify-${Date.now()}`,
        title: 'Modify image',
        mode: 'imagine',
        messages: [],
        generatedAssets: [asset],
        createdAt: new Date().toISOString(),
        authorName: MOCK_USER.name,
        styleId: state.imagineOptions.brandStyle,
        aspectRatio: asset.aspectRatio ?? state.imagineOptions.aspectRatio,
      };
      const updatedSessions = [session, ...state.sessions];
      return {
        ...state,
        activeView: 'create',
        mode: 'imagine',
        currentSession: session,
        sessions: updatedSessions,
        canvasOpen: true,
        pendingModifyPrompt: modifyPrompt ?? null,
      };
    }

    case 'CLEAR_PENDING_MODIFY':
      return { ...state, pendingModifyPrompt: null };

    case 'SET_PROMPT_DRAFT':
      return { ...state, pendingPromptDraft: action.payload };

    case 'CLEAR_PROMPT_DRAFT':
      return { ...state, pendingPromptDraft: null };

    case 'SET_MANAGE_PANEL':
      return { ...state, activeManagePanel: action.payload };

    case 'SET_SETTINGS_PANEL':
      return { ...state, activeSettingsPanel: action.payload };

    case 'SET_MANAGER_MODAL':
      return { ...state, activeManagerModal: action.payload };

    case 'SET_MANAGER_MODAL_FORM_INIT':
      return { ...state, managerModalFormInit: action.payload };

    case 'SET_GENERATING_IMAGES': {
      const { active, sessionId: payloadSessionId } = action.payload;
      const sid = payloadSessionId ?? state.currentSession?.id;
      if (!sid) return state;

      if (active) {
        const next = new Set(state.generatingSessionIds);
        next.add(sid);
        return { ...state, generatingSessionIds: next };
      }

      const next = new Set(state.generatingSessionIds);
      next.delete(sid);
      const nextUnseen = new Set(state.unseenCompletedSessionIds);
      if (sid !== state.currentSession?.id) {
        nextUnseen.add(sid);
      }
      return {
        ...state,
        generatingSessionIds: next,
        unseenCompletedSessionIds: nextUnseen,
      };
    }

    case 'SET_MODIFYING_IMAGE': {
      const { active, sessionId: payloadSessionId } = action.payload;
      const sid = payloadSessionId ?? state.currentSession?.id;
      if (!sid) return state;

      const next = new Set(state.modifyingSessionIds);
      if (active) next.add(sid);
      else next.delete(sid);
      return { ...state, modifyingSessionIds: next };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────

interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
}

const ChatContext = createContext<ChatContextValue>({
  state: initialState,
  dispatch: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const pathname = usePathname();

  // Sync activeView with URL
  useEffect(() => {
    if (pathname === '/library') {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'library' });
    } else if (pathname === '/') {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create' });
    } else if (pathname === '/manage' || pathname?.startsWith('/manage/')) {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' });
    }
  }, [pathname]);

  // Load sessions from localStorage on mount, or use example sessions when empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem('open-wonder-chat-sessions');
      if (raw) {
        const sessions = JSON.parse(raw) as ChatSession[];
        dispatch({ type: 'LOAD_SESSIONS', payload: sessions });
      } else {
        const IMAGINE_TITLES = [
          'A woman holding a baby standing inside a kitchen',
          'Minimalist product shot on marble surface',
          'Cozy interior with warm lighting and plants',
          'Futuristic cityscape at sunset with neon lights',
          'Abstract geometric patterns in purple and gold',
          'Portrait of a character in retro-futuristic style',
          'Aerial view of a tropical island with turquoise water',
          'Organic shapes flowing like liquid metal',
          'Dramatic mountain landscape with storm clouds',
          'Fashion editorial with vibrant color blocking',
          'Underwater scene with bioluminescent creatures',
          'Urban street photography in black and white',
          'Surreal floating objects in a dream-like space',
          'Vintage car on a coastal road at golden hour',
          'Minimalist Scandinavian living room design',
        ];
        const PRODUCT_TITLES = [
          'Wireless headphones on gradient background',
          'Skincare bottle with botanical elements',
          'Sneakers on reflective surface',
          'Coffee bag with minimalist typography',
          'Smartwatch lifestyle shot outdoors',
          'Perfume bottle with soft shadows',
          'Laptop with productivity setup',
          'Water bottle in gym environment',
          'Watch on wooden texture',
          'Headphones floating in dark space',
          'Cosmetic compact with mirror reflection',
          'Sunglasses on beach sand',
          'Backpack in urban setting',
          'Bottle of craft beer with hops',
          'Smartphone with app interface',
        ];
        const CHARACTER_TITLES = [
          'Sarah in a modern office environment',
          'Marcus at a coffee shop with laptop',
          'Elena in a garden with flowers',
          'Karen in professional headshot style',
          'Michael in casual outdoor setting',
          'James in studio portrait lighting',
          'Testimonial scene with product',
          'Character in kitchen cooking',
          'Portrait with soft natural light',
          'Group of friends at a cafe',
          'Business professional in meeting',
          'Creative in art studio',
          'Athlete in motion outdoors',
          'Chef in restaurant kitchen',
          'Designer at drafting table',
        ];
        const CREATE_TITLES = [
          'Instagram story ad for summer campaign',
          'Facebook feed post with CTA',
          'LinkedIn banner for B2B',
          'YouTube thumbnail with bold text',
          'Pinterest pin for recipe',
          'Twitter card for product launch',
          'TikTok style vertical ad',
          'Newsletter header design',
          'Email signature banner',
          'Web banner 728x90',
          'Display ad 300x250',
          'Carousel ad first slide',
          'Stories format with swipe up',
          'Reels style short video',
          'Podcast cover art design',
        ];
        const ASSISTANT_TITLES = [
          'What are our brand guidelines for imagery?',
          'Help me understand the tone of voice',
          'Which colors can I use for campaigns?',
          'Summarize our content strategy',
          'What fonts are approved for headlines?',
          'Explain our target audience',
          'Brand voice for social media',
          'Guidelines for product photography',
          'How to use our logo correctly',
          'Content calendar best practices',
          'Competitor analysis request',
          'Campaign performance metrics',
          'Asset organization tips',
          'Creative brief template',
          'Brand consistency checklist',
        ];
        const modes: CreativeMode[] = ['imagine', 'product', 'character', 'create', 'assistant'];
        const titlesByMode: Record<CreativeMode, string[]> = {
          imagine: IMAGINE_TITLES,
          product: PRODUCT_TITLES,
          character: CHARACTER_TITLES,
          create: CREATE_TITLES,
          assistant: ASSISTANT_TITLES,
          idle: [],
        };
        const styleIds = ['style-1', 'style-2', 'style-3', 'style-4'];
        const aspectRatios = ['16:9', '1:1', '4:5'] as const;
        const exampleSessions: ChatSession[] = [];
        let sessionIdx = 0;
        for (const mode of modes) {
          const titles = titlesByMode[mode];
          for (let i = 0; i < titles.length; i++) {
            const styleId = mode === 'product' ? 'pstyle-1' : styleIds[i % styleIds.length];
            exampleSessions.push({
              id: `session-example-${sessionIdx + 1}`,
              title: titles[i],
              mode,
              messages: [],
              generatedAssets: [],
              createdAt: new Date(Date.now() - (sessionIdx + 1) * 3600000).toISOString(),
              authorName: MOCK_USER.name,
              styleId: mode === 'assistant' ? undefined : styleId,
              aspectRatio: mode === 'assistant' ? undefined : aspectRatios[i % aspectRatios.length],
            });
            sessionIdx++;
          }
        }
        dispatch({ type: 'LOAD_SESSIONS', payload: exampleSessions });
      }
    } catch {
      // noop
    }
  }, []);

  // Persist sessions to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('open-wonder-chat-sessions', JSON.stringify(state.sessions));
    } catch {
      // noop
    }
  }, [state.sessions]);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
