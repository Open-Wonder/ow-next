'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import ChatInput from '@/components/chat/ChatInput/ChatInput';
import ChatMessages from '@/components/chat/ChatMessages/ChatMessages';
import ChatSessionHistory from '@/components/chat/ChatSessionHistory/ChatSessionHistory';
import EditCanvas from '@/components/chat/EditCanvas/EditCanvas';
import GenerationLoader from '@/components/chat/EditCanvas/GenerationLoader';
import ModeBoxes from '@/components/chat/ModeBoxes/ModeBoxes';
import { useChat, CreativeMode } from '@/lib/chat-context';
import { useIsAdmin } from '@/lib/permissions';
import { MOCK_IMAGES } from '@/lib/mock-data';
import styles from './ChatLanding.module.css';

/** Keywords that hint at a specific creative mode */
const MODE_KEYWORDS: { mode: CreativeMode; patterns: RegExp[] }[] = [
  {
    mode: 'imagine',
    patterns: [
      /\b(generate|create|make|build)\b.*\b(image|picture|photo|visual|video|clip)\b/i,
      /\b(image|picture|photo|visual|video|illustration)\b.*\b(of|with|for|showing)\b/i,
      /\bimagine\b/i,
    ],
  },
  {
    mode: 'product',
    patterns: [
      /\b(product)\b.*\b(shot|photo|image|picture|shoot)\b/i,
      /\b(shoot|photograph)\b.*\b(product|item)\b/i,
      /\bproduct\s?(shot|photo|image)\b/i,
    ],
  },
  {
    mode: 'character',
    patterns: [
      /\b(character|testimonial|person|portrait)\b/i,
      /\b(with|featuring)\b.*\b(sarah|marcus|elena|karen|michael|james)\b/i,
    ],
  },
  {
    mode: 'create',
    patterns: [
      /\b(ad|ads|advertisement|banner|campaign|story|post)\b/i,
      /\b(instagram|facebook|linkedin|youtube|social\s?media)\b/i,
    ],
  },
  {
    mode: 'assistant',
    patterns: [/\bassistant\b/i, /\bbrand\s+help\b/i, /\bguidelines\b/i],
  },
];

function detectMode(message: string): CreativeMode | null {
  for (const { mode, patterns } of MODE_KEYWORDS) {
    if (patterns.some((re) => re.test(message))) {
      return mode;
    }
  }
  return null;
}

/** Detect creation intents (admin-only) — returns a route or null */
const CREATION_INTENTS: { patterns: RegExp[]; route: string }[] = [
  {
    patterns: [
      /\b(create|add|new)\b.*\bcharacter\b/i,
      /\bnew\s+character\b/i,
    ],
    route: '/manage/characters/new',
  },
  {
    patterns: [
      /\b(create|add|new)\b.*\bstyle\b/i,
      /\bnew\s+(image\s+)?style\b/i,
    ],
    route: '/manage/styles/new',
  },
  {
    patterns: [
      /\b(create|add|new)\b.*\bproduct\b/i,
      /\bnew\s+product\b/i,
    ],
    route: '/manage/products/new',
  },
  {
    patterns: [
      /\b(create|add|new)\b.*\bshot\s?(style|type)?\b/i,
      /\bnew\s+shot\b/i,
    ],
    route: '/manage/shots/new',
  },
];

function detectCreationIntent(message: string): string | null {
  for (const { patterns, route } of CREATION_INTENTS) {
    if (patterns.some((re) => re.test(message))) {
      return route;
    }
  }
  return null;
}

const MODE_HEADLINES: Record<CreativeMode, { greeting: string; sub: string }> = {
  idle: {
    greeting: 'Hey, I\u2019m your brand AI.',
    sub: 'Ask me anything about your brand, create on-brand content, or just start a conversation.',
  },
  imagine: {
    greeting: 'Let\u2019s bring your vision to life.',
    sub: 'Describe what you see \u2014 I\u2019ll generate on-brand images and videos for you.',
  },
  product: {
    greeting: 'Showcase your products beautifully.',
    sub: 'Pick a product, choose a style, and tell me the scene you have in mind.',
  },
  character: {
    greeting: 'Create scenes with your characters.',
    sub: 'Select your brand characters and describe the moment \u2014 I\u2019ll make it real.',
  },
  create: {
    greeting: 'Design ads that stay on brand.',
    sub: 'Choose a format, set the style, and describe the ad you need.',
  },
  assistant: {
    greeting: 'Your brand assistant is here.',
    sub: 'Ask anything about your brand guidelines, assets, or content strategy.',
  },
};

export default function ChatLanding() {
  const { state, dispatch } = useChat();
  const [isGenerating, setIsGenerating] = useState(false);
  const isAdmin = useIsAdmin();
  const router = useRouter();

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e12a5bc-bcf8-4863-ba85-1864bc6b6f1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatLanding.tsx:render',message:'ChatLanding rendered',data:{mode:state.mode,hasSession:!!state.currentSession},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const hasMessages = state.currentSession && state.currentSession.messages.length > 0;
  const hasImageSessionView =
    (state.mode === 'imagine' || state.mode === 'product' || state.mode === 'character') &&
    state.currentSession &&
    (state.currentSession.messages.length > 0 || state.currentSession.generatedAssets.length > 0);
  const assets = state.currentSession?.generatedAssets ?? [];
  const isGeneratingImages = state.isGeneratingImages;
  const showFullViewportLoader =
    hasImageSessionView && isGeneratingImages && assets.length === 0;
  const effectiveMode = state.mode === 'idle' ? 'imagine' : state.mode;
  const headline = MODE_HEADLINES[effectiveMode];

  // Default to Imagine when landing with no messages
  useEffect(() => {
    if (!hasMessages && state.mode === 'idle') {
      dispatch({ type: 'SET_MODE', payload: 'imagine' });
    }
  }, [hasMessages, state.mode, dispatch]);

  const handleSend = (message: string) => {
    // Check for creation intents first (admin only)
    if (isAdmin && state.mode === 'idle') {
      const creationRoute = detectCreationIntent(message);
      if (creationRoute) {
        router.push(creationRoute);
        return;
      }
    }

    // Auto-detect mode if currently idle (default to imagine)
    const effectiveMode = state.mode === 'idle' ? (detectMode(message) ?? 'imagine') : state.mode;
    if (state.mode === 'idle') {
      dispatch({ type: 'SET_MODE', payload: effectiveMode });
    }

    // Imagine mode requires a brand style; product mode requires a shot style; character mode requires a location
    if (effectiveMode === 'imagine' && !state.imagineOptions.brandStyle) return false;
    if (effectiveMode === 'product' && !state.productOptions.shotStyle) return false;
    if (effectiveMode === 'character' && !state.characterOptions.location) return false;

    const msg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'SEND_MESSAGE', payload: msg });
    setIsGenerating(true);

    // Simulate assistant response
    setTimeout(() => {
      const response = {
        id: `msg-${Date.now()}`,
        role: 'assistant' as const,
        content: getAssistantResponse(effectiveMode, message),
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_ASSISTANT_MESSAGE', payload: response });
      setIsGenerating(false);

      // If in a creative mode (not idle/assistant), simulate generating 4 assets
      if (effectiveMode !== 'idle' && effectiveMode !== 'assistant') {
        dispatch({ type: 'SET_GENERATING_IMAGES', payload: true });
        const delays = [10000, 10500, 11000, 11500];
        delays.forEach((delay, i) => {
          setTimeout(() => {
            const randomImg = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
            dispatch({
              type: 'ADD_GENERATED_ASSET',
              payload: {
                id: `asset-${Date.now()}-${i}`,
                url: randomImg.url,
                prompt: message,
                type: state.imagineOptions.outputType,
                aspectRatio: state.imagineOptions.aspectRatio,
                savedToLibrary: false,
              },
            });
            if (i === delays.length - 1) {
              dispatch({ type: 'SET_GENERATING_IMAGES', payload: false });
            }
          }, delay);
        });
      }
    }, 1200);
  };

  const transition = { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <div className={styles.viewWrapper}>
      <LayoutGroup>
        <div className={styles.animateArea}>
          <AnimatePresence mode="sync">
            {hasImageSessionView ? (
              <motion.div
                key="activeImagine"
                className={`${styles.activeChat} ${styles.imagineView}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                {showFullViewportLoader && (
                  <div className={styles.generationLoaderFullViewport}>
                    <GenerationLoader mode={state.mode} />
                  </div>
                )}
                <motion.div
                  className={styles.imagineCanvasArea}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: 0.05 }}
                >
                  <EditCanvas embedded />
                </motion.div>
                <motion.div
                  layoutId="chat-input"
                  layout
                  className={`${styles.inputDock} ${styles.inputDockFloating}`}
                >
                  <ChatInput onSend={handleSend} />
                </motion.div>
              </motion.div>
            ) : !hasMessages ? (
              <motion.div
                key="landing"
                className={styles.landing}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                <motion.div
                  className={styles.landingHero}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -80 }}
                  transition={transition}
                >
                  <h1 className={styles.greeting}>{headline.greeting}</h1>
                </motion.div>
                <motion.div layoutId="chat-input" layout className={styles.landingInputWrap}>
                  <ChatInput onSend={handleSend} />
                </motion.div>
                <ModeBoxes />
              </motion.div>
            ) : (
              <motion.div
                key="activeChat"
                className={styles.activeChat}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                <motion.div
                  className={styles.chatContent}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: 0.05 }}
                >
                  <div className={styles.sessionHeader}>
                    <span className={styles.sessionTitle}>
                      {state.currentSession?.title ?? 'Chat'}
                    </span>
                    <button
                      className={styles.newChatButton}
                      onClick={() => dispatch({ type: 'EXIT_MODE' })}
                      aria-label="Close chat and return to start"
                    >
                      <X size={14} />
                      Close
                    </button>
                  </div>
                  <ChatSessionHistory />
                  <ChatMessages
                    messages={state.currentSession!.messages}
                    isGenerating={isGenerating}
                  />
                </motion.div>
                <motion.div layoutId="chat-input" layout className={styles.inputDock}>
                  <ChatInput onSend={handleSend} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}

function getAssistantResponse(mode: string, message: string): string {
  switch (mode) {
    case 'imagine':
      return `I'll generate that for you! Based on your brand guidelines, I'm creating visuals matching: "${message}". This will take just a moment...`;
    case 'product':
      return `Great choice! I'll create a product shot based on: "${message}". Let me work on that...`;
    case 'character':
      return `I'll create a character scene for: "${message}". Working on it now...`;
    case 'create':
      return `I'll design an ad based on: "${message}". Let me put that together...`;
    case 'assistant':
      return `I'd be happy to help with that! I know your brand inside and out — feel free to ask me anything about your guidelines, assets, or content strategy.`;
    default:
      return `I'd be happy to help with that! I know your brand inside and out — feel free to ask me anything about your guidelines, assets, or content strategy. Or use the shortcuts below to jump straight into creating.`;
  }
}
