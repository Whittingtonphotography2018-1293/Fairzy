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
import { X, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  turnListId: string;
  turnListName: string;
  onMemberAdded: () => void;
}

export function AddMemberModal({ visible, onClose, turnListId, turnListName, onMemberAdded }: Props) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleAddMember = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const { data: existingMembers } = await supabase
        .from('turn_list_members')
        .select('position')
        .eq('turn_list_id', turnListId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingMembers && existingMembers.length > 0
        ? existingMembers[0].position + 1
        : 0;

      const { error: memberError } = await supabase
        .from('turn_list_members')
        .insert({
          turn_list_id: turnListId,
          user_id: user!.id,
          display_name: name.trim(),
          position: nextPosition,
        });

      if (memberError) throw memberError;

      setName('');
      onMemberAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding member:', error);
      setError(error.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
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
              <Text style={styles.modalTitle}>Add Member</Text>
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
                editable={!adding}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <Text style={styles.helpText}>
              Add someone to the list without requiring an account
            </Text>

            <TouchableOpacity
              style={[styles.addButton, adding && styles.buttonDisabled]}
              onPress={handleAddMember}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.addButtonText}>Add Member</Text>
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
  helpText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
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
