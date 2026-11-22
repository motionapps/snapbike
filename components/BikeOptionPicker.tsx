import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './BikeOptionPicker.styles';

export type PickerRequest =
  | {
      kind: 'options';
      title: string;
      value: string;
      options: readonly string[];
      labelFor: (value: string) => string;
      onPick: (value: string) => void;
    }
  | {
      kind: 'text';
      title: string;
      value: string;
      onPick: (value: string) => void;
    };

type Props = {
  request: PickerRequest | null;
  onClose: () => void;
};

/** Sheet for changing one bike field: a list of the allowed options, or a text field. */
export function BikeOptionPicker({ request, onClose }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (request?.kind === 'text') setText(request.value);
  }, [request]);

  const pick = (value: string) => {
    request?.onPick(value);
    onClose();
  };

  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>{request?.title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {request?.kind === 'options' ? (
          <ScrollView contentContainerStyle={styles.list}>
            {request.options.map((option) => {
              const selected = option === request.value;
              return (
                <Pressable
                  key={option}
                  onPress={() => pick(option)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {request.labelFor(option)}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={22} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {request?.kind === 'text' ? (
          <View style={styles.list}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => pick(text.trim())}
              placeholderTextColor={colors.textFaint}
            />
            <Pressable
              onPress={() => pick(text.trim())}
              style={({ pressed }) => [styles.save, pressed && styles.pressed]}
            >
              <Text style={styles.saveText}>Spara</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
