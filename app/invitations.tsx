import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Check, X, Clock } from 'lucide-react-native';

interface Invitation {
  id: string;
  turn_list_id: string;
  invited_by: string;
  invited_email: string;
  status: string;
  created_at: string;
  turn_list_name?: string;
  inviter_name?: string;
}

export default function Invitations() {
  const router = useRouter();
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user?.email) return;

    try {
      const { data: invitationsData, error } = await supabase
        .from('turn_list_invitations')
        .select('*')
        .eq('invited_email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (invitationsData && invitationsData.length > 0) {
        const enrichedInvitations = await Promise.all(
          invitationsData.map(async (invitation) => {
            const listResult = await supabase
              .from('turn_lists')
              .select('name')
              .eq('id', invitation.turn_list_id)
              .maybeSingle();

            return {
              ...invitation,
              turn_list_name: listResult.data?.name || 'Unknown List',
              inviter_name: 'Someone',
            };
          })
        );

        setInvitations(enrichedInvitations);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    setProcessingId(invitation.id);

    try {
      const { error: collaboratorError } = await supabase
        .from('turn_list_collaborators')
        .insert({
          turn_list_id: invitation.turn_list_id,
          user_id: user!.id,
          role: 'member',
        });

      if (collaboratorError) throw collaboratorError;

      const { error: updateError } = await supabase
        .from('turn_list_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      await loadInvitations();
      router.push(`/turn-list/${invitation.turn_list_id}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);

    try {
      const { error } = await supabase
        .from('turn_list_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      await loadInvitations();
    } catch (error: any) {
      console.error('Error declining invitation:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const renderInvitation = ({ item }: { item: Invitation }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.invitationCard}>
        <View style={styles.invitationHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#E5F3FF', '#B3D9FF']}
              style={styles.iconGradient}
            >
              <Mail size={24} color="#007AFF" strokeWidth={2} />
            </LinearGradient>
          </View>
          <View style={styles.invitationContent}>
            <Text style={styles.invitationTitle}>{item.turn_list_name}</Text>
            <View style={styles.invitationMeta}>
              <Text style={styles.invitationFrom}>
                From {item.inviter_name}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.invitationDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.invitationDescription}>
          You've been invited to collaborate on this turn list. Accept to view and manage turns together.
        </Text>

        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleDeclineInvitation(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <>
                <X size={18} color="#64748B" strokeWidth={2.5} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleAcceptInvitation(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Invitations</Text>
          <Text style={styles.headerSubtitle}>
            {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['#F0F7FF', '#E5F2FF']}
              style={styles.emptyIconBackground}
            >
              <Mail size={48} color="#007AFF" strokeWidth={2} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Invitations</Text>
          <Text style={styles.emptyText}>
            When someone invites you to collaborate on a turn list, you'll see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationContent: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationFrom: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  invitationDate: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  invitationDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: '#F1F5F9',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  emptyIconWrapper: {
    marginBottom: 32,
  },
  emptyIconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
