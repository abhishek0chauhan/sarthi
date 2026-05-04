import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useChatHistory, useSendChatMessage } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import type { ChatMessage } from '@/types/enrichment.types';

function AnimatedLoader() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Text style={{ fontSize: 20, lineHeight: 24 }}>●●●</Text>
    </Animated.View>
  );
}

export default function TripChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip } = useTrip(id ?? '');
  const { data: messages = [], isLoading } = useChatHistory(id ?? '');
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage(id ?? '');
  const [input, setInput] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const colors = useColors();
  const styles = makeStyles(colors);

  // Merge actual messages with optimistic user messages
  const displayMessages = [...messages, ...optimisticMessages];

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    // Show user message immediately
    setOptimisticMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    } as ChatMessage]);

    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    // Send to API
    sendMessage(text, {
      onSuccess: () => {
        // Clear optimistic messages after response
        setOptimisticMessages([]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      },
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {trip?.destination ?? 'Trip'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Trip Chat</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          scrollEnabled={true}
        >
          {!messages?.length && (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Ask anything about your trip — itinerary, food, logistics, packing.</Text>
            </View>
          )}
          {displayMessages.map((msg: ChatMessage) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              <Text style={msg.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
                {msg.content}
              </Text>
            </View>
          ))}
          {isSending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <AnimatedLoader />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your trip…"
            placeholderTextColor={colors.textTertiary}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
          />
          <Pressable
            style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    flex: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    back: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    messageList: { flex: 1 },
    messageContent: { padding: 16, gap: 8, paddingBottom: 16 },
    emptyChat: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
    emptyChatText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    bubble: { maxWidth: '82%', borderRadius: 14, padding: 10 },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary500,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleUserText: { fontSize: 13, color: '#fff', lineHeight: 20 },
    bubbleAssistantText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.bgBase,
    },
    input: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.bgCard,
      maxHeight: 100,
    },
    sendBtn: {
      backgroundColor: colors.primary500,
      borderRadius: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  });
}
