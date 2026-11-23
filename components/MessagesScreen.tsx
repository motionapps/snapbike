import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Conversation,
  Message,
  customerIdByPhone,
  fetchConversations,
  fetchThread,
  sendMessage,
} from '../lib/messages';
import { useOrderContext } from '../lib/orderContext';
import { useScrollToTop } from '../lib/scrollToTop';
import { colors } from '../lib/theme';
import { customerHasPhone } from '../lib/types';
import { styles } from './MessagesScreen.styles';
import { webScroll, webScrollContent } from '../lib/webEdge';

const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const formatTime = (iso: string) => timeFormat.format(new Date(iso));

/**
 * Meddelanden: with a current bike, the conversation with its customer;
 * without one, every conversation, latest message first.
 */
export function MessagesScreen({ active }: { active: boolean }) {
  const insets = useSafeAreaInsets();
  const { order, bikeAnalysis } = useOrderContext();
  const customer = order.customer;
  const hasCurrentBike = customer !== null || bikeAnalysis.status === 'ready';
  const activePhone = customerHasPhone(customer) ? customer!.phone : '';

  // Thread opened from the overview (only used when no bike is current).
  const [opened, setOpened] = useState<{ customerId: string; name: string } | null>(null);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  useEffect(() => {
    setOpened(null);
  }, [hasCurrentBike]);

  useEffect(() => {
    if (!active || !activePhone) return;
    let cancelled = false;
    setLookupDone(false);
    customerIdByPhone(activePhone)
      .then((id) => {
        if (!cancelled) setActiveCustomerId(id);
      })
      .catch(() => {
        if (!cancelled) setActiveCustomerId(null);
      })
      .finally(() => {
        if (!cancelled) setLookupDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [active, activePhone]);

  const topPadding = Platform.OS === 'android' ? insets.top + 16 : insets.top + 8;

  if (hasCurrentBike) {
    const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() || 'Kund' : '';
    return (
      <View style={styles.root}>
        <View style={[styles.titleRow, { paddingTop: topPadding }]}>
          <Text style={styles.title}>Meddelanden</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{name}</Text>
        </View>
        {!customer ? (
          <Text style={styles.empty}>Cykeln har ingen kund.</Text>
        ) : !activePhone ? (
          <Text style={styles.empty}>Kunden saknar telefonnummer.</Text>
        ) : !lookupDone ? (
          <ActivityIndicator color={colors.textSecondary} style={styles.loader} />
        ) : !activeCustomerId ? (
          <Text style={styles.empty}>Spara kunden först för att kunna skicka meddelanden.</Text>
        ) : (
          <Thread customerId={activeCustomerId} active={active} />
        )}
      </View>
    );
  }

  if (opened) {
    return (
      <View style={styles.root}>
        <View style={[styles.titleRow, { paddingTop: topPadding }]}>
          <Pressable onPress={() => setOpened(null)} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{opened.name || 'Kund'}</Text>
        </View>
        <Thread customerId={opened.customerId} active={active} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.titleRow, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Meddelanden</Text>
      </View>
      <ConversationList
        active={active}
        onOpen={(c) => setOpened({ customerId: c.customerId, name: c.name })}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

function ConversationList({
  active,
  onOpen,
  bottomInset,
}: {
  active: boolean;
  onOpen: (conversation: Conversation) => void;
  bottomInset: number;
}) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop('messages', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetchConversations()
      .then((list) => {
        if (!cancelled) {
          setConversations(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (error && !conversations) return <Text style={styles.empty}>{error}</Text>;
  if (!conversations) return <ActivityIndicator color={colors.textSecondary} style={styles.loader} />;
  if (conversations.length === 0) {
    return (
      <Text style={styles.empty}>
        Inga meddelanden än. Välj en cykel för att skriva till kunden.
      </Text>
    );
  }

  return (
    <ScrollView style={webScroll} ref={scrollRef} contentContainerStyle={[webScrollContent, styles.list, { paddingBottom: bottomInset + 32 }]}>
      {conversations.map((c) => (
        <Pressable key={c.customerId} onPress={() => onOpen(c)} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowName} numberOfLines={1}>{c.name || c.phone || 'Kund'}</Text>
            <Text style={styles.rowTime}>{formatTime(c.last.createdAt)}</Text>
          </View>
          <Text style={styles.rowBody} numberOfLines={2}>
            {c.last.direction === 'out' ? 'Du: ' : ''}
            {c.last.body}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Thread({ customerId, active }: { customerId: string; active: boolean }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // KeyboardAvoidingView measures itself relative to its parent, but the bike
  // bar and title sit above it: offset by its distance from the window top.
  const wrapRef = useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setMessages(null);
    fetchThread(customerId)
      .then((list) => {
        if (!cancelled) {
          setMessages(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, active]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(customerId, body);
      setMessages((current) => [...(current ?? []), message]);
      setDraft('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [draft, sending, customerId]);

  return (
    <View
      ref={wrapRef}
      style={styles.root}
      onLayout={() => wrapRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}
    >
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView style={webScroll}
        ref={scrollRef}
        contentContainerStyle={[styles.thread, webScrollContent]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {!messages ? (
          error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.textSecondary} style={styles.loader} />
          )
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>Inga meddelanden med kunden än.</Text>
        ) : (
          messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubble, m.direction === 'out' ? styles.bubbleOut : styles.bubbleIn]}
            >
              <Text style={m.direction === 'out' ? styles.bubbleTextOut : styles.bubbleText}>
                {m.body}
              </Text>
              <Text style={m.direction === 'out' ? styles.bubbleTimeOut : styles.bubbleTime}>
                {formatTime(m.createdAt)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      {error && messages ? <Text style={styles.sendError}>{error}</Text> : null}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Skriv ett meddelande"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
          hitSlop={6}
        >
          {sending ? (
            <ActivityIndicator color={colors.onAccent} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}
