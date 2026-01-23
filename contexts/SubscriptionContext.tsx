import React, { createContext, useContext, useState } from 'react';

interface SubscriptionContextType {
  isPremium: boolean;
  checkPremiumFeature: (feature: 'multiple_lists' | 'photos' | 'invites') => boolean;
  setPremium: (value: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  const checkPremiumFeature = (feature: 'multiple_lists' | 'photos' | 'invites') => {
    return isPremium;
  };

  const setPremium = (value: boolean) => {
    setIsPremium(value);
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, checkPremiumFeature, setPremium }}>
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
