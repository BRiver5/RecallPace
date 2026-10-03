import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Minus, Plus } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from "../src/data/settings";
import { deleteAllData } from "../src/data/cards";
import { intervalForRetention } from "../src/lib/memory.ts";
import { formatInterval } from "../src/lib/dates.ts";
import { Card } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { SecondaryButton } from "../src/components/SecondaryButton";
import { Toggle } from "../src/components/Toggle";

const RETENTION_OPTIONS = [0.8, 0.85, 0.9, 0.95];

function Group({ index, title, caption, children }: { index: number; title: string; caption?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index, 70)).duration(320)}>
      <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm, marginLeft: 4 }}>{title.toUpperCase()}</Text>
      <Card style={{ marginBottom: theme.spacing.xl }}>
        {children}
        {caption ? <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption, marginTop: theme.spacing.md }}>{caption}</Text> : null}
      </Card>
    </Animated.View>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  const theme = useTheme();
  const btn = { width: 34, height: 34, borderRadius: 17, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: theme.colors.surfaceAlt };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <PressableScale onPress={() => onChange(Math.max(min, value - step))} scaleTo={0.88} style={btn}>
          <Minus size={15} color={theme.colors.ink} />
        </PressableScale>
        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, minWidth: 44, textAlign: "center" }}>{value}</Text>
        <PressableScale onPress={() => onChange(Math.min(max, value + step))} scaleTo={0.88} style={btn}>
          <Plus size={15} color={theme.colors.ink} />
        </PressableScale>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [confirming, setConfirming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  // Показываем цену выбора в днях: при 95% карточка со стабильностью 30 дней
  // вернётся заметно раньше, чем при 80%.
  const exampleInterval = formatInterval(Math.round(intervalForRetention(30, settings.targetRetention)));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Settings</Text>
        </View>

        <Group
          index={0}
          title="Target retention"
          caption={`How much you want to remember when a card comes back. Higher means shorter gaps and more reviews. A card whose memory holds 30 days returns after ${exampleInterval}.`}
        >
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {RETENTION_OPTIONS.map((r) => {
              const active = Math.abs(settings.targetRetention - r) < 1e-9;
              return (
                <PressableScale
                  key={r}
                  onPress={() => update({ targetRetention: r })}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: active ? theme.colors.onAccent : theme.colors.ink, ...theme.typography.subtitle, fontSize: 16 }}>{Math.round(r * 100)}%</Text>
                </PressableScale>
              );
            })}
          </View>
        </Group>

        <Group index={1} title="Daily limits" caption="Caps per day so a backlog never turns into an unanswerable pile.">
          <Stepper label="New cards" value={settings.newPerDay} min={0} max={100} step={5} onChange={(v) => update({ newPerDay: v })} />
          <Stepper label="Reviews" value={settings.reviewsPerDay} min={10} max={500} step={10} onChange={(v) => update({ reviewsPerDay: v })} />
          <Stepper label="Longest gap (days)" value={settings.maxIntervalDays} min={30} max={3650} step={30} onChange={(v) => update({ maxIntervalDays: v })} />
        </Group>

        <Group index={2} title="Feedback">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
            <View style={{ flex: 1, marginRight: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>Haptics on answer</Text>
              <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>A short tap when a card is graded.</Text>
            </View>
            <Toggle value={settings.haptics} onValueChange={(v) => update({ haptics: v })} />
          </View>
        </Group>

        <Group index={3} title="About the model" caption="RecallPace uses a power-law forgetting curve with per-card stability and difficulty, with published default parameters — it does not retrain them on your data. The Stats screen checks those defaults against your actual recall and says so when they're off.">
          <View />
        </Group>

        <Group index={4} title="Your data" caption="Everything stays on this device. No account, no sync, no analytics, no internet connection.">
          {confirming ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Cancel" onPress={() => setConfirming(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PressableScale
                  onPress={async () => {
                    await deleteAllData();
                    setConfirming(false);
                  }}
                  style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.pill, paddingVertical: theme.spacing.md, alignItems: "center" }}
                >
                  <Text style={{ color: theme.colors.danger, ...theme.typography.subtitle }}>Delete</Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              onPress={() => setConfirming(true)}
              style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.pill, paddingVertical: theme.spacing.md, alignItems: "center" }}
            >
              <Text style={{ color: theme.colors.danger, ...theme.typography.subtitle }}>Delete all decks & cards</Text>
            </PressableScale>
          )}
        </Group>
      </ScrollView>
    </View>
  );
}
