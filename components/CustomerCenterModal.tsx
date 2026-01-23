import React, { useState } from 'react';
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
import { X, Crown, Check, Calendar, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { RevenueCatUI } from 'react-native-purchases-ui';

interface CustomerCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CustomerCenterModal({ visible, onClose }: CustomerCenterModalProps) {
  const { customerInfo, isPremium } = useRevenueCat();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Subscription management is only available on iOS and Android apps.'
      );
      return;
    }

    try {
      setLoading(true);
      await RevenueCatUI.presentCustomerCenter();
    } catch (error: any) {
      console.error('Error presenting customer center:', error);
      Alert.alert('Error', 'Failed to load subscription management. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionInfo = () => {
    if (!isPremium || !customerInfo) {
      return null;
    }

    const entitlement = customerInfo.entitlements.active['Fairzy Pro'];
    if (!entitlement) return null;

    const expirationDate = entitlement.expirationDate
      ? new Date(entitlement.expirationDate)
      : null;
    const willRenew = entitlement.willRenew;
    const productId = entitlement.productIdentifier;

    let planName = 'Premium';
    if (productId.includes('weekly')) planName = 'Weekly';
    else if (productId.includes('monthly')) planName = 'Monthly';
    else if (productId.includes('yearly')) planName = 'Yearly';

    return {
      planName,
      expirationDate,
      willRenew,
    };
  };

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>

          {isPremium ? (
            <>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.iconContainer}
              >
                <Crown size={40} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>

              <Text style={styles.title}>Fairzy Premium</Text>
              <Text style={styles.subtitle}>Active Subscription</Text>

              {subscriptionInfo && (
                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <CreditCard size={20} color="#007AFF" strokeWidth={2} />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Current Plan</Text>
                      <Text style={styles.infoValue}>{subscriptionInfo.planName}</Text>
                    </View>
                  </View>

                  {subscriptionInfo.expirationDate && (
                    <View style={styles.infoRow}>
                      <Calendar size={20} color="#007AFF" strokeWidth={2} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>
                          {subscriptionInfo.willRenew ? 'Renews On' : 'Expires On'}
                        </Text>
                        <Text style={styles.infoValue}>
                          {subscriptionInfo.expirationDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Active Benefits</Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <View style={styles.checkContainer}>
                      <Check size={16} color="#10B981" strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitText}>Unlimited turn lists</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.checkContainer}>
                      <Check size={16} color="#10B981" strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitText}>Member photos</Text>
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

              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageSubscription}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Text style={styles.manageButtonText}>Manage Subscription</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconContainerGray}>
                <Crown size={40} color="#94A3B8" strokeWidth={2.5} />
              </View>

              <Text style={styles.title}>No Active Subscription</Text>
              <Text style={styles.subtitle}>Upgrade to unlock premium features</Text>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Premium Benefits</Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <View style={styles.checkContainer}>
                      <Check size={16} color="#10B981" strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitText}>Unlimited turn lists</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.checkContainer}>
                      <Check size={16} color="#10B981" strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitText}>Member photos</Text>
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

              <TouchableOpacity
                style={styles.closeOnlyButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeOnlyButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}

          {Platform.OS === 'web' && (
            <Text style={styles.note}>
              Subscription management is available on iOS and Android apps only.
            </Text>
          )}
        </View>
      </View>
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
  iconContainerGray: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
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
  manageButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeOnlyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeOnlyButtonText: {
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
});
