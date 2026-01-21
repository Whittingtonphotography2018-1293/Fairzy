import { useState, useEffect } from 'react';
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
import { X, Save } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { MemberImagePicker } from './MemberImagePicker';

interface Member {
  id: string;
  display_name: string;
  photo_url: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
  turnListName: string;
  onMemberUpdated: () => void;
}

export function EditMemberModal({ visible, onClose, member, turnListName, onMemberUpdated }: Props) {
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setName(member.display_name);
      setPhotoUrl(member.photo_url);
    }
  }, [member]);

  const handleUpdateMember = async () => {
    if (!member) return;

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('turn_list_members')
        .update({
          display_name: name.trim(),
          photo_url: photoUrl,
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      onMemberUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (member) {
      setName(member.display_name);
      setPhotoUrl(member.photo_url);
    }
    setError('');
    onClose();
  };

  if (!member) return null;

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
              <Text style={styles.modalTitle}>Edit Member</Text>
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

          <View style={styles.modalForm}>
            <View style={styles.photoSection}>
              <MemberImagePicker
                currentPhotoUrl={photoUrl}
                onPhotoSelected={setPhotoUrl}
                size={100}
              />
              <Text style={styles.photoHelpText}>
                Tap to change photo
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter member name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError('');
                }}
                editable={!updating}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, updating && styles.buttonDisabled]}
              onPress={handleUpdateMember}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  photoHelpText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  input: {
    padding: 18,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  saveButton: {
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
  saveButtonText: {
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
});
