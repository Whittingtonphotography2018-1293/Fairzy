import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Mail, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  turnListId: string;
  turnListName: string;
  onInviteSent: () => void;
}

export function InviteMemberModal({ visible, onClose, turnListId, turnListName, onInviteSent }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setError("You can't invite yourself");
      return;
    }

    setSending(true);
    setError('');

    try {
      const { data: existingInvite } = await supabase
        .from('turn_list_invitations')
        .select('id, status')
        .eq('turn_list_id', turnListId)
        .eq('invited_email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingInvite) {
        if (existingInvite.status === 'pending') {
          setError('This user has already been invited');
          setSending(false);
          return;
        } else if (existingInvite.status === 'accepted') {
          setError('This user is already a collaborator');
          setSending(false);
          return;
        }
      }

      const { error: inviteError } = await supabase
        .from('turn_list_invitations')
        .insert({
          turn_list_id: turnListId,
          invited_by: user!.id,
          invited_email: email.trim().toLowerCase(),
          status: 'pending',
        });

      if (inviteError) throw inviteError;

      setSuccess(true);
      setEmail('');
      setTimeout(() => {
        setSuccess(false);
        onInviteSent();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error sending invite:', error);
      setError(error.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Invite Collaborator</Text>
              <Text style={styles.modalSubtitle}>{turnListName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Invitation sent!</Text>
            </View>
          ) : null}

          <View style={styles.modalForm}>
            <View style={styles.infoBox}>
              <UserPlus size={20} color="#007AFF" strokeWidth={2} />
              <Text style={styles.infoText}>
                Invite someone with an account to collaborate on this turn list. They'll be able to view and manage turns together with you.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Mail size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                editable={!sending}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.inviteButton, sending && styles.buttonDisabled]}
              onPress={handleSendInvite}
              disabled={sending || success}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Mail size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.inviteButtonText}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modalForm: {
    gap: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});
