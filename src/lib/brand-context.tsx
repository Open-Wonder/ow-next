'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { MOCK_BRANDS } from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  initials: string;
  color: string;
  logoUrl?: string;
  description?: string;
  hasAssistant?: boolean;
}

interface BrandContextValue {
  activeBrand: Brand;
  setActiveBrand: (brand: Brand) => void;
  hasAssistant: boolean;
}

// ── Context ────────────────────────────────────────────────────────────

const BrandContext = createContext<BrandContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────

export function BrandProvider({ children }: { children: ReactNode }) {
  const [activeBrandId, setActiveBrandId] = useState(MOCK_BRANDS[0].id);
  const activeBrand = MOCK_BRANDS.find((b) => b.id === activeBrandId) ?? MOCK_BRANDS[0];

  const value = useMemo(
    () => ({
      activeBrand,
      setActiveBrand: (brand: Brand) => setActiveBrandId(brand.id),
      hasAssistant: activeBrand.hasAssistant ?? false,
    }),
    [activeBrand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
