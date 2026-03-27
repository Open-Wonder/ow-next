'use client';

import cn from 'classnames';
import styles from './Tag.module.css';

export type TagSize = 'xs' | 's' | 'm' | 'meta';
export type TagTone = 'neutral' | 'success';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** xs / s / m = density; meta = same font size as History sidebar session meta line (time + tag row) */
  size?: TagSize;
  /** neutral = gray (chat/search tags), success = library / positive */
  tone?: TagTone;
  /** Left icon (e.g. Phosphor icon with size matching `size`) */
  icon?: React.ReactNode;
}

/** Icon pixel sizes for Phosphor icons paired with each tag size */
export const TAG_ICON_SIZE: Record<TagSize, number> = {
  xs: 10,
  s: 12,
  m: 14,
  meta: 11,
};

export default function Tag({
  size = 'm',
  tone = 'neutral',
  className,
  icon,
  children,
  ...rest
}: TagProps) {
  return (
    <span
      className={cn(styles.tag, styles[`size_${size}`], styles[`tone_${tone}`], className)}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children != null && <span className={styles.label}>{children}</span>}
    </span>
  );
}
