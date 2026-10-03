import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChartColumn, Plus, Settings as SettingsIcon } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { listDecks, createDeck } from "../src/data/decks";
import { listCards, listReviewLogs } from "../src/data/cards";
import { loadSettings, DEFAULT_SETTINGS, type AppSettings } from "../src/data/settings";
import { dueCounts } from "../src/lib/scheduler.ts";
import { studyStreak } from "../src/lib/deckStats.ts";
import { todayIso } from "../src/lib/dates.ts";
import type { Card, Deck, ReviewLog } from "../src/lib/card.ts";
import { Card as Surface } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { AnimatedCounter } from "../src/components/AnimatedCounter";
import { DeckModal } from "../src/components/DeckModal";

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = todayIso();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [modalKey, setModalKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([listDecks(), listCards(), listReviewLogs(), loadSettings()]).then(([d, c, l, s]) => {
      setDecks(d);
      setCards(c);
      setLogs(l);
      setSettings(s);
    });
  }, []);
  useFocusEffect(load);

  const totals = useMemo(() => dueCounts(cards, today, settings), [cards, today, settings]);
  const doneToday = useMemo(() => logs.filter((l) => l.reviewedAt.slice(0, 10) === today).length, [logs, today]);
  const streak = useMemo(() => studyStreak(logs, today), [logs, today]);
  const plannedToday = totals.total + doneToday;
  const progress = plannedToday > 0 ? doneToday / plannedToday : 0;

  const deckCounts = (deckId: string) => dueCounts(cards.filter((c) => c.deckId === deckId), today, settings);

  const openModal = () => {
    setModalKey((k) => k + 1);
    setModalOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>RecallPace</Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <PressableScale
              onPress={() => router.push("/stats")}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
            >
              <ChartColumn size={18} color={theme.colors.ink} />
            </PressableScale>
            <PressableScale
              onPress={() => router.push("/settings")}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
            >
              <SettingsIcon size={18} color={theme.colors.ink} />
            </PressableScale>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(420)}>
          <PressableScale onPress={() => (totals.total > 0 ? router.push("/review") : openModal())} scaleTo={0.98}>
            <Surface style={{ marginBottom: theme.spacing.xl, flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
              <AnimatedRing progress={progress} size={92} strokeWidth={10} color={theme.colors.accent} trackColor={theme.colors.surfaceAlt}>
                <AnimatedCounter
                  value={totals.total}
                  formatter={(v) => {
                    "worklet";
                    return `${Math.round(v)}`;
                  }}
                  style={{ color: theme.colors.ink, fontSize: 26, fontWeight: "700", padding: 0, textAlign: "center" }}
                />
              </AnimatedRing>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  {totals.total > 0 ? "Due right now" : doneToday > 0 ? "All caught up" : "Nothing scheduled"}
                </Text>
                <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2 }}>
                  {totals.total > 0
                    ? `${totals.due} review${totals.due === 1 ? "" : "s"} · ${totals.newCards} new`
                    : doneToday > 0
                      ? `${doneToday} done today — come back tomorrow`
                      : "Add a deck to start"}
                </Text>
                {streak > 0 ? (
                  <Text style={{ color: theme.colors.accent, ...theme.typography.label, marginTop: theme.spacing.sm }}>
                    {streak} day{streak === 1 ? "" : "s"} in a row
                  </Text>
                ) : null}
              </View>
            </Surface>
          </PressableScale>
        </Animated.View>

        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginBottom: theme.spacing.md }}>Decks</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
          {decks.map((deck, i) => {
            const counts = deckCounts(deck.id);
            const size = cards.filter((c) => c.deckId === deck.id).length;
            return (
              <Animated.View key={deck.id} entering={FadeInDown.delay(staggerDelay(i, 60)).duration(340)} style={{ width: "47.5%" }}>
                <PressableScale onPress={() => router.push(`/deck/${deck.id}`)}>
                  <Surface style={{ minHeight: 132, justifyContent: "space-between", padding: theme.spacing.md }}>
                    <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, fontSize: 16 }} numberOfLines={2}>
                      {deck.name}
                    </Text>
                    <View>
                      <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
                        {size} card{size === 1 ? "" : "s"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: theme.radius.pill,
                            backgroundColor: counts.total > 0 ? theme.colors.accent : theme.colors.surfaceAlt,
                          }}
                        >
                          <Text style={{ color: counts.total > 0 ? theme.colors.onAccent : theme.colors.inkMuted, ...theme.typography.label, fontSize: 12 }}>
                            {counts.total > 0 ? `${counts.total} due` : "clear"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Surface>
                </PressableScale>
              </Animated.View>
            );
          })}

          <Animated.View entering={FadeInDown.delay(staggerDelay(decks.length, 60)).duration(340)} style={{ width: "47.5%" }}>
            <PressableScale onPress={openModal}>
              <View
                style={{
                  minHeight: 132,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={22} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent, ...theme.typography.label }}>New deck</Text>
              </View>
            </PressableScale>
          </Animated.View>
        </View>

        {decks.length === 0 ? (
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: theme.spacing.lg, textAlign: "center" }}>
            A deck holds your cards. RecallPace schedules each one on its own forgetting curve.
          </Text>
        ) : null}
      </ScrollView>

      <DeckModal
        key={modalKey}
        visible={modalOpen}
        title="New deck"
        onClose={() => setModalOpen(false)}
        onSave={async (name, description) => {
          const deck = await createDeck(name, description);
          setModalOpen(false);
          router.push(`/deck/${deck.id}`);
        }}
      />
    </View>
  );
}
