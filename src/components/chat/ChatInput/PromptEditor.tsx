'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { MOCK_PRODUCTS, MOCK_CHARACTERS } from '@/lib/mock-data';
import { ProductTag } from './extensions/ProductTag';
import { CharacterTag } from './extensions/CharacterTag';
import { MentionSuggestion, MentionSuggestionPluginKey } from './extensions/MentionSuggestion';
import type { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import styles from './ChatInput.module.css';

export interface PromptEditorRef {
  insertProductTag: (prod: { id: string; name: string; image: string }) => void;
  insertCharacterTag: (char: { id: string; name: string; image: string }) => void;
  removeTagById: (type: 'product' | 'character', id: string) => void;
  getText: () => string;
  setContent: (text: string) => void;
  focus: () => void;
  isEmpty: () => boolean;
}

interface PromptEditorProps {
  placeholder?: string;
  onSend?: () => void;
  onContentChange?: (isEmpty: boolean) => void;
  content?: string;
}

function serializeToText(editor: Editor): string {
  return editor.getText({ blockSeparator: '\n' });
}

function parseContentToJSON(text: string, products?: { id: string; name: string; image: string }[], characters?: { id: string; name: string; image: string }[]): JSONContent[] {
  const content: JSONContent[] = [];
  const productRegex = /\[Product:\s*([^\]]+)\]/g;
  const characterRegex = /\[Character:\s*([^\]]+)\]/g;

  let lastIndex = 0;
  const matches: { index: number; length: number; type: 'product' | 'character'; name: string }[] = [];

  let m;
  while ((m = productRegex.exec(text)) !== null) {
    matches.push({ index: m.index, length: m[0].length, type: 'product', name: m[1].trim() });
  }
  while ((m = characterRegex.exec(text)) !== null) {
    matches.push({ index: m.index, length: m[0].length, type: 'character', name: m[1].trim() });
  }
  matches.sort((a, b) => a.index - b.index);

  for (const match of matches) {
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent) {
        content.push({ type: 'text', text: textContent });
      }
    }
    if (match.type === 'product') {
      const prod = products?.find((p) => p.name === match.name) ?? { id: 'unknown', name: match.name, image: '' };
      content.push({ type: 'productTag', attrs: { id: prod.id, name: prod.name, image: prod.image } });
    } else {
      const char = characters?.find((c) => c.name === match.name) ?? { id: 'unknown', name: match.name, image: '' };
      content.push({ type: 'characterTag', attrs: { id: char.id, name: char.name, image: char.image } });
    }
    lastIndex = match.index + match.length;
  }
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex);
    if (textContent) {
      content.push({ type: 'text', text: textContent });
    }
  }

  return content.length > 0 ? content : [{ type: 'text', text: '' }];
}

const PromptEditor = forwardRef<PromptEditorRef, PromptEditorProps>(function PromptEditor(
  { placeholder = 'Describe...', onSend, onContentChange, content: initialContent },
  ref
) {
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        listItem: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
      }),
      ProductTag,
      CharacterTag,
      MentionSuggestion,
    ],
    content: '',
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          const suggestionState = MentionSuggestionPluginKey.getState(view.state);
          if (suggestionState?.active) {
            return false;
          }
          event.preventDefault();
          onSendRef.current?.();
          return true;
        }
        return false;
      },
    },
  },
  []);

  useEffect(() => {
    if (editor && placeholder) {
      editor.view.dispatch(editor.state.tr);
    }
  }, [editor, placeholder]);

  useEffect(() => {
    if (editor && initialContentRef.current) {
      const content = parseContentToJSON(
        initialContentRef.current,
        MOCK_PRODUCTS,
        MOCK_CHARACTERS
      );
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content }] });
    }
  }, [editor]);

  useEffect(() => {
    if (!editor || !onContentChange) return;
    const fn = () => onContentChange(editor.isEmpty);
    fn();
    editor.on('update', fn);
    return () => {
      editor.off('update', fn);
    };
  }, [editor, onContentChange]);

  const insertProductTag = useCallback(
    (prod: { id: string; name: string; image: string }) => {
      if (!editor) return;
      editor.commands.insertContent({ type: 'productTag', attrs: { id: prod.id, name: prod.name, image: prod.image } });
    },
    [editor]
  );

  const insertCharacterTag = useCallback(
    (char: { id: string; name: string; image: string }) => {
      if (!editor) return;
      editor.commands.insertContent({ type: 'characterTag', attrs: { id: char.id, name: char.name, image: char.image } });
    },
    [editor]
  );

  const removeTagById = useCallback(
    (type: 'product' | 'character', id: string) => {
      if (!editor) return;
      const nodeType = type === 'product' ? 'productTag' : 'characterTag';
      const { doc } = editor.state;
      let from: number | null = null;
      let to: number | null = null;
      doc.descendants((node, pos) => {
        if (node.type.name === nodeType && node.attrs.id === id) {
          from = pos;
          to = pos + node.nodeSize;
          return false;
        }
        return true;
      });
      if (from !== null && to !== null) {
        editor.commands.deleteRange({ from, to });
      }
    },
    [editor]
  );

  const getText = useCallback(() => {
    if (!editor) return '';
    return serializeToText(editor).trim();
  }, [editor]);

  const setContent = useCallback(
    (text: string) => {
      if (!editor) return;
      if (!text.trim()) {
        editor.commands.clearContent();
        return;
      }
      const content = parseContentToJSON(text, MOCK_PRODUCTS, MOCK_CHARACTERS);
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content }] });
    },
    [editor]
  );

  const isEmpty = useCallback(() => {
    if (!editor) return true;
    return editor.isEmpty;
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
    insertProductTag,
    insertCharacterTag,
    removeTagById,
    getText,
    setContent,
    focus: () => editor?.commands.focus(),
    isEmpty,
  }),
    [insertProductTag, insertCharacterTag, removeTagById, getText, setContent, editor, isEmpty]
  );

  if (!editor) return null;

  return (
    <div className={styles.promptEditorWrap}>
      <EditorContent editor={editor} className={styles.promptEditor} />
    </div>
  );
});

export default PromptEditor;
