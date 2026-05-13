'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft } from '@phosphor-icons/react';
import ChatInput from '@/components/chat/ChatInput/ChatInput';
import { Button } from '@/components/common/Button';
import ChatMessages from '@/components/chat/ChatMessages/ChatMessages';
import ChatSessionHistory from '@/components/chat/ChatSessionHistory/ChatSessionHistory';
import EditCanvas from '@/components/chat/EditCanvas/EditCanvas';
import GenerationLoader from '@/components/chat/EditCanvas/GenerationLoader';
import PromptModeIntro from './PromptModeIntro';
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
    greeting: 'Adapt your visuals for multiple markets',
    sub: 'Choose a format, set the style, and describe the ad you need.',
  },
  assistant: {
    greeting: 'Ask your brand anything',
    sub: 'Ask anything about your brand guidelines, assets, or content strategy.',
  },
};

export default function ChatLanding() {
  const { state, dispatch } = useChat();
  const [isGenerating, setIsGenerating] = useState(false);
  const isAdmin = useIsAdmin();
  const router = useRouter();

  const hasMessages = state.currentSession && state.currentSession.messages.length > 0;
  const hasImageSessionView =
    (state.mode === 'imagine' ||
      state.mode === 'product' ||
      state.mode === 'character' ||
      state.mode === 'create') &&
    state.currentSession &&
    (state.currentSession.messages.length > 0 || state.currentSession.generatedAssets.length > 0);
  const assets = state.currentSession?.generatedAssets ?? [];
  const currentSessionId = state.currentSession?.id;
  const isThisSessionGenerating =
    !!currentSessionId && state.generatingSessionIds.has(currentSessionId);
  const showFullViewportLoader =
    hasImageSessionView && isThisSessionGenerating && assets.length === 0;
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

    // Imagine mode requires a brand style; product mode requires a shot style; character mode requires a location.
    // (Create mode is validated upstream — overlay Send button + chat-input send button — and may dispatch
    //  SET_CREATE_OPTIONS in the same handler, so closure state would be stale here.)
    if (effectiveMode === 'imagine' && !state.imagineOptions.brandStyle) return false;
    if (effectiveMode === 'product' && !state.productOptions.shotStyle) return false;
    if (effectiveMode === 'character' && !state.characterOptions.location) return false;

    const msg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString(),
    };
    const generationSessionId = state.currentSession?.id ?? `session-${Date.now()}`;
    dispatch({
      type: 'SEND_MESSAGE',
      payload: msg,
      sessionId: state.currentSession ? undefined : generationSessionId,
    });
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
        dispatch({
          type: 'SET_GENERATING_IMAGES',
          payload: { active: true, sessionId: generationSessionId },
        });
        // Tag assets with the source product / character so the Library sidebar can group them.
        const tagProductId =
          effectiveMode === 'product'
            ? state.productOptions.selectedProducts[0]?.id
            : undefined;
        const tagCharacterId =
          effectiveMode === 'character'
            ? state.characterOptions.selectedCharacters[0]?.id
            : undefined;
        /* Staggered mock arrivals: short enough to validate full-viewport loader + grid placeholder */
        const delays = [2800, 3300, 3800, 4300];
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
                createdAt: new Date().toISOString(),
                ...(tagProductId ? { productId: tagProductId } : {}),
                ...(tagCharacterId ? { characterId: tagCharacterId } : {}),
              },
              sessionId: generationSessionId,
            });
            if (i === delays.length - 1) {
              dispatch({
                type: 'SET_GENERATING_IMAGES',
                payload: { active: false, sessionId: generationSessionId },
              });
            }
          }, delay);
        });
      }
    }, 1200);
  };

  const imagineViewRef = useRef<HTMLDivElement>(null);
  const imagineCanvasRef = useRef<HTMLDivElement>(null);

  const clearBackdropRoot = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    el.style.willChange = 'auto';
    el.style.transform = 'none';
  }, []);

  const fadeOut = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };
  const fadeIn = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };
  const fadeInDelayed = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const, delay: 0.5 };

  return (
    <div className={styles.viewWrapper}>
      <div className={styles.animateArea}>
        <AnimatePresence mode="wait">
          {hasImageSessionView ? (
            <motion.div
              ref={imagineViewRef}
              key="activeImagine"
              className={`${styles.activeChat} ${styles.imagineView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeOut}
              onAnimationComplete={() => clearBackdropRoot(imagineViewRef.current)}
            >
              {showFullViewportLoader && (
                <div className={styles.generationLoaderFullViewport}>
                  <GenerationLoader mode={state.mode} />
                </div>
              )}
              <motion.div
                ref={imagineCanvasRef}
                className={styles.imagineCanvasArea}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={fadeInDelayed}
                onAnimationComplete={() => clearBackdropRoot(imagineCanvasRef.current)}
              >
                <EditCanvas embedded />
              </motion.div>
              <div className={`${styles.inputDock} ${styles.inputDockFloating}`}>
                <div className={styles.chatPromptShell}>
                  <ChatInput onSend={handleSend} />
                </div>
              </div>
            </motion.div>
          ) : !hasMessages ? (
            <motion.div
              key="landing"
              className={styles.landing}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeOut}
            >
              <div className={styles.landingSpacer} aria-hidden />
              <div className={styles.landingStack}>
                <motion.div
                  className={styles.landingHero}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeIn}
                >
                  <h1 className={styles.greeting}>{headline.greeting}</h1>
                </motion.div>
                <div className={styles.landingInputWrap}>
                  <ChatInput onSend={handleSend} />
                </div>
                <motion.div
                  className={styles.landingPromptWidth}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeIn}
                >
                  <PromptModeIntro />
                </motion.div>
              </div>
              <div className={styles.landingSpacer} aria-hidden />
            </motion.div>
          ) : (
            <motion.div
              key="activeChat"
              className={styles.activeChat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeOut}
            >
              <motion.div
                className={styles.chatContent}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={fadeInDelayed}
              >
                <div className={styles.sessionHeader}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<CaretLeft size={18} weight="bold" />}
                    onClick={() => dispatch({ type: 'EXIT_MODE' })}
                    aria-label="Close and return to start"
                    className={styles.chatBackButton}
                  />
                  <h3 className={styles.chatTitle}>Chat-Session</h3>
                  <span className={styles.headerSpacer} />
                </div>
                <ChatSessionHistory />
                <ChatMessages
                  messages={state.currentSession!.messages}
                  isGenerating={isGenerating}
                />
              </motion.div>
              <div className={styles.inputDock}>
                <div className={styles.chatPromptShell}>
                  <ChatInput onSend={handleSend} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
