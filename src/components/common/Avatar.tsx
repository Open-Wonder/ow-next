import cn from 'classnames';
import styles from './Avatar.module.css';

type AvatarProps = {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

function getFirstLetter(name: string) {
  return (name?.trim().charAt(0) || '?').toUpperCase();
}

export default function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(styles.avatar, styles[size], className)}>
      <span className={styles.initials}>{getFirstLetter(name || '')}</span>
    </div>
  );
}
