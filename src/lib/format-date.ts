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
