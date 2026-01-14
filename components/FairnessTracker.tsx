import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Users, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

interface MemberStats {
  member_id: string;
  display_name: string;
  user_id: string;
  total_turns: number;
  lists: {
    list_name: string;
    category: string;
    count: number;
  }[];
}

interface FairnessData {
  success: boolean;
  stats: MemberStats[];
  insights: string;
  overall_fairness_score: number;
  total_turns: number;
}

export default function FairnessTracker() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<FairnessData | null>(null);
  const [error, setError] = useState('');
  const { user, session } = useAuth();

  useEffect(() => {
    loadFairnessData();
  }, []);

  const loadFairnessData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/fairness-analysis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Edge function error:', result);
        throw new Error(result.error || 'Failed to load fairness data');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load fairness data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadFairnessData(true);
  };

  const getScoreColor = (score: number): [string, string] => {
    if (score >= 80) return ['#10B981', '#059669'];
    if (score >= 60) return ['#F59E0B', '#D97706'];
    return ['#EF4444', '#DC2626'];
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Balance';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing fairness...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadFairnessData()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const scoreColors = getScoreColor(data.overall_fairness_score);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <BarChart3 size={28} color="#007AFF" strokeWidth={2.5} />
            <Text style={styles.headerTitle}>Fairness Tracker</Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <RefreshCw size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          AI-powered balance analysis across all your turn lists
        </Text>
      </View>

      <View style={styles.scoreCard}>
        <LinearGradient colors={scoreColors} style={styles.scoreGradient}>
          <Text style={styles.scoreLabel}>Overall Fairness</Text>
          <Text style={styles.scoreValue}>{data.overall_fairness_score}</Text>
          <Text style={styles.scoreRating}>{getScoreLabel(data.overall_fairness_score)}</Text>
        </LinearGradient>
      </View>

      {data.insights && (
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <TrendingUp size={20} color="#007AFF" strokeWidth={2} />
            <Text style={styles.insightsTitle}>AI Insights</Text>
          </View>
          <Text style={styles.insightsText}>{data.insights}</Text>
        </View>
      )}

      {data.stats && data.stats.length > 0 ? (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Turn Distribution</Text>
          {data.stats.map((member, index) => {
            const percentage = data.total_turns > 0
              ? ((member.total_turns / data.total_turns) * 100).toFixed(1)
              : '0';

            return (
              <View key={member.member_id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberInfo}>
                    <Users size={20} color="#64748B" />
                    <Text style={styles.memberName}>{member.display_name}</Text>
                  </View>
                  <View style={styles.memberStats}>
                    <Text style={styles.turnCount}>{member.total_turns}</Text>
                    <Text style={styles.turnLabel}>turns</Text>
                    <Text style={styles.percentage}>({percentage}%)</Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` },
                    ]}
                  >
                    <LinearGradient
                      colors={['#007AFF', '#0051D5']}
                      style={styles.progressGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>

                {member.lists && member.lists.length > 0 && (
                  <View style={styles.listBreakdown}>
                    {member.lists.map((list, listIndex) => (
                      <View key={listIndex} style={styles.listItem}>
                        <Text style={styles.listName}>
                          {list.list_name}
                          {list.category && (
                            <Text style={styles.listCategory}> • {list.category}</Text>
                          )}
                        </Text>
                        <Text style={styles.listCount}>{list.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Users size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No turn data yet</Text>
          <Text style={styles.emptySubtext}>
            Start taking turns to see fairness analysis
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Updated in real-time • Based on all your turn lists
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  scoreCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  scoreGradient: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.9,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  scoreRating: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 8,
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  insightsText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '500',
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  turnCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007AFF',
  },
  turnLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  percentage: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
  },
  listBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  listCategory: {
    color: '#94A3B8',
  },
  listCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
