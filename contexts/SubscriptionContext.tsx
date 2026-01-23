import React, { createContext, useContext } from 'react';
import { useRevenueCat } from './RevenueCatContext';

interface SubscriptionContextType {
  isPremium: boolean;
  checkPremiumFeature: (feature: 'multiple_lists' | 'photos' | 'invites') => boolean;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isPremium, isLoading } = useRevenueCat();

  const checkPremiumFeature = (feature: 'multiple_lists' | 'photos' | 'invites') => {
    return isPremium;
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, checkPremiumFeature, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
