import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Check, X, Users, Inbox } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

interface Invite {
  id: string;
  turn_list_id: string;
  invited_by: string;
  invited_email: string;
  status: string;
  created_at: string;
  turn_list: {
    name: string;
    category: string;
  };
  inviter: {
    email: string;
    user_metadata: {
      display_name?: string;
    };
  };
}

export default function Invites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadInvites();

    const channel = supabase
      .channel('invite-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turn_list_invites',
          filter: `invited_email=eq.${user?.email}`,
        },
        () => {
          loadInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('turn_list_invites')
        .select(`
          *,
          turn_list:turn_lists!inner(name, category),
          inviter:auth.users!turn_list_invites_invited_by_fkey(email, user_metadata)
        `)
        .eq('invited_email', user?.email || '')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      console.error('Error loading invites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvites();
  };

  const handleAccept = async (invite: Invite) => {
    setResponding(invite.id);
    try {
      const { error: updateError } = await supabase
        .from('turn_list_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          invited_user_id: user!.id,
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      const { data: existingMembers } = await supabase
        .from('turn_list_members')
        .select('position')
        .eq('turn_list_id', invite.turn_list_id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingMembers && existingMembers.length > 0
        ? existingMembers[0].position + 1
        : 0;

      const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

      const { error: memberError } = await supabase
        .from('turn_list_members')
        .insert({
          turn_list_id: invite.turn_list_id,
          user_id: user!.id,
          display_name: displayName,
          position: nextPosition,
        });

      if (memberError) throw memberError;

      await loadInvites();
      router.push(`/turn-list/${invite.turn_list_id}`);
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invitation. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setResponding(inviteId);
    try {
      const { error } = await supabase
        .from('turn_list_invites')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
      await loadInvites();
    } catch (error: any) {
      console.error('Error declining invite:', error);
      alert('Failed to decline invitation');
    } finally {
      setResponding(null);
    }
  };

  const renderInvite = ({ item }: { item: Invite }) => {
    const inviterName = item.inviter?.user_metadata?.display_name ||
                        item.inviter?.email?.split('@')[0] ||
                        'Someone';
    const isResponding = responding === item.id;

    return (
      <View style={styles.inviteCard}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FBFF']}
          style={styles.inviteGradient}
        >
          <View style={styles.inviteIconContainer}>
            <LinearGradient
              colors={['#E5F3FF', '#B3D9FF']}
              style={styles.inviteIconGradient}
            >
              <Mail size={24} color="#007AFF" strokeWidth={2} />
            </LinearGradient>
          </View>

          <View style={styles.inviteContent}>
            <Text style={styles.inviteName}>{item.turn_list.name}</Text>
            {item.turn_list.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.turn_list.category}</Text>
              </View>
            ) : null}
            <Text style={styles.inviteFrom}>
              Invited by {inviterName}
            </Text>
            <Text style={styles.inviteDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton, isResponding && styles.buttonDisabled]}
              onPress={() => handleAccept(item)}
              disabled={isResponding}
              activeOpacity={0.8}
            >
              {isResponding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Check size={22} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton, isResponding && styles.buttonDisabled]}
              onPress={() => handleDecline(item.id)}
              disabled={isResponding}
              activeOpacity={0.8}
            >
              <X size={22} color="#64748B" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

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
        <View style={styles.headerContent}>
          <Mail size={28} color="#007AFF" strokeWidth={2.5} />
          <Text style={styles.headerTitle}>Invitations</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Join turn lists shared with you
        </Text>
      </LinearGradient>

      {invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Inbox size={80} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No Pending Invitations</Text>
          <Text style={styles.emptyText}>
            When someone invites you to join their turn list, it will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          renderItem={renderInvite}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 28,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
  },
  inviteCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inviteGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  inviteIconContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteIconGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteContent: {
    flex: 1,
  },
  inviteName: {
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
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  inviteFrom: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inviteActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#F1F5F9',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});
