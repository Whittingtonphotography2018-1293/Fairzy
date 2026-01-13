import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X, ChevronRight, Users } from 'lucide-react-native';

interface TurnList {
  id: string;
  name: string;
  category: string;
  created_at: string;
  member_count?: number;
}

export default function Home() {
  const [turnLists, setTurnLists] = useState<TurnList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListCategory, setNewListCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadTurnLists();
  }, []);

  const loadTurnLists = async () => {
    try {
      const { data, error } = await supabase
        .from('turn_lists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTurnLists(data || []);
    } catch (error: any) {
      console.error('Error loading turn lists:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTurnLists();
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setError('Please enter a name');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { data: listData, error: listError } = await supabase
        .from('turn_lists')
        .insert({
          name: newListName.trim(),
          category: newListCategory.trim(),
          created_by: user!.id,
        })
        .select()
        .single();

      if (listError) throw listError;

      const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You';

      const { error: memberError } = await supabase
        .from('turn_list_members')
        .insert({
          turn_list_id: listData.id,
          user_id: user!.id,
          display_name: displayName,
          position: 0,
        });

      if (memberError) throw memberError;

      setModalVisible(false);
      setNewListName('');
      setNewListCategory('');
      loadTurnLists();
      router.push(`/turn-list/${listData.id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  const renderTurnList = ({ item }: { item: TurnList }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/turn-list/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.listCardInner}>
        <View style={styles.listLeftContent}>
          <LinearGradient
            colors={['#E3F2FD', '#BBDEFB']}
            style={styles.listIconContainer}
          >
            <Image
              source={require('@/assets/images/generated-image-1767367222181.png')}
              style={styles.listIcon}
              resizeMode="contain"
            />
          </LinearGradient>
          <View style={styles.listTextContent}>
            <Text style={styles.listName}>{item.name}</Text>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.listCategory}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={22} color="#999999" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FBFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>FAIRZY</Text>
        <Text style={styles.headerSubtitle}>The fun, fair way to share life's turns</Text>
      </LinearGradient>

      {turnLists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['#E8F4FD', '#F0F9FF']}
              style={styles.emptyIconBackground}
            >
              <Users size={80} color="#90CAF9" strokeWidth={1.5} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Welcome to Fairzy</Text>
          <Text style={styles.emptyText}>
            For couples, families, and friends who care about balance and avoiding arguments. Make turn-taking smart, effortless, and surprisingly fun.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#0051D5']}
              style={styles.emptyButtonGradient}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Turn List</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Your Turn Lists</Text>
            <Text style={styles.listHeaderCount}>{turnLists.length} {turnLists.length === 1 ? 'list' : 'lists'}</Text>
          </View>
          <FlatList
            data={turnLists}
            renderItem={renderTurnList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Turn List</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setError('');
                  setNewListName('');
                  setNewListCategory('');
                }}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="List Name (e.g., Dinner Picker)"
                placeholderTextColor="#999"
                value={newListName}
                onChangeText={setNewListName}
                editable={!creating}
              />

              <TextInput
                style={styles.input}
                placeholder="Category (optional)"
                placeholderTextColor="#999"
                value={newListCategory}
                onChangeText={setNewListCategory}
                editable={!creating}
              />

              <TouchableOpacity
                style={[styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateList}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.floatingButtonGradient}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 48,
    color: '#0F172A',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  listWrapper: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  listHeaderCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContainer: {
    padding: 20,
    paddingTop: 8,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  listLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listIcon: {
    width: 36,
    height: 36,
  },
  listTextContent: {
    flex: 1,
    marginLeft: 16,
  },
  listName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  listCategory: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    marginBottom: 32,
  },
  emptyIconBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontWeight: '500',
  },
  emptyButton: {
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
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
    alignItems: 'center',
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  modalForm: {
    gap: 18,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  floatingButtonGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
