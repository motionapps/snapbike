import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './JobNotesModal.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';

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
        style={[styles.sheet, webPage]}
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
            <ScrollView style={webScroll} contentContainerStyle={[styles.textContent, webScrollContent]}>
              {entry.text ? (
                <Text style={styles.text} selectable>
                  {entry.text}
                </Text>
              ) : (
                <Text style={[styles.text, styles.emptyText]}>Ingen kommentar.</Text>
              )}
            </ScrollView>
          )
        ) : (
          <ScrollView style={webScroll} contentContainerStyle={[styles.list, webScrollContent]}>
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
