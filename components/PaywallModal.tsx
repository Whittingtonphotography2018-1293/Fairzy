import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Crown, Image as ImageIcon, Mail, ListPlus } from 'lucide-react-native';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { RevenueCatUI } from 'react-native-purchases-ui';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: 'multiple_lists' | 'photos' | 'invites';
}

const featureConfig = {
  multiple_lists: {
    icon: ListPlus,
    title: 'Create Unlimited Lists',
    description: 'You\'ve reached the free tier limit of 1 turn list. Upgrade to Premium to create unlimited lists.',
  },
  photos: {
    icon: ImageIcon,
    title: 'Add Member Photos',
    description: 'Personalize your turn lists with member photos. This feature is available with Premium.',
  },
  invites: {
    icon: Mail,
    title: 'Invite Collaborators',
    description: 'Share your turn lists with others. Invite collaborators with Premium.',
  },
};

export function PaywallModal({ visible, onClose, feature = 'multiple_lists' }: PaywallModalProps) {
  const config = featureConfig[feature];
  const Icon = config.icon;
  const { offerings, isPremium, restorePurchases } = useRevenueCat();
  const [showNativePaywall, setShowNativePaywall] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showWebConfirm, setShowWebConfirm] = useState(false);

  useEffect(() => {
    if (isPremium && visible) {
      onClose();
    }
  }, [isPremium, visible]);

  const handleUpgrade = async () => {
    if (Platform.OS === 'web') {
      setShowWebConfirm(true);
      return;
    }

    console.log('[Paywall] handleUpgrade called, offerings:', offerings);

    if (!offerings) {
      Alert.alert(
        'Setup Required',
        'RevenueCat offerings not configured yet.\n\nSteps to fix:\n1. Create a Product in RevenueCat dashboard\n2. Create a Package in an Offering\n3. Make sure your Entitlement is named "Fairzy Pro"'
      );
      return;
    }

    try {
      console.log('[Paywall] Presenting paywall for offering:', offerings.identifier);
      setShowNativePaywall(true);
      const paywallResult = await RevenueCatUI.presentPaywall({
        offering: offerings,
      });

      console.log('[Paywall] Result:', paywallResult);

      if (paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED) {
        Alert.alert('Success', 'Welcome to Fairzy Premium!');
        onClose();
      } else if (paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED) {
        Alert.alert('Success', 'Your subscription has been restored!');
        onClose();
      }
    } catch (error: any) {
      console.error('[Paywall] Error presenting paywall:', error);
      Alert.alert('Error', `Failed to load payment options: ${error.message || 'Unknown error'}`);
    } finally {
      setShowNativePaywall(false);
    }
  };

  const handleSimulatePurchase = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fairzy_demo_premium', 'true');
      window.location.reload();
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Purchase restoration is only available on iOS and Android.'
      );
      return;
    }

    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      Alert.alert('Success', 'Your subscription has been restored!');
      onClose();
    } else {
      Alert.alert(
        'No Subscriptions Found',
        result.error || 'No active subscriptions were found to restore.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {Platform.OS === 'web' && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerText}>WEB DEMO MODE</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>

          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.iconContainer}
          >
            <Crown size={40} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>

          <Text style={styles.title}>Upgrade to Premium</Text>

          <View style={styles.featureHighlight}>
            <Icon size={24} color="#007AFF" strokeWidth={2} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{config.title}</Text>
              <Text style={styles.featureDescription}>{config.description}</Text>
            </View>
          </View>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Premium Benefits</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" strokeWidth={3} />
                </View>
                <Text style={styles.benefitText}>Create unlimited turn lists</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" strokeWidth={3} />
                </View>
                <Text style={styles.benefitText}>Add photos to members</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" strokeWidth={3} />
                </View>
                <Text style={styles.benefitText}>Invite collaborators</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" strokeWidth={3} />
                </View>
                <Text style={styles.benefitText}>Priority support</Text>
              </View>
            </View>
          </View>

          <View style={styles.pricing}>
            <Text style={styles.priceAmount}>$4.99</Text>
            <Text style={styles.pricePeriod}>/ month</Text>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.8}
            disabled={showNativePaywall}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.upgradeButtonGradient}
            >
              {showNativePaywall ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Crown size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            activeOpacity={0.7}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <Text style={styles.note}>
              Subscriptions are available on iOS and Android apps only.
            </Text>
          )}
        </View>
      </View>

      {/* Web Demo Confirmation Modal */}
      {Platform.OS === 'web' && showWebConfirm && (
        <View style={styles.webConfirmOverlay}>
          <View style={styles.webConfirmContent}>
            <Text style={styles.webConfirmTitle}>Demo Mode - Web Preview</Text>
            <Text style={styles.webConfirmMessage}>
              You're in web preview mode. On a real device, this would open the native payment sheet.
              {'\n\n'}
              Would you like to simulate a successful purchase for testing?
            </Text>
            <View style={styles.webConfirmButtons}>
              <TouchableOpacity
                style={styles.webConfirmCancelButton}
                onPress={() => setShowWebConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.webConfirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.webConfirmPurchaseButton}
                onPress={handleSimulatePurchase}
                activeOpacity={0.7}
              >
                <Text style={styles.webConfirmPurchaseText}>Simulate Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#F0F7FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '500',
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  benefitsList: {
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
    gap: 4,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  note: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    lineHeight: 16,
  },
  demoBanner: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginHorizontal: -24,
    marginTop: -32,
    marginBottom: 24,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  webConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webConfirmContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  webConfirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  webConfirmMessage: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  webConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  webConfirmCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  webConfirmCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  webConfirmPurchaseButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  webConfirmPurchaseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
