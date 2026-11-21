import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, gutter, radius } from '../lib/theme';

export type CommentField = 'customerComment' | 'mechanicComment';

/** One text shown in the modal; editable when it is a comment field. */
export type NoteEntry = { title: string; text: string; field?: CommentField };

type Props = {
  /** null hides the modal. One entry opens it directly; several are listed first. */
  entries: NoteEntry[] | null;
  /** Title of the list when there are several entries. */
  listTitle: string;
  onSave: (field: CommentField, text: string) => void;
  onClose: () => void;
};

/** Kundkommentar, Verkstadskommentar and transcripts of a job. */
export function JobNotesModal({ entries, listTitle, onSave, onClose }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const single = entries?.length === 1;
  const entry = entries && openIndex !== null ? entries[openIndex] : null;

  useEffect(() => {
    setOpenIndex(single ? 0 : null);
    setDraft(single ? entries![0].text : '');
  }, [entries, single]);

  /** Saves an edited comment before leaving its view. */
  const commit = () => {
    if (entry?.field && draft !== entry.text) onSave(entry.field, draft);
  };

  const close = () => {
    commit();
    onClose();
  };

  const back = () => {
    commit();
    setOpenIndex(null);
  };

  const open = (index: number) => {
    setOpenIndex(index);
    setDraft(entries![index].text);
  };

  return (
    <Modal
      visible={entries !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {entry && !single ? (
            <Pressable onPress={back} hitSlop={8} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : null}
          <Text style={styles.heading}>{entry ? entry.title : listTitle}</Text>
          <Pressable onPress={close} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {entry ? (
          entry.field ? (
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Skriv en kommentar…"
              placeholderTextColor={colors.textFaint}
              multiline
              autoFocus={!entry.text}
              textAlignVertical="top"
            />
          ) : (
            <ScrollView contentContainerStyle={styles.textContent}>
              <Text style={styles.text} selectable>
                {entry.text}
              </Text>
            </ScrollView>
          )
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {entries?.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => open(index)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowPreview} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  back: {
    marginLeft: -4,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  input: {
    flex: 1,
    marginHorizontal: gutter,
    marginBottom: 24,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  textContent: {
    paddingHorizontal: gutter,
    paddingBottom: 40,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  list: {
    paddingHorizontal: gutter,
    paddingBottom: 40,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowPreview: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
