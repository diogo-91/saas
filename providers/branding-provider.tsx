'use client';

import { createContext, useContext, ReactNode } from 'react';

export type Branding = {
  id: number;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
} | null;

type BrandingContextType = {
  branding: Branding;
};

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
});

export function BrandingProvider({
  children,
  branding,
}: {
  children: ReactNode;
  branding: Branding;
}) {
  return (
    <BrandingContext.Provider value={{ branding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextType {
  return useContext(BrandingContext);
}
