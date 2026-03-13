'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MOCK_LIBRARY_ASSETS } from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────────

export type CreativeMode = 'idle' | 'imagine' | 'product' | 'character' | 'create' | 'assistant';
export type ActiveView = 'create' | 'library' | 'manage';
export type OutputType = 'image' | 'video';

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
}

export interface ChatSession {
  id: string;
  title: string;
  mode: CreativeMode;
  messages: ChatMessage[];
  generatedAssets: GeneratedAsset[];
  createdAt: string;
  /** Style ID used when session was created (brandStyle for imagine/create, shotStyle for product). */
  styleId?: string;
  /** Aspect ratio used when session was created. */
  aspectRatio?: string;
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
  isGeneratingImages: boolean;
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
  /** Active library collection (style id). Used when activeView is 'library'. */
  activeLibraryCollection: string;
  /** Asset IDs that are liked (in library). */
  likedAssetIds: Set<string>;
  /** Session ID currently generating images. */
  generatingSessionId: string | null;
  /** Session IDs that completed generation but user hasn't opened them yet (green dot). */
  unseenCompletedSessionIds: Set<string>;
}

// ── Actions ────────────────────────────────────────────────────────────

type ChatAction =
  | { type: 'SET_ACTIVE_VIEW'; payload: ActiveView }
  | { type: 'SET_MODE'; payload: CreativeMode }
  | { type: 'SEND_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_ASSISTANT_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_GENERATED_ASSET'; payload: GeneratedAsset }
  | { type: 'SAVE_ASSET_TO_LIBRARY'; payload: { assetId: string; folderId: string } }
  | { type: 'UNSAVE_ASSET'; payload: string }
  | { type: 'REMOVE_ASSET_FROM_FOLDER'; payload: { assetId: string; folderId: string } }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'SET_CANVAS_OPEN'; payload: boolean }
  | { type: 'SET_HISTORY_OPEN'; payload: boolean }
  | { type: 'NEW_CHAT' }
  | { type: 'LOAD_SESSION'; payload: string }
  | { type: 'SET_IMAGINE_OPTIONS'; payload: Partial<ImagineOptions> }
  | { type: 'SET_PRODUCT_OPTIONS'; payload: Partial<ProductOptions> }
  | { type: 'SET_CHARACTER_OPTIONS'; payload: Partial<CharacterOptions> }
  | { type: 'SET_CREATE_OPTIONS'; payload: Partial<CreateOptions> }
  | { type: 'LOAD_SESSIONS'; payload: ChatSession[] }
  | { type: 'EXIT_MODE' }
  | { type: 'OPEN_IMAGINE_FOR_MODIFY'; payload: { asset: GeneratedAsset; modifyPrompt?: string } }
  | { type: 'CLEAR_PENDING_MODIFY' }
  | { type: 'SET_MANAGE_PANEL'; payload: ManagePanelType }
  | { type: 'SET_MANAGER_MODAL'; payload: ManagerModalType }
  | { type: 'SET_MANAGER_MODAL_FORM_INIT'; payload: ManagerModalFormInit }
  | { type: 'SET_GENERATING_IMAGES'; payload: boolean }
  | { type: 'SET_ACTIVE_LIBRARY_COLLECTION'; payload: string }
  | { type: 'TOGGLE_LIKED_ASSET'; payload: string }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'CLEAR_ALL_SESSIONS' };

// ── Initial State ──────────────────────────────────────────────────────

const initialState: ChatState = {
  activeView: 'create',
  mode: 'idle',
  currentSession: null,
  sessions: [],
  canvasOpen: false,
  historyOpen: false,
  isGeneratingImages: false,
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
    brandStyle: '',
  },
  pendingModifyPrompt: null,
  activeLibraryCollection: '',
  likedAssetIds: new Set(MOCK_LIBRARY_ASSETS.filter((a) => a.liked).map((a) => a.id)),
  generatingSessionId: null,
  unseenCompletedSessionIds: new Set(),
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

    case 'SET_ACTIVE_LIBRARY_COLLECTION':
      return { ...state, activeLibraryCollection: action.payload };

    case 'TOGGLE_LIKED_ASSET': {
      const id = action.payload;
      const next = new Set(state.likedAssetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...state, likedAssetIds: next };
    }

    case 'DELETE_SESSION': {
      const id = action.payload;
      const updatedSessions = state.sessions.filter((s) => s.id !== id);
      const wasCurrent = state.currentSession?.id === id;
      const nextUnseen = new Set(state.unseenCompletedSessionIds);
      nextUnseen.delete(id);
      return {
        ...state,
        sessions: updatedSessions,
        currentSession: wasCurrent ? null : state.currentSession,
        unseenCompletedSessionIds: nextUnseen,
      };
    }

    case 'CLEAR_ALL_SESSIONS':
      return {
        ...state,
        sessions: [],
        currentSession: null,
      };

    case 'SET_MODE': {
      const newMode = action.payload;
      // When going back to idle, close the canvas too
      if (newMode === 'idle') {
        return { ...state, mode: 'idle', canvasOpen: false };
      }
      return { ...state, mode: newMode };
    }

    case 'EXIT_MODE':
      // Full reset: go back to landing state, clear current session.
      // Use the session's mode so the correct tab is active (Imagine → Imagine, Chat → Chat).
      // Keep isGeneratingImages and generatingSessionId so sidebar still shows loading state
      // when user closes session while generation runs; green dot appears when it finishes.
      const exitMode = state.currentSession?.mode ?? 'imagine';
      return {
        ...state,
        mode: exitMode,
        currentSession: null,
        canvasOpen: false,
        pendingModifyPrompt: null,
        imagineOptions: initialState.imagineOptions,
        productOptions: initialState.productOptions,
        characterOptions: initialState.characterOptions,
        createOptions: initialState.createOptions,
      };

    case 'SEND_MESSAGE': {
      let session = state.currentSession;
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
        session = createSession(state.mode, styleId, aspectRatio);
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
      if (!state.currentSession) return state;
      const updatedAssets = [action.payload, ...state.currentSession.generatedAssets];
      const updatedSession = {
        ...state.currentSession,
        generatedAssets: updatedAssets,
        aspectRatio:
          state.currentSession.aspectRatio ?? action.payload.aspectRatio,
      };
      const updatedSessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return {
        ...state,
        currentSession: updatedSession,
        sessions: updatedSessions,
        canvasOpen: true,
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

    case 'NEW_CHAT':
      return {
        ...state,
        currentSession: null,
        mode: 'idle',
        canvasOpen: false,
        pendingModifyPrompt: null,
        imagineOptions: initialState.imagineOptions,
        productOptions: initialState.productOptions,
        characterOptions: initialState.characterOptions,
        createOptions: initialState.createOptions,
      };

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

    case 'SET_MANAGE_PANEL':
      return { ...state, activeManagePanel: action.payload };

    case 'SET_MANAGER_MODAL':
      return { ...state, activeManagerModal: action.payload };

    case 'SET_MANAGER_MODAL_FORM_INIT':
      return { ...state, managerModalFormInit: action.payload };

    case 'SET_GENERATING_IMAGES': {
      const isGenerating = action.payload;
      if (isGenerating) {
        return {
          ...state,
          isGeneratingImages: true,
          generatingSessionId: state.currentSession?.id ?? null,
        };
      }
      const genId = state.generatingSessionId;
      const isStillCurrent = genId === state.currentSession?.id;
      const nextUnseen = new Set(state.unseenCompletedSessionIds);
      if (genId && !isStillCurrent) {
        nextUnseen.add(genId);
      }
      return {
        ...state,
        isGeneratingImages: false,
        generatingSessionId: null,
        unseenCompletedSessionIds: nextUnseen,
      };
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
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'manage' });
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
