'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp,
  ImageSquare,
} from '@phosphor-icons/react';
import cn from 'classnames';
import { useChat } from '@/lib/chat-context';
import { setMentionMode } from '@/lib/mention-mode';
import {
  MOCK_IMAGE_STYLES,
  MOCK_PRODUCT_STYLES,
  MOCK_CHARACTER_LOCATIONS,
  MOCK_LIBRARY_ASSETS,
  MOCK_MARKETS,
} from '@/lib/mock-data';
import { Button } from '@/components/common/Button';
import CustomSelect from '@/components/common/Select';
import Box from '@/components/common/Box';
import PromptEditor, { type PromptEditorRef } from '@/components/chat/ChatInput/PromptEditor';
import PromptModeTabs from '@/components/chat/ChatInput/PromptModeTabs';
import CreateModeImageField from '@/components/chat/ChatInput/CreateModeImageField';
import AspectRatioSelector from '@/components/common/AspectRatioSelector';
import {
  IMAGE_FORMATS_IMAGE_CREATION,
  DEFAULT_FORMAT_IMAGE_CREATION,
} from '@/lib/config/imageFormats';
import styles from './ChatInput.module.css';

/* ── Types ──────────────────────────────────────────────────────────── */

interface ChatInputProps {
  className?: string;
  onSend?: (message: string) => boolean | void;
}

/* ── Main Component ─────────────────────────────────────────────────── */

const usePromptEditor = (mode: string) =>
  ['imagine', 'assistant', 'product', 'character'].includes(mode);

export default function ChatInput({ className, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptEditorRef = useRef<PromptEditorRef>(null);
  const { state, dispatch } = useChat();
  const mode = state.mode;
  const hasMessages = state.currentSession && state.currentSession.messages.length > 0;
  const hasAssets = state.currentSession && state.currentSession.generatedAssets.length > 0;
  const inImageSessionView =
    (mode === 'imagine' || mode === 'product' || mode === 'character') &&
    state.currentSession &&
    (hasMessages || hasAssets);
  const lastUserMessage = state.currentSession?.messages
    ?.filter((m) => m.role === 'user')
    .pop();
  const usePromptEditorFor = usePromptEditor(mode);
  const [promptEditorEmpty, setPromptEditorEmpty] = useState(true);

  useEffect(() => {
    setMentionMode(mode);
  }, [mode]);

  /** Landing prompt-example chips inject draft via context — apply once PromptEditor ref exists */
  useEffect(() => {
    const draft = state.pendingPromptDraft;
    if (!draft || !usePromptEditorFor) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    const tryApply = () => {
      if (cancelled) return;
      const ed = promptEditorRef.current;
      if (ed) {
        ed.setContent(draft);
        ed.focus();
        dispatch({ type: 'CLEAR_PROMPT_DRAFT' });
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        dispatch({ type: 'CLEAR_PROMPT_DRAFT' });
        return;
      }
      requestAnimationFrame(tryApply);
    };

    tryApply();
    return () => {
      cancelled = true;
    };
  }, [state.pendingPromptDraft, usePromptEditorFor, dispatch]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160 * 1.4) + 'px';
  }, [value]);

  useEffect(() => {
    if (usePromptEditorFor && inImageSessionView && lastUserMessage?.content) {
      promptEditorRef.current?.setContent(lastUserMessage.content);
    }
  }, [usePromptEditorFor, inImageSessionView, state.currentSession?.id, lastUserMessage?.content]);

  const canSendRequirement =
    mode === 'imagine'
      ? !!state.imagineOptions.brandStyle
      : mode === 'product'
        ? !!state.productOptions.shotStyle
        : mode === 'character'
          ? !!state.characterOptions.location
          : mode === 'create'
            ? state.createOptions.sourceAssetIds.length > 0 &&
              state.createOptions.markets.length > 0
            : true;
  const canSendTextarea =
    mode === 'create'
      ? canSendRequirement
      : value.trim() && canSendRequirement;
  const canSendPromptEditor = !promptEditorEmpty && canSendRequirement;
  const canSend = usePromptEditorFor ? canSendPromptEditor : canSendTextarea;

  const handleSend = useCallback(() => {
    if (mode === 'imagine' && !state.imagineOptions.brandStyle) return;
    if (mode === 'product' && !state.productOptions.shotStyle) return;
    if (mode === 'character' && !state.characterOptions.location) return;
    if (mode === 'create' && state.createOptions.sourceAssetIds.length === 0) return;
    if (mode === 'create' && state.createOptions.markets.length === 0) return;
    if (usePromptEditorFor) {
      const text = promptEditorRef.current?.getText() ?? '';
      const trimmed = text.trim();
      if (!trimmed) return;
      const accepted = onSend?.(trimmed);
      if (accepted !== false) {
        const keepForIteration =
          mode === 'imagine' || mode === 'product' || mode === 'character';
        if (!keepForIteration) {
          promptEditorRef.current?.setContent('');
        }
      }
    } else {
      if (mode === 'create') {
        const chosenIds = state.createOptions.sourceAssetIds;
        const chosenMarkets = state.createOptions.markets;
        if (chosenIds.length === 0 || chosenMarkets.length === 0) return;
        const names = chosenIds
          .map((id) => MOCK_LIBRARY_ASSETS.find((a) => a.id === id)?.name)
          .filter(Boolean) as string[];
        const marketLabels = chosenMarkets
          .map((id) => MOCK_MARKETS.find((m) => m.id === id)?.label)
          .filter(Boolean) as string[];
        const message = `Adapt ${
          names.length > 0 ? names.join(', ') : 'selected images'
        } for ${marketLabels.join(', ')}`;
        const accepted = onSend?.(message);
        if (accepted !== false) {
          // keep sources + markets for iteration unless cleared elsewhere
        }
        return;
      }
      const trimmed = value.trim();
      if (!trimmed) return;
      const accepted = onSend?.(trimmed);
      if (accepted !== false) {
        const keepForIteration =
          mode === 'imagine' || mode === 'product' || mode === 'character';
        if (!keepForIteration) {
          setValue('');
        }
      }
    }
  }, [
    mode,
    state.imagineOptions.brandStyle,
    state.productOptions.shotStyle,
    state.characterOptions.location,
    state.createOptions.markets,
    state.createOptions.sourceAssetIds,
    usePromptEditorFor,
    value,
    onSend,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pickerSendButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={!canSend}
      icon={<ArrowUp size={18} weight="bold" />}
      className={styles.sendButton}
      classNames={{ inner: styles.sendButtonInner }}
      onClick={handleSend}
    />
  );

  const placeholder =
    mode === 'idle'
      ? 'Select a creation mode, then describe what you need'
      : mode === 'imagine'
        ? state.imagineOptions.brandStyle
          ? 'Describe what you see - I will generate on-brand images and videos for you.'
          : 'Describe what you see - I will generate on-brand images and videos for you. Select a brand style below first.'
        : mode === 'product'
          ? state.productOptions.shotStyle
            ? 'Add products with @, pick a shot style, and describe the scene.'
            : 'Add products with @, pick a shot style, and describe the scene. Select a shot style below first.'
          : mode === 'character'
            ? state.characterOptions.location
              ? 'Add characters with @, pick a location, and describe the scene.'
              : 'Add characters with @, pick a location, and describe the scene. Select a location below first.'
            : mode === 'assistant'
              ? 'Ask me anything about your brand'
              : '';

  return (
    <Box variant="white" noPadding className={cn(styles.wrapper, className)}>
      {/* Input area */}
      <div className={styles.inputArea}>
          <div className={styles.modeTabsInPrompt}>
            <PromptModeTabs />
          </div>
          <div className={styles.textRow}>
            {usePromptEditorFor ? (
              <PromptEditor
                ref={promptEditorRef}
                placeholder={placeholder}
                onSend={handleSend}
                onContentChange={setPromptEditorEmpty}
                content={inImageSessionView && lastUserMessage?.content ? lastUserMessage.content : undefined}
              />
            ) : mode === 'create' ? (
              <CreateModeImageField />
            ) : (
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            )}
            {mode === 'idle' && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canSend}
                icon={<ArrowUp size={18} weight="bold" />}
                className={styles.sendButton}
                classNames={{ inner: styles.sendButtonInner }}
                onClick={handleSend}
              />
            )}
          </div>
        </div>

        {/* Picker bar (mode-specific visual chips; assistant shows empty placeholder for consistent height).
            Create mode handles send entirely inside the Explore overlay, so it skips the picker bar. */}
        {mode !== 'idle' && mode !== 'create' && (
          <div className={styles.pickerBar}>
            <div className={styles.pickerBarInner}>
              {mode === 'imagine' && (
                <ImaginePickers
                  createButton={pickerSendButton}
                />
              )}
              {mode === 'product' && <ProductPickers createButton={pickerSendButton} />}
              {mode === 'character' && <CharacterPickers createButton={pickerSendButton} />}
              {mode === 'assistant' && <AssistantPickers createButton={pickerSendButton} />}
            </div>
          </div>
        )}
    </Box>
  );
}

/* ── Imagine Pickers ────────────────────────────────────────────────── */

function ImaginePickers({ createButton }: { createButton: React.ReactNode }) {
  const { state, dispatch } = useChat();
  const opts = state.imagineOptions;

  const isValidCreateFormat = IMAGE_FORMATS_IMAGE_CREATION.some(
    (f) => f.aspectRatio === opts.aspectRatio
  );
  const displayValue = isValidCreateFormat ? opts.aspectRatio : DEFAULT_FORMAT_IMAGE_CREATION.id;

  return (
    <div className={styles.pickerRow}>
      <div className={styles.pickerRowLeft}>
        <div className={styles.styleSelectWrap}>
          <CustomSelect
            id="imagine-style-selector"
            value={opts.brandStyle || undefined}
            onValueChange={(value) =>
              dispatch({
                type: 'SET_IMAGINE_OPTIONS',
                payload: { brandStyle: value },
              })
            }
            options={MOCK_IMAGE_STYLES.map((s) => ({
              value: s.id,
              label: s.name,
              imageUrl: s.image,
              description: s.description,
              previews: s.previews,
            }))}
            size="sm"
            placeholder="Select Style"
            placeholderIcon={<ImageSquare size={16} />}
          />
        </div>
        <div className={styles.formatSelectWrapInline}>
          <AspectRatioSelector
            value={displayValue}
            onChange={(format) =>
              dispatch({
                type: 'SET_IMAGINE_OPTIONS',
                payload: {
                  aspectRatio: format.aspectRatio as '16:9' | '1:1' | '4:5',
                },
              })
            }
            type="create"
            size="sm"
          />
        </div>
      </div>
      <div className={styles.createButtonWrap}>{createButton}</div>
    </div>
  );
}

/* ── Product Pickers ────────────────────────────────────────────────── */

function ProductPickers({ createButton }: { createButton: React.ReactNode }) {
  const { state, dispatch } = useChat();
  const opts = state.productOptions;
  const isValidCreateFormat = IMAGE_FORMATS_IMAGE_CREATION.some(
    (f) => f.aspectRatio === state.imagineOptions.aspectRatio
  );
  const displayValue = isValidCreateFormat
    ? state.imagineOptions.aspectRatio
    : DEFAULT_FORMAT_IMAGE_CREATION.id;

  return (
    <div className={styles.pickerRow}>
      <div className={styles.pickerRowLeft}>
        <div className={styles.styleSelectWrap}>
          <CustomSelect
            id="product-style-selector"
            value={opts.shotStyle || undefined}
            onValueChange={(value) =>
              dispatch({
                type: 'SET_PRODUCT_OPTIONS',
                payload: { shotStyle: value },
              })
            }
            options={MOCK_PRODUCT_STYLES.map((s) => ({
              value: s.id,
              label: s.name,
              imageUrl: s.image,
              description: s.description,
              previews: s.previews,
            }))}
            size="sm"
            placeholder="Select Style"
            placeholderIcon={<ImageSquare size={16} />}
          />
        </div>
        <div className={styles.formatSelectWrapInline}>
          <AspectRatioSelector
            value={displayValue}
            onChange={(format) =>
              dispatch({
                type: 'SET_IMAGINE_OPTIONS',
                payload: {
                  aspectRatio: format.aspectRatio as '16:9' | '1:1' | '4:5',
                },
              })
            }
            type="create"
            size="sm"
          />
        </div>
      </div>
      <div className={styles.createButtonWrap}>{createButton}</div>
    </div>
  );
}

/* ── Character Pickers ──────────────────────────────────────────────── */

function CharacterPickers({ createButton }: { createButton: React.ReactNode }) {
  const { state, dispatch } = useChat();
  const opts = state.characterOptions;
  const isValidCreateFormat = IMAGE_FORMATS_IMAGE_CREATION.some(
    (f) => f.aspectRatio === state.imagineOptions.aspectRatio
  );
  const displayValue = isValidCreateFormat
    ? state.imagineOptions.aspectRatio
    : DEFAULT_FORMAT_IMAGE_CREATION.id;

  return (
    <div className={styles.pickerRow}>
      <div className={styles.pickerRowLeft}>
        <div className={styles.styleSelectWrap}>
          <CustomSelect
            id="character-style-selector"
            value={opts.location || undefined}
            onValueChange={(value) =>
              dispatch({
                type: 'SET_CHARACTER_OPTIONS',
                payload: { location: value },
              })
            }
            options={MOCK_CHARACTER_LOCATIONS.map((s) => ({
              value: s.id,
              label: s.name,
              imageUrl: s.image,
              description: s.description,
              previews: s.previews,
            }))}
            size="sm"
            placeholder="Select Style"
            placeholderIcon={<ImageSquare size={16} />}
          />
        </div>
        <div className={styles.formatSelectWrapInline}>
          <AspectRatioSelector
            value={displayValue}
            onChange={(format) =>
              dispatch({
                type: 'SET_IMAGINE_OPTIONS',
                payload: {
                  aspectRatio: format.aspectRatio as '16:9' | '1:1' | '4:5',
                },
              })
            }
            type="create"
            size="sm"
          />
        </div>
      </div>
      <div className={styles.createButtonWrap}>{createButton}</div>
    </div>
  );
}

function AssistantPickers({ createButton }: { createButton: React.ReactNode }) {
  return (
    <div className={styles.pickerRow}>
      <div className={styles.pickerRowLeft} />
      <div className={styles.createButtonWrap}>{createButton}</div>
    </div>
  );
}
