import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, Mail, User as UserIcon, Shield, HelpCircle, MessageSquare, Trash2, AlertTriangle, X, Inbox } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      console.log('Sign out button clicked');
      await signOut();
      console.log('Sign out completed');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc('delete_user');

      if (error) throw error;

      await signOut();
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleting(false);
    }
  };

  const displayName = user?.user_metadata?.display_name || 'User';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FBFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#E3F2FD', '#BBDEFB']}
            style={styles.avatarContainer}
          >
            <UserIcon size={56} color="#0EA5E9" strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.displayName}>{displayName}</Text>
          <View style={styles.emailContainer}>
            <Mail size={18} color="#64748B" strokeWidth={2} />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Shield size={14} color="#10B981" strokeWidth={2.5} />
            <Text style={styles.verifiedText}>Verified Account</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <TouchableOpacity
            style={styles.invitationsButton}
            onPress={() => router.push('/invitations')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.invitationsIconContainer}>
                <Inbox size={22} color="#8B5CF6" strokeWidth={2.2} />
              </View>
              <Text style={styles.invitationsButtonText}>View Invitations</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => router.push('/feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.feedbackIconContainer}>
                <MessageSquare size={22} color="#10B981" strokeWidth={2.2} />
              </View>
              <Text style={styles.feedbackButtonText}>Send Feedback</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/support')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.supportIconContainer}>
                <HelpCircle size={22} color="#007AFF" strokeWidth={2.2} />
              </View>
              <Text style={styles.supportButtonText}>Support & Terms</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconContainer}>
                <LogOut size={22} color="#EF4444" strokeWidth={2.2} />
              </View>
              <Text style={styles.buttonText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleting}
          >
            <View style={styles.buttonContent}>
              {deleting ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <>
                  <View style={styles.deleteIconContainer}>
                    <Trash2 size={22} color="#DC2626" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Fairzy v1.0</Text>
          <Text style={styles.footerSubtext}>Track turns with elegance</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => !deleting && setShowDeleteModal(false)}
              disabled={deleting}
            >
              <X size={24} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <AlertTriangle size={48} color="#DC2626" strokeWidth={2} />
            </View>

            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete your account? This will permanently delete all your turn lists, history, and data. This action cannot be undone.
            </Text>

            {deleteError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 32,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  displayName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  email: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  invitationsButton: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    marginBottom: 12,
  },
  invitationsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationsButtonText: {
    fontSize: 17,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  feedbackButton: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1FAE5',
    marginBottom: 12,
  },
  feedbackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontSize: 17,
    color: '#10B981',
    fontWeight: '700',
  },
  supportButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  supportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    color: '#EF4444',
    fontWeight: '700',
  },
  dangerZone: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  deleteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 17,
    color: '#DC2626',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalIconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
