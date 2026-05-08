/**
 * Relative time for session lists (e.g. Creation History).
 * Matches prior ChatSessionHistory behavior.
 */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Compact age for sidebar history: minutes (1M), hours (1H), days (2D), then short date. */
export function formatSessionHistoryTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffMin < 60) {
    const m = Math.max(1, diffMin);
    return `${m}M`;
  }
  if (diffHrs < 24) {
    const h = Math.floor(diffMin / 60);
    return `${Math.max(1, h)}H`;
  }
  const days = Math.floor(diffHrs / 24);
  if (days < 7) {
    return `${days}D`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
