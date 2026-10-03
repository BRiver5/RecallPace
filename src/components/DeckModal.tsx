import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme";
import { PressableScale } from "./PressableScale";
import { PrimaryButton } from "./PrimaryButton";

// Монтируется заново на каждое открытие (родитель меняет key) — черновик не
// утекает из прошлого открытия в следующее.
export function DeckModal({
  visible,
  title,
  initialName = "",
  initialDescription = "",
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  initialName?: string;
  initialDescription?: string;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xl }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{title}</Text>
          <PressableScale
            onPress={onClose}
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceAlt }}
          >
            <X size={16} color={theme.colors.ink} />
          </PressableScale>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>NAME</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Spanish verbs" placeholderTextColor={theme.colors.inkFaint} style={inputStyle} />

          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's in this deck"
            placeholderTextColor={theme.colors.inkFaint}
            style={inputStyle}
          />

          <PrimaryButton label="Save deck" disabled={name.trim().length === 0} onPress={() => onSave(name.trim(), description.trim())} />
        </ScrollView>
      </View>
    </Modal>
  );
}
