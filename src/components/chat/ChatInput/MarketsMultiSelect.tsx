'use client';

import { useMemo } from 'react';
import { CaretDown as CaretDownIcon, Globe } from '@phosphor-icons/react';
import cn from 'classnames';
import { Popover } from '@base-ui/react/popover';
import { Button, type ButtonProps } from '@/components/common/Button';
import { useChat } from '@/lib/chat-context';
import { MOCK_MARKETS } from '@/lib/mock-data';
import selectStyles from '@/components/common/Select.module.css';
import styles from './ChatInput.module.css';

type NativeButtonProps = Extract<ButtonProps, { href?: undefined }>;

export default function MarketsMultiSelect() {
  const { state, dispatch } = useChat();
  const selectedIds = state.createOptions.markets;

  const summary = useMemo(() => {
    if (selectedIds.length === 0) return 'Pick market';
    return `Market (${selectedIds.length})`;
  }, [selectedIds.length]);

  function toggleMarket(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    dispatch({ type: 'SET_CREATE_OPTIONS', payload: { markets: next } });
  }

  return (
    <div className={selectStyles.formGroup}>
      <Popover.Root>
        <Popover.Trigger
          render={(props) => {
            // `color` is forwarded by Base UI but would clash with Button's color prop
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip only
            const { color, ...buttonProps } = props;
            return (
              <Button
                {...(buttonProps as unknown as NativeButtonProps)}
                id="create-markets-selector"
                type="button"
                variant="secondary"
                icon={<Globe size={16} weight="regular" aria-hidden />}
                size="sm"
                className={selectStyles.triggerButton}
                classNames={{
                  inner: selectStyles.triggerButtonInner,
                  content: selectStyles.triggerButtonContent,
                  ellipsisText: selectStyles.triggerButtonEllipsisText,
                }}
              >
                {summary}
                <span className={selectStyles.chevron}>
                  <CaretDownIcon size={16} />
                </span>
              </Button>
            );
          }}
        />

        <Popover.Portal>
          <Popover.Positioner sideOffset={4} className={selectStyles.positioner}>
            <Popover.Popup className={selectStyles.popup} initialFocus={false}>
              <div
                className={cn(selectStyles.list, styles.marketsMultiList)}
                role="listbox"
                aria-label="Markets"
                aria-multiselectable
              >
                {MOCK_MARKETS.map((m) => (
                  <label key={m.id} className={styles.marketsMultiRow}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={() => toggleMarket(m.id)}
                      className={styles.marketsMultiCheckbox}
                    />
                    <span className={styles.marketsMultiLabel}>{m.label}</span>
                  </label>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
