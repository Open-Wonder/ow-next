'use client';

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion } from '@tiptap/suggestion';
import { createRoot } from 'react-dom/client';
import { MOCK_PRODUCTS, MOCK_CHARACTERS } from '@/lib/mock-data';
import { getMentionMode } from '@/lib/mention-mode';
import MentionPopover, {
  type MentionItem,
  type MentionProduct,
  type MentionCharacter,
} from '../MentionPopover';

export const MentionSuggestionPluginKey = new PluginKey('mentionSuggestion');

function toMentionItems(): MentionItem[] {
  const products: MentionProduct[] = MOCK_PRODUCTS.map((p) => ({
    type: 'product',
    id: p.id,
    name: p.name,
    image: p.image,
  }));
  const characters: MentionCharacter[] = MOCK_CHARACTERS.map((c) => ({
    type: 'character',
    id: c.id,
    name: c.name,
    image: c.image,
  }));
  return [...products, ...characters];
}

const ALL_ITEMS = toMentionItems();

const PRODUCTS_ONLY = ALL_ITEMS.filter((i): i is MentionProduct => i.type === 'product');
const CHARACTERS_ONLY = ALL_ITEMS.filter((i): i is MentionCharacter => i.type === 'character');

function filterItems(query: string): MentionItem[] {
  const mode = getMentionMode();
  const base = mode === 'product' ? PRODUCTS_ONLY : mode === 'character' ? CHARACTERS_ONLY : ALL_ITEMS;
  const q = query.toLowerCase().trim();
  if (!q) return base;
  return base.filter((item) => item.name.toLowerCase().includes(q));
}

export const MentionSuggestion = Extension.create({
  name: 'mentionSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        pluginKey: MentionSuggestionPluginKey,
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      Suggestion({
        pluginKey: MentionSuggestionPluginKey,
        editor,
        char: '@',
        allowSpaces: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor: ed, range, props }) => {
          const item = props as MentionItem;
          if (item.type === 'product') {
            ed
              .chain()
              .focus()
              .insertContentAt(range, {
                type: 'productTag',
                attrs: { id: item.id, name: item.name, image: item.image },
              })
              .run();
          } else {
            ed
              .chain()
              .focus()
              .insertContentAt(range, {
                type: 'characterTag',
                attrs: { id: item.id, name: item.name, image: item.image },
              })
              .run();
          }
        },
        allow: () => getMentionMode() !== 'imagine',
        render: () => {
          let root: ReturnType<typeof createRoot> | null = null;
          let container: HTMLDivElement | null = null;
          const stateRef = {
            selectedIndex: 0,
            items: [] as MentionItem[],
            props: null as {
              items: MentionItem[];
              command: (item: MentionItem) => void;
              query: string;
              decorationNode: Element | null;
            } | null,
            forceUpdate: () => {},
          };

          const getPosition = (decorationNode: Element | null) => {
            if (decorationNode) {
              const rect = decorationNode.getBoundingClientRect();
              return { top: rect.bottom + 4, left: rect.left };
            }
            return { top: 0, left: 0 };
          };

          const render = () => {
            const p = stateRef.props;
            if (!root || !container || !p) return;
            root.render(
              <MentionPopover
                items={stateRef.items}
                selectedIndex={stateRef.selectedIndex}
                onSelect={(item) => p.command(item)}
                onClose={() => {}}
                position={getPosition(p.decorationNode)}
                query={p.query}
                onQueryChange={() => {}}
                showSearch={false}
              />
            );
          };

          return {
            onStart: (props: {
              items: MentionItem[];
              command: (item: MentionItem) => void;
              query: string;
              decorationNode: Element | null;
            }) => {
              stateRef.selectedIndex = 0;
              stateRef.items = props.items;
              stateRef.props = props;
              stateRef.forceUpdate = render;
              container = document.createElement('div');
              document.body.appendChild(container);
              root = createRoot(container);
              render();
            },
            onUpdate: (props: {
              items: MentionItem[];
              command: (item: MentionItem) => void;
              query: string;
              decorationNode: Element | null;
            }) => {
              stateRef.selectedIndex = 0;
              stateRef.items = props.items;
              stateRef.props = props;
              render();
            },
            onExit: () => {
              if (container && root) {
                root.unmount();
                container.remove();
                root = null;
                container = null;
              }
            },
            onKeyDown: ({ event }: { view: unknown; event: KeyboardEvent; range: { from: number; to: number } }) => {
              const items = stateRef.items;
              if (event.key === 'ArrowDown') {
                stateRef.selectedIndex = Math.min(
                  stateRef.selectedIndex + 1,
                  Math.max(0, items.length - 1)
                );
                stateRef.forceUpdate();
                return true;
              }
              if (event.key === 'ArrowUp') {
                stateRef.selectedIndex = Math.max(stateRef.selectedIndex - 1, 0);
                stateRef.forceUpdate();
                return true;
              }
              if (event.key === 'Enter' && items.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                const item = items[stateRef.selectedIndex];
                if (item && stateRef.props) {
                  stateRef.props.command(item);
                }
                return true;
              }
              return false;
            },
          };
        },
      }),
    ];
  },
});
