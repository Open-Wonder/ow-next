'use client';

import { Combobox } from '@base-ui/react/combobox';
import {
  CaretDown as CaretDownIcon,
  Check as CheckIcon,
  MagnifyingGlass as MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import cn from 'classnames';
import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/common/Button';
import styles from './Select.module.css';

type Option = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  imageUrl?: string;
  description?: string;
  previews?: string[];
};

type ItemValue = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  imageUrl?: string;
  description?: string;
  previews?: string[];
};

type GroupedItemValue = {
  value: string;
  items: ItemValue[];
};

type SelectProps = {
  id: string;
  label?: string;
  error?: string | null;
  placeholder?: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Prefix shown on trigger before selected label (e.g. "Product · ") */
  triggerPrefix?: string;
  /** Hide the dropdown chevron in trigger button. */
  hideChevron?: boolean;
  /** Optional icon shown when no value is selected. */
  placeholderIcon?: React.ReactNode;
};

export default function CustomSelect({
  id,
  label,
  error,
  placeholder = 'Select an option',
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  required = false,
  className,
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  triggerPrefix,
  hideChevron = false,
  placeholderIcon,
}: SelectProps) {
  const formGroupClasses = cn(styles.formGroup, className);

  const groupedOptions = options.reduce<Record<string, Option[]>>(
    (acc, opt) => {
      const group = opt.group || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
    },
    {}
  );

  const hasGroups = options.some((o) => o.group);

  const flatItems: ItemValue[] = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    disabled: opt.disabled,
    icon: opt.icon,
    imageUrl: opt.imageUrl,
    description: opt.description,
    previews: opt.previews,
  }));

  const groupedItems: GroupedItemValue[] | undefined = hasGroups
    ? Object.entries(groupedOptions).map(([groupLabel, groupOpts]) => ({
        value: groupLabel,
        items: groupOpts.map((opt) => ({
          value: opt.value,
          label: opt.label,
          disabled: opt.disabled,
          icon: opt.icon,
          imageUrl: opt.imageUrl,
        })),
      }))
    : undefined;

  const items = searchable ? flatItems : (groupedItems || flatItems);

  const isControlled = value !== undefined;

  const currentItemValue = isControlled
    ? (flatItems.find((item) => item.value === value) ?? null)
    : undefined;

  const defaultItemValue = defaultValue
    ? flatItems.find((item) => item.value === defaultValue)
    : undefined;

  const selectedOption = isControlled
    ? flatItems.find((item) => item.value === value)
    : undefined;

  const filterFunction = searchable
    ? (itemValue: ItemValue, query: string) => {
        const searchQuery = query.toLowerCase().trim();
        if (!searchQuery) return true;
        const itemLabel = itemValue.label.toLowerCase();
        return itemLabel.includes(searchQuery);
      }
    : null;

  return (
    <div className={formGroupClasses}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}

      <Combobox.Root<ItemValue>
        items={items as ItemValue[] | GroupedItemValue[]}
        value={currentItemValue}
        defaultValue={defaultItemValue}
        onValueChange={(newValue) => {
          if (newValue !== null && onValueChange) {
            onValueChange(newValue.value);
          }
        }}
        disabled={disabled}
        required={required}
        filter={filterFunction}
      >
        <Combobox.Trigger
          render={(props) => {
            const { color, ...buttonProps } = props;
            void color;
            const displayValue =
              triggerPrefix && selectedOption
                ? `${triggerPrefix}${selectedOption.label}`
                : undefined;
            return (
              <Button
                {...(buttonProps as React.ComponentProps<typeof Button>)}
                id={id}
                variant="secondary"
                icon={
                  selectedOption?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedOption.imageUrl} alt="" className={styles.triggerImage} />
                  ) : selectedOption?.icon ? (
                    (() => {
                      const Icon = selectedOption.icon!;
                      return <Icon width={16} height={16} />;
                    })()
                  ) : !selectedOption ? (
                    placeholderIcon
                  ) : undefined
                }
                size={size === 'lg' ? 'md' : size}
                disabled={disabled}
                className={cn(
                  styles.triggerButton,
                  size === 'lg' && styles.triggerButtonLg
                )}
                classNames={{
                  inner: styles.triggerButtonInner,
                  content: styles.triggerButtonContent,
                  ellipsisText: styles.triggerButtonEllipsisText,
                }}
              >
                {displayValue !== undefined ? (
                  displayValue
                ) : (
                  <Combobox.Value placeholder={placeholder} />
                )}
                {!hideChevron && (
                  <span className={styles.chevron}>
                    <CaretDownIcon size={16} />
                  </span>
                )}
              </Button>
            );
          }}
        />

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className={styles.positioner}>
            <Combobox.Popup className={styles.popup}>
              {searchable && (
                <div className={styles.searchInputWrapper}>
                  <MagnifyingGlassIcon
                    size={16}
                    className={styles.searchIcon}
                  />
                  <Combobox.Input
                    placeholder={searchPlaceholder}
                    className={styles.searchInput}
                  />
                </div>
              )}

              <Combobox.Empty className={styles.emptyState}>
                {emptyMessage}
              </Combobox.Empty>

              <Combobox.List className={styles.list}>
                {hasGroups && !searchable
                  ? (groupedItems || []).map((group) => (
                      <Combobox.Group
                        key={group.value}
                        items={group.items}
                        className={styles.group}
                      >
                        {group.value && (
                          <Combobox.GroupLabel className={styles.groupLabel}>
                            {group.value}
                          </Combobox.GroupLabel>
                        )}
                        <Combobox.Collection>
                          {(item: ItemValue) => (
                            <ComboboxItem
                              key={item.value}
                              value={item}
                              disabled={item.disabled}
                              icon={item.icon}
                              imageUrl={item.imageUrl}
                            >
                              {item.label}
                            </ComboboxItem>
                          )}
                        </Combobox.Collection>
                      </Combobox.Group>
                    ))
                  : (item: ItemValue) => (
                      <ComboboxItem
                        key={item.value}
                        value={item}
                        disabled={item.disabled}
                        icon={item.icon}
                        imageUrl={item.imageUrl}
                      >
                        {item.label}
                      </ComboboxItem>
                    )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}

type ComboboxItemProps = {
  children: React.ReactNode;
  value: ItemValue;
  disabled?: boolean;
  className?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  imageUrl?: string;
};

const ComboboxItem = React.forwardRef<
  HTMLDivElement,
  ComboboxItemProps & { className?: string }
>(
  (
    { children, value, disabled, className, icon: Icon, imageUrl, ...props },
    forwardedRef
  ) => {
    const [showPreview, setShowPreview] = React.useState(false);
    const [portalPosition, setPortalPosition] = React.useState<{ top: number; left: number } | null>(
      null
    );
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const handleMouseEnter = React.useCallback(() => {
      if (!value.previews?.length && !value.description) return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          setPortalPosition({
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
          });
        }
        setShowPreview(true);
        timeoutRef.current = null;
      }, 150);
    }, [value.description, value.previews]);

    const handleMouseLeave = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setShowPreview(false);
    }, []);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const leadingContent = imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className={styles.itemImage} />
    ) : Icon ? (
      <Icon width={16} height={16} />
    ) : null;

    return (
      <>
        <Combobox.Item
          className={cn(styles.item, className)}
          value={value}
          disabled={disabled}
          ref={forwardedRef}
          {...props}
        >
          <div
            ref={wrapperRef}
            className={styles.itemHoverTarget}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={styles.itemContent}>
              <Button
                variant="text"
                size="md"
                disabled={disabled}
                className={styles.itemButton}
                classNames={{
                  inner: styles.itemButtonInner,
                  content: styles.itemButtonContent,
                  ellipsisText: styles.itemButtonEllipsisText,
                }}
                icon={leadingContent}
              >
                {children}
              </Button>
            </div>
          </div>
          <Combobox.ItemIndicator className={styles.itemIndicator}>
            <CheckIcon size={16} />
          </Combobox.ItemIndicator>
        </Combobox.Item>
        {typeof document !== 'undefined' &&
          showPreview &&
          portalPosition &&
          createPortal(
            <div
              className={styles.previewCard}
              style={{ top: portalPosition.top, left: portalPosition.left }}
            >
              {value.previews && value.previews.length > 0 && (
                <div className={styles.previewImages}>
                  {value.previews.slice(0, 3).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className={styles.previewImage} />
                  ))}
                </div>
              )}
              <div className={styles.previewName}>{value.label}</div>
              {value.description && (
                <div className={styles.previewDescription}>{value.description}</div>
              )}
            </div>,
            document.body
          )}
      </>
    );
  }
);

ComboboxItem.displayName = 'ComboboxItem';
