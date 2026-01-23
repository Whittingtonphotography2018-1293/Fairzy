import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isPremium: boolean;
  isLoading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const REVENUECAT_API_KEY = 'test_vmUYGIiTrkqAACJywKYnHCfTqoE';
const ENTITLEMENT_ID = 'Fairzy Pro';

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    initializeRevenueCat();
  }, [user]);

  const initializeRevenueCat = async () => {
    try {
      if (Platform.OS === 'web') {
        console.log('RevenueCat not supported on web, using mock data');
        setIsLoading(false);
        return;
      }

      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: user?.id,
      });

      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      checkPremiumStatus(info);

      const availableOfferings = await Purchases.getOfferings();
      if (availableOfferings.current) {
        setOfferings(availableOfferings.current);
      }

      Purchases.addCustomerInfoUpdateListener((info) => {
        setCustomerInfo(info);
        checkPremiumStatus(info);
      });
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPremiumStatus = (info: CustomerInfo) => {
    const hasPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    setIsPremium(hasPremium);
  };

  const purchasePackage = async (
    pkg: PurchasesPackage
  ): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'RevenueCat not supported on web' };
    }

    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      checkPremiumStatus(info);
      return { success: true };
    } catch (error: any) {
      console.error('Error purchasing package:', error);

      if (error.userCancelled) {
        return { success: false, error: 'Purchase cancelled' };
      }

      return { success: false, error: error.message || 'Purchase failed' };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'RevenueCat not supported on web' };
    }

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      checkPremiumStatus(info);

      const hasPremium = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';

      if (hasPremium) {
        return { success: true };
      } else {
        return { success: false, error: 'No active subscriptions found' };
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: error.message || 'Failed to restore purchases' };
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        offerings,
        isPremium,
        isLoading,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
}
