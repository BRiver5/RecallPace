import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme";
import { PressableScale } from "./PressableScale";
import { PrimaryButton } from "./PrimaryButton";

export function CardModal({
  visible,
  title,
  initialFront = "",
  initialBack = "",
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  initialFront?: string;
  initialBack?: string;
  onClose: () => void;
  onSave: (front: string, back: string, addAnother: boolean) => void;
}) {
  const theme = useTheme();
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const isNew = initialFront === "" && initialBack === "";
  const canSave = front.trim().length > 0 && back.trim().length > 0;

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
    minHeight: 72,
    textAlignVertical: "top" as const,
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
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>FRONT — THE PROMPT</Text>
          <TextInput value={front} onChangeText={setFront} multiline placeholder="hablar" placeholderTextColor={theme.colors.inkFaint} style={inputStyle} />

          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>BACK — WHAT YOU RECALL</Text>
          <TextInput value={back} onChangeText={setBack} multiline placeholder="to speak" placeholderTextColor={theme.colors.inkFaint} style={inputStyle} />

          <PrimaryButton label={isNew ? "Add card" : "Save card"} disabled={!canSave} onPress={() => onSave(front.trim(), back.trim(), false)} />
          {isNew ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <PressableScale
                onPress={() => {
                  if (!canSave) return;
                  onSave(front.trim(), back.trim(), true);
                  setFront("");
                  setBack("");
                }}
                style={{ paddingVertical: theme.spacing.md, alignItems: "center", opacity: canSave ? 1 : 0.4 }}
              >
                <Text style={{ color: theme.colors.accent, ...theme.typography.label }}>Save and add another</Text>
              </PressableScale>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
