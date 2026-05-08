'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat, type CreativeMode } from '@/lib/chat-context';
import { useBrand } from '@/lib/brand-context';
import styles from './PromptModeIntro.module.css';

type IntroMode = Exclude<CreativeMode, 'idle'>;

const INTRO_COPY: Record<
  IntroMode,
  { title: string; body: string; imageSrc: string; imageAlt: string }
> = {
  imagine: {
    title: 'What is Imagery?',
    body:
      'Imagery turns a short prompt into visuals that follow your brand: stills and clips you can iterate on, refine, and drop into campaigns — without hunting stock or breaking guidelines.',
    imageSrc: 'https://picsum.photos/seed/ow-intro-imagery/264/176',
    imageAlt: 'Abstract imaginative visual',
  },
  create: {
    title: 'What is Market Adaption?',
    body:
      'Market Adaption is for one idea, many deliveries: reuse a concept across formats (story, square, banner) and locales so every market gets the same quality and tone.',
    imageSrc: 'https://picsum.photos/seed/ow-intro-multimarket/264/176',
    imageAlt: 'Collage suggesting multiple formats',
  },
  product: {
    title: 'What is Product?',
    body:
      'Product mode centres your real SKU: combine pack shots and scene styles so you get consistent ecommerce and campaign-ready images tied to actual items.',
    imageSrc: 'https://picsum.photos/seed/ow-intro-product/264/176',
    imageAlt: 'Product-style photography',
  },
  character: {
    title: 'What is Character?',
    body:
      'Character mode is for people your brand already owns — spokespeople, mascots, or testimonials. You pick who shows up and describe the moment; the look stays on-brand.',
    imageSrc: 'https://picsum.photos/seed/ow-intro-character/264/176',
    imageAlt: 'Portrait-style character visual',
  },
  assistant: {
    title: 'What is Assistant?',
    body:
      'Assistant is your conversational layer on the brand system: ask about guidelines, assets, or tone, and get answers grounded in how your organisation actually works.',
    imageSrc: 'https://picsum.photos/seed/ow-intro-assistant/264/176',
    imageAlt: 'Calm workspace suggesting conversation',
  },
};

const TAB_ORDER: IntroMode[] = [
  'imagine',
  'create',
  'product',
  'character',
  'assistant',
];

export default function PromptModeIntro() {
  const { state } = useChat();
  const { hasAssistant } = useBrand();

  const visibleModes = TAB_ORDER.filter((m) => m !== 'assistant' || hasAssistant);
  const selectedFromState: CreativeMode =
    state.mode === 'idle' ? 'imagine' : state.mode;
  const mode: IntroMode = visibleModes.includes(selectedFromState as IntroMode)
    ? (selectedFromState as IntroMode)
    : visibleModes[0] ?? 'imagine';

  const copy = INTRO_COPY[mode];

  return (
    <section
      className={styles.introShell}
      aria-labelledby={`prompt-mode-intro-title-${mode}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          className={styles.introCard}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.introText}>
            <h2 id={`prompt-mode-intro-title-${mode}`} className={styles.title}>
              {copy.title}
            </h2>
            <p className={styles.body}>{copy.body}</p>
          </div>
          <div className={styles.introVisual}>
            <Image
              className={styles.thumb}
              src={copy.imageSrc}
              alt={copy.imageAlt}
              width={132}
              height={88}
              sizes="132px"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
