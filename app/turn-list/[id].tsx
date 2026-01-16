import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { InviteModal } from '@/components/InviteModal';
import { AddMemberModal } from '@/components/AddMemberModal';
import {
  ArrowLeft,
  UserPlus,
  X,
  Clock,
  Users,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Settings,
  Bell,
  Sparkles,
  MoreVertical,
  Trash2,
  UserMinus,
  Mail,
  User,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

interface TurnList {
  id: string;
  name: string;
  category: string;
  timer_enabled: boolean;
}

interface Member {
  id: string;
  user_id: string;
  display_name: string;
  position: number;
  is_active: boolean;
}

interface HistoryItem {
  id: string;
  member_id: string | null;
  user_id: string;
  turn_taken_at: string;
  display_name?: string;
}

const playAlarmSound = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    for (let i = 0; i < 3; i++) {
      playBeep(880, audioContext.currentTime + i * 0.3, 0.2);
    }
  } else {
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
  }
};

export default function TurnListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [turnList, setTurnList] = useState<TurnList | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [addOptionsModalVisible, setAddOptionsModalVisible] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteListModalVisible, setDeleteListModalVisible] = useState(false);
  const [deleteMemberModalVisible, setDeleteMemberModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [enablingTimer, setEnablingTimer] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('1');
  const [timerSecondsInput, setTimerSecondsInput] = useState('0');
  const [timerEnded, setTimerEnded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      loadData();

      const membersChannel = supabase
        .channel(`turn-list-members-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'turn_list_members',
            filter: `turn_list_id=eq.${id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      const historyChannel = supabase
        .channel(`turn-list-history-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'turn_history',
            filter: `turn_list_id=eq.${id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(historyChannel);
      };
    }
  }, [id, user]);

  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerEnded(true);
            playAlarmSound();
            pulseScale.value = withRepeat(
              withSequence(
                withTiming(1.1, { duration: 300 }),
                withTiming(1, { duration: 300 })
              ),
              6,
              true
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, timerSeconds]);

  const loadData = async () => {
    try {
      const [listResult, membersResult, historyResult] = await Promise.all([
        supabase.from('turn_lists').select('*').eq('id', id).single(),
        supabase
          .from('turn_list_members')
          .select('*')
          .eq('turn_list_id', id)
          .eq('is_active', true)
          .order('position'),
        supabase
          .from('turn_history')
          .select('*')
          .eq('turn_list_id', id)
          .order('turn_taken_at', { ascending: false })
          .limit(10),
      ]);

      if (listResult.error) throw listResult.error;
      if (membersResult.error) throw membersResult.error;

      setTurnList(listResult.data);
      setMembers(membersResult.data || []);

      if (historyResult.data) {
        const historyWithNames = historyResult.data.map((item) => {
          const member = membersResult.data?.find((m) => m.id === item.member_id);
          return {
            ...item,
            display_name: member?.display_name || 'Unknown',
          };
        });
        setHistory(historyWithNames);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load turn list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCurrentTurn = (): Member | null => {
    if (members.length === 0) return null;
    if (history.length === 0) return members[0];

    const lastTurn = history[0];
    const lastMemberIndex = members.findIndex((m) => m.id === lastTurn.member_id);

    if (lastMemberIndex === -1) return members[0];

    const nextIndex = (lastMemberIndex + 1) % members.length;
    return members[nextIndex];
  };

  const handleAdvanceTurn = async () => {
    const currentTurn = getCurrentTurn();
    if (!currentTurn) return;

    rotation.value = withSequence(
      withSpring(360, { damping: 10 }),
      withSpring(0, { duration: 0 })
    );

    setAdvancing(true);

    try {
      const { error } = await supabase.from('turn_history').insert({
        turn_list_id: id,
        member_id: currentTurn.id,
        user_id: currentTurn.user_id,
        turn_taken_at: new Date().toISOString(),
      });

      if (error) throw error;

      handleResetTimer();
      await loadData();
    } catch (error: any) {
      console.error('Error advancing turn:', error);
      Alert.alert('Error', 'Failed to advance turn');
    } finally {
      setAdvancing(false);
    }
  };

  const handleInviteSent = () => {
    loadData();
  };

  const handleMemberAdded = () => {
    loadData();
  };

  const handleDeleteList = () => {
    setMenuModalVisible(false);
    setDeleteListModalVisible(true);
  };

  const confirmDeleteList = async () => {
    setDeleting(true);
    setDeleteListModalVisible(false);
    try {
      const { error } = await supabase
        .from('turn_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.back();
    } catch (error: any) {
      setError('Failed to delete turn list');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberToDelete(memberId);
    setDeleteMemberModalVisible(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;

    setDeleteMemberModalVisible(false);
    try {
      const { error } = await supabase
        .from('turn_list_members')
        .delete()
        .eq('id', memberToDelete);

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      setError('Failed to remove member');
    } finally {
      setMemberToDelete(null);
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleStartTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(timerDuration);
    }
    setTimerEnded(false);
    cancelAnimation(pulseScale);
    pulseScale.value = 1;
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(timerDuration);
    setTimerEnded(false);
    cancelAnimation(pulseScale);
    pulseScale.value = 1;
  };

  const handleSetTimerDuration = () => {
    const mins = parseInt(timerMinutes) || 0;
    const secs = parseInt(timerSecondsInput) || 0;
    const totalSeconds = mins * 60 + secs;
    if (totalSeconds > 0) {
      setTimerDuration(totalSeconds);
      setTimerSeconds(totalSeconds);
      setTimerEnded(false);
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
    }
    setTimerModalVisible(false);
  };

  const openTimerSettings = () => {
    const mins = Math.floor(timerDuration / 60);
    const secs = timerDuration % 60;
    setTimerMinutes(mins.toString());
    setTimerSecondsInput(secs.toString());
    setTimerModalVisible(true);
  };

  const handleEnableTimer = async () => {
    setEnablingTimer(true);
    try {
      const { error } = await supabase
        .from('turn_lists')
        .update({ timer_enabled: true })
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      console.error('Error enabling timer:', error);
      Alert.alert('Error', 'Failed to enable timer');
    } finally {
      setEnablingTimer(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!turnList) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Turn list not found</Text>
      </View>
    );
  }

  const currentTurn = getCurrentTurn();
  const timerProgress = timerDuration > 0 ? timerSeconds / timerDuration : 0;

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
          <Text style={styles.headerTitle}>{turnList.name}</Text>
          {turnList.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.headerSubtitle}>{turnList.category}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setAddOptionsModalVisible(true)} style={styles.headerButton} activeOpacity={0.7}>
            <UserPlus size={24} color="#007AFF" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuModalVisible(true)} style={styles.headerButton} activeOpacity={0.7}>
            <MoreVertical size={24} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Members Yet</Text>
            <Text style={styles.emptyText}>Add members to start tracking turns</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setAddOptionsModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.currentTurnCard}>
              <LinearGradient
                colors={['#F0F7FF', '#E5F2FF']}
                style={styles.currentTurnGradient}
              >
                <View style={styles.currentTurnLabelContainer}>
                  <Sparkles size={16} color="#007AFF" strokeWidth={2.5} />
                  <Text style={styles.currentTurnLabel}>Current Turn</Text>
                </View>
                <Animated.View style={[styles.currentTurnIconContainer, animatedStyle]}>
                  <LinearGradient
                    colors={['#007AFF', '#0051D5', '#0047B3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.currentTurnIconGradient}
                  >
                    <View style={styles.currentTurnCircleInner}>
                      <Text style={styles.currentTurnNameInCircle}>
                        {currentTurn?.display_name || 'Unknown'}
                      </Text>
                      <View style={styles.decorativeRing} />
                      <View style={[styles.decorativeRing, styles.decorativeRingSecond]} />
                    </View>
                  </LinearGradient>
                </Animated.View>
                <View style={styles.sparkleDecorations}>
                  <View style={[styles.sparkleDecor, styles.sparkleDecor1]}>
                    <Sparkles size={24} color="#007AFF" strokeWidth={2} />
                  </View>
                  <View style={[styles.sparkleDecor, styles.sparkleDecor2]}>
                    <Sparkles size={20} color="#3395FF" strokeWidth={2} />
                  </View>
                  <View style={[styles.sparkleDecor, styles.sparkleDecor3]}>
                    <Sparkles size={18} color="#66AAFF" strokeWidth={2} />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.advanceButton, advancing && styles.buttonDisabled]}
                  onPress={handleAdvanceTurn}
                  disabled={advancing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#007AFF', '#0051D5']}
                    style={styles.advanceButtonGradient}
                  >
                    {advancing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.advanceButtonText}>Take Turn</Text>
                        <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {turnList.timer_enabled ? (
              <View style={styles.timerSection}>
                <View style={styles.timerHeader}>
                  <View style={styles.timerTitleRow}>
                    <Timer size={20} color="#000000" />
                    <Text style={styles.timerTitle}>Turn Timer</Text>
                  </View>
                  <TouchableOpacity onPress={openTimerSettings} style={styles.timerSettingsButton}>
                    <Settings size={20} color="#666666" />
                  </TouchableOpacity>
                </View>

                <Animated.View style={[styles.timerDisplay, timerEnded && styles.timerDisplayEnded, pulseAnimatedStyle]}>
                  <View style={styles.timerProgressBg}>
                    <View style={[styles.timerProgressFill, { width: `${timerProgress * 100}%` }]} />
                  </View>
                  <View style={styles.timerContent}>
                    {timerEnded && (
                      <View style={styles.timerEndedBadge}>
                        <Bell size={16} color="#FFFFFF" />
                        <Text style={styles.timerEndedText}>Time's Up!</Text>
                      </View>
                    )}
                    <Text style={[styles.timerText, timerEnded && styles.timerTextEnded]}>
                      {formatTime(timerSeconds)}
                    </Text>
                    <Text style={styles.timerDurationText}>
                      of {formatTime(timerDuration)}
                    </Text>
                  </View>
                </Animated.View>

                <View style={styles.timerControls}>
                  {!isTimerRunning ? (
                    <TouchableOpacity
                      style={[styles.timerButton, styles.timerButtonStart]}
                      onPress={handleStartTimer}
                    >
                      <Play size={20} color="#FFFFFF" />
                      <Text style={styles.timerButtonText}>Start</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.timerButton, styles.timerButtonPause]}
                      onPress={handlePauseTimer}
                    >
                      <Pause size={20} color="#FFFFFF" />
                      <Text style={styles.timerButtonText}>Pause</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.timerButton, styles.timerButtonReset]}
                    onPress={handleResetTimer}
                  >
                    <RotateCcw size={20} color="#666666" />
                    <Text style={styles.timerButtonTextSecondary}>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.addTimerSection}>
                <View style={styles.addTimerCard}>
                  <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9']}
                    style={styles.addTimerGradient}
                  >
                    <View style={styles.addTimerIconContainer}>
                      <Timer size={32} color="#64748B" strokeWidth={2} />
                    </View>
                    <Text style={styles.addTimerTitle}>Add Turn Timer</Text>
                    <Text style={styles.addTimerDescription}>
                      Set time limits for each turn and get notified when time's up
                    </Text>
                    <TouchableOpacity
                      style={[styles.addTimerButton, enablingTimer && styles.buttonDisabled]}
                      onPress={handleEnableTimer}
                      disabled={enablingTimer}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#007AFF', '#0051D5']}
                        style={styles.addTimerButtonGradient}
                      >
                        {enablingTimer ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Timer size={18} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.addTimerButtonText}>Enable Timer</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.membersHeader}>
                <Text style={styles.membersSectionTitle}>Members ({members.length})</Text>
                <TouchableOpacity
                  onPress={() => setEditMode(!editMode)}
                  style={styles.editButton}
                >
                  <Text style={[styles.editButtonText, editMode && styles.editButtonTextActive]}>
                    {editMode ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.membersContainer}>
                {members.map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      styles.memberCard,
                      currentTurn?.id === member.id && styles.memberCardActive,
                    ]}
                  >
                    <View style={styles.memberPosition}>
                      <Text style={styles.memberPositionText}>{index + 1}</Text>
                    </View>
                    <Text
                      style={[
                        styles.memberName,
                        currentTurn?.id === member.id && styles.memberNameActive,
                      ]}
                    >
                      {member.display_name}
                    </Text>
                    {editMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member.id)}
                        style={styles.deleteMemberButton}
                      >
                        <Trash2 size={18} color="#DC2626" strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {history.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowHistory(!showHistory)}
                >
                  <View style={styles.sectionTitleContainer}>
                    <Clock size={20} color="#000000" />
                    <Text style={styles.sectionTitle}>Recent History</Text>
                  </View>
                  <ChevronRight
                    size={20}
                    color="#666666"
                    style={{
                      transform: [{ rotate: showHistory ? '90deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>
                {showHistory && (
                  <View style={styles.historyContainer}>
                    {history.map((item) => (
                      <View key={item.id} style={styles.historyItem}>
                        <Text style={styles.historyName}>{item.display_name}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(item.turn_taken_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={addOptionsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setAddOptionsModalVisible(false)}
        >
          <View style={styles.addOptionsContent}>
            <Text style={styles.addOptionsTitle}>Add Member</Text>
            <TouchableOpacity
              style={styles.addOptionItem}
              onPress={() => {
                setAddOptionsModalVisible(false);
                setAddMemberModalVisible(true);
              }}
            >
              <View style={styles.addOptionIconContainer}>
                <User size={24} color="#10B981" strokeWidth={2} />
              </View>
              <View style={styles.addOptionTextContainer}>
                <Text style={styles.addOptionTitle}>Add by Name</Text>
                <Text style={styles.addOptionDescription}>
                  Add someone without an account
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
            <View style={styles.addOptionDivider} />
            <TouchableOpacity
              style={styles.addOptionItem}
              onPress={() => {
                setAddOptionsModalVisible(false);
                setInviteModalVisible(true);
              }}
            >
              <View style={styles.addOptionIconContainer}>
                <Mail size={24} color="#007AFF" strokeWidth={2} />
              </View>
              <View style={styles.addOptionTextContainer}>
                <Text style={styles.addOptionTitle}>Invite by Email</Text>
                <Text style={styles.addOptionDescription}>
                  Send an invitation to join
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <AddMemberModal
        visible={addMemberModalVisible}
        onClose={() => setAddMemberModalVisible(false)}
        turnListId={id}
        turnListName={turnList?.name || ''}
        onMemberAdded={handleMemberAdded}
      />

      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        turnListId={id}
        turnListName={turnList?.name || ''}
        onInviteSent={handleInviteSent}
      />

      <Modal
        visible={timerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTimerModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Timer Duration</Text>
              <TouchableOpacity onPress={() => setTimerModalVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.timerInputRow}>
                <View style={styles.timerInputGroup}>
                  <Text style={styles.timerInputLabel}>Minutes</Text>
                  <TextInput
                    style={styles.timerInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={timerMinutes}
                    onChangeText={setTimerMinutes}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <Text style={styles.timerInputSeparator}>:</Text>
                <View style={styles.timerInputGroup}>
                  <Text style={styles.timerInputLabel}>Seconds</Text>
                  <TextInput
                    style={styles.timerInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={timerSecondsInput}
                    onChangeText={setTimerSecondsInput}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={styles.presetTimers}>
                <Text style={styles.presetLabel}>Quick Presets</Text>
                <View style={styles.presetRow}>
                  {[30, 60, 120, 300, 600].map((secs) => (
                    <TouchableOpacity
                      key={secs}
                      style={styles.presetButton}
                      onPress={() => {
                        setTimerMinutes(Math.floor(secs / 60).toString());
                        setTimerSecondsInput((secs % 60).toString());
                      }}
                    >
                      <Text style={styles.presetButtonText}>
                        {secs < 60 ? `${secs}s` : `${secs / 60}m`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleSetTimerDuration}
              >
                <Text style={styles.createButtonText}>Set Timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={menuModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuModalVisible(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteList}
              disabled={deleting}
            >
              <Trash2 size={20} color="#DC2626" strokeWidth={2} />
              <Text style={styles.menuItemTextDanger}>Delete Turn List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={deleteListModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteListModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Turn List</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete this turn list? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setDeleteListModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteList}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteMemberModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteMemberModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Remove Member</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove this member from the list?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setDeleteMemberModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmRemoveMember}
              >
                <Text style={styles.confirmDeleteText}>Remove</Text>
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
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  currentTurnCard: {
    margin: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  currentTurnGradient: {
    padding: 20,
    alignItems: 'center',
  },
  currentTurnLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  currentTurnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  currentTurnIconContainer: {
    marginBottom: 32,
  },
  currentTurnIconGradient: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  currentTurnCircleInner: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  currentTurnNameInCircle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 30,
    zIndex: 2,
  },
  decorativeRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#B3D9FF',
    borderStyle: 'dashed',
  },
  decorativeRingSecond: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderColor: '#E5F3FF',
    borderWidth: 1.5,
  },
  sparkleDecorations: {
    position: 'absolute',
    width: '100%',
    height: 320,
    top: 60,
  },
  sparkleDecor: {
    position: 'absolute',
  },
  sparkleDecor1: {
    top: 20,
    right: 30,
  },
  sparkleDecor2: {
    top: 140,
    left: 20,
  },
  sparkleDecor3: {
    top: 80,
    right: 50,
  },
  advanceButton: {
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  advanceButtonGradient: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  advanceButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timerSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  timerSettingsButton: {
    padding: 8,
  },
  timerDisplay: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  timerDisplayEnded: {
    backgroundColor: '#FFF3E0',
  },
  timerProgressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E3F2FD',
  },
  timerProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#BBDEFB',
  },
  timerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  timerEndedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timerEndedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
    fontVariant: ['tabular-nums'],
  },
  timerTextEnded: {
    color: '#FF9800',
  },
  timerDurationText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  timerButtonStart: {
    backgroundColor: '#34C759',
  },
  timerButtonPause: {
    backgroundColor: '#FF9500',
  },
  timerButtonReset: {
    backgroundColor: '#F0F0F0',
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerButtonTextSecondary: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  addTimerSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addTimerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  addTimerGradient: {
    padding: 32,
    alignItems: 'center',
  },
  addTimerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  addTimerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  addTimerDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  addTimerButton: {
    borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addTimerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addTimerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  membersSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  editButtonTextActive: {
    color: '#007AFF',
  },
  membersContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberCardActive: {
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  memberPosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberPositionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  memberName: {
    flex: 1,
    fontSize: 17,
    color: '#1E293B',
    fontWeight: '600',
  },
  memberNameActive: {
    fontWeight: '700',
    color: '#007AFF',
  },
  deleteMemberButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  historyContainer: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  historyName: {
    fontSize: 16,
    color: '#000000',
  },
  historyDate: {
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  modalForm: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
  timerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timerInputGroup: {
    alignItems: 'center',
  },
  timerInputLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    width: 100,
    textAlign: 'center',
  },
  timerInputSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginTop: 20,
  },
  presetTimers: {
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minWidth: 250,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  menuItemTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addOptionsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    minWidth: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  addOptionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    padding: 20,
    paddingBottom: 12,
  },
  addOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  addOptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionTextContainer: {
    flex: 1,
  },
  addOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  addOptionDescription: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  addOptionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
});
