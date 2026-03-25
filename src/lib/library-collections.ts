import { MOCK_LIBRARY_ASSETS } from '@/lib/mock-data';

/** Effective collection IDs for an asset (mock + membership overrides). */
export function getCollectionIdsForAsset(
  assetId: string,
  membership: Record<string, string[]>
): string[] {
  const o = membership[assetId];
  if (o !== undefined) return [...o];
  const asset = MOCK_LIBRARY_ASSETS.find((a) => a.id === assetId);
  return asset?.libraryCollectionId ? [asset.libraryCollectionId] : [];
}

export function countLikedAssetsInCollection(
  collectionId: string,
  likedIds: Set<string>,
  membership: Record<string, string[]>
): number {
  let n = 0;
  for (const a of MOCK_LIBRARY_ASSETS) {
    if (!likedIds.has(a.id)) continue;
    if (getCollectionIdsForAsset(a.id, membership).includes(collectionId)) n++;
  }
  return n;
}
