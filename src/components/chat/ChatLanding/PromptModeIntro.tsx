'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useChat, type CreativeMode } from '@/lib/chat-context';
import { useBrand } from '@/lib/brand-context';
import styles from './PromptModeIntro.module.css';

type IntroMode = 'imagine' | 'product' | 'character' | 'assistant';

type ExampleChip = { display: string; draft: string };

const START_TITLE = 'Start with an example';

function chipSame(text: string): ExampleChip {
  return { display: text, draft: text };
}

const EXAMPLES: Record<IntroMode, ExampleChip[]> = {
  imagine: [
    chipSame('Editorial flat-lay of our hero pack on marble, soft morning light'),
    chipSame('Wide cinematic outdoor scene at golden hour, on-brand mood'),
    chipSame('Macro close-up of material texture, studio lighting, premium feel'),
  ],
  product: [
    {
      display: '[Wireless Headphones] on a minimal concrete pedestal, soft side light',
      draft: '[Product: Wireless Headphones] on a minimal concrete pedestal, soft side light',
    },
    {
      display: '[Organic Face Cream] in a sunlit bathroom with eucalyptus',
      draft: '[Product: Organic Face Cream] in a sunlit bathroom with eucalyptus',
    },
    {
      display: '[Running Shoes] mid-air on a vivid color block, motion blur',
      draft: '[Product: Running Shoes] mid-air on a vivid color block, motion blur',
    },
  ],
  character: [
    {
      display: '[Sarah Chen] in a sunlit office, candid coffee moment',
      draft: '[Character: Sarah Chen] in a sunlit office, candid coffee moment',
    },
    {
      display: '[Marcus Johnson] reviewing sketches in a creative studio',
      draft: '[Character: Marcus Johnson] reviewing sketches in a creative studio',
    },
    {
      display: '[Elena Rodriguez] presenting on stage, confident tone',
      draft: '[Character: Elena Rodriguez] presenting on stage, confident tone',
    },
  ],
  assistant: [
    chipSame('What are our primary brand colors?'),
    chipSame('Which fonts can I use on social posts?'),
    chipSame('Where can I find our latest logo files?'),
  ],
};

const TAB_ORDER: IntroMode[] = ['imagine', 'product', 'character', 'assistant'];

export default function PromptModeIntro() {
  const { state, dispatch } = useChat();
  const { hasAssistant } = useBrand();

  const visibleModes = TAB_ORDER.filter((m) => m !== 'assistant' || hasAssistant);
  const selectedFromState: CreativeMode =
    state.mode === 'idle' ? 'imagine' : state.mode;

  if (selectedFromState === 'create') {
    return (
      <section className={styles.examplesShell} aria-hidden="true">
        {/* Reserve space so switching to Market Adaption does not shrink the landing stack */}
        <div className={styles.examplesCard} />
      </section>
    );
  }

  const mode: IntroMode = visibleModes.includes(selectedFromState as IntroMode)
    ? (selectedFromState as IntroMode)
    : (visibleModes[0] ?? 'imagine');

  const chips = EXAMPLES[mode];

  const handleChipClick = (draft: string) => {
    dispatch({ type: 'SET_PROMPT_DRAFT', payload: draft });
  };

  return (
    <section
      className={styles.examplesShell}
      aria-labelledby={`prompt-mode-intro-title-${mode}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          className={styles.examplesCard}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 id={`prompt-mode-intro-title-${mode}`} className={styles.eyebrow}>
            {START_TITLE}
          </h2>
          <div className={styles.chipRow} role="list">
            {chips.map(({ display, draft }) => (
              <button
                key={draft}
                type="button"
                role="listitem"
                className={styles.chip}
                aria-label={draft}
                onClick={() => handleChipClick(draft)}
              >
                <span className={styles.chipLabel}>{display}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
