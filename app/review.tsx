import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { listCards, commitReview } from "../src/data/cards";
import { listDecks } from "../src/data/decks";
import { loadSettings, DEFAULT_SETTINGS, type AppSettings } from "../src/data/settings";
import { buildSessionQueue, elapsedDaysFor, requeuePosition, scheduleReview } from "../src/lib/scheduler.ts";
import { retrievability } from "../src/lib/memory.ts";
import { todayIso } from "../src/lib/dates.ts";
import type { Card, Grade } from "../src/lib/card.ts";
import { haptics } from "../src/services/haptics";
import { PressableScale } from "../src/components/PressableScale";
import { FlipCard } from "../src/components/FlipCard";
import { GradeButtons } from "../src/components/GradeButtons";
import { SuccessBurst } from "../src/components/SuccessBurst";
import { PrimaryButton } from "../src/components/PrimaryButton";

export default function ReviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const today = todayIso();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [turn, setTurn] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [again, setAgain] = useState(0);
  const [deckName, setDeckName] = useState("");
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  // Очередь строится ОДИН раз на вход в сессию: если пересобирать её на каждый
  // ответ, карточка, которую только что отложили на завтра, исчезала бы из-под
  // пальца и сбивала счётчик прогресса.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Promise.all([listCards(), loadSettings(), listDecks()]).then(([cards, s, decks]) => {
      const scoped = deckId ? cards.filter((c) => c.deckId === deckId) : cards;
      setSettings(s);
      setQueue(buildSessionQueue(scoped, today, s));
      setDeckName(deckId ? (decks.find((d) => d.id === deckId)?.name ?? "") : "All decks");
      setReady(true);
    });
  }, [deckId, today]);

  const card = queue[index] ?? null;
  const done = ready && card === null;

  const previews = useMemo(() => {
    const empty = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Grade, number>;
    if (!card) return empty;
    for (const grade of [1, 2, 3, 4] as Grade[]) empty[grade] = scheduleReview(card, grade, today, settings).intervalDays;
    return empty;
  }, [card, today, settings]);

  const onGrade = useCallback(
    async (grade: Grade) => {
      if (!card) return;
      const result = scheduleReview(card, grade, today, settings);
      await commitReview(card, grade, result);
      if (settings.haptics) (grade === 1 ? haptics.warning : haptics.tap)();

      setReviewed((n) => n + 1);
      setFlipped(false);
      setTurn((t) => t + 1);

      if (grade === 1) {
        // Провал возвращается в эту же сессию — с уже обновлённой памятью.
        setAgain((n) => n + 1);
        setQueue((q) => {
          const next = [...q];
          const [failed] = next.splice(index, 1);
          const updated: Card = {
            ...failed,
            state: result.state,
            stability: result.stability,
            difficulty: result.difficulty,
            due: result.due,
            lastReview: today,
            reps: failed.reps + 1,
            lapses: failed.lapses + 1,
          };
          next.splice(requeuePosition(next.length, index), 0, updated);
          return next;
        });
        return;
      }
      setIndex((i) => i + 1);
    },
    [card, index, settings, today]
  );

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: theme.spacing.lg }}>
        <SuccessBurst visible size={88} />
        <Animated.Text entering={FadeIn.delay(220)} style={{ color: theme.colors.ink, ...theme.typography.title, marginTop: theme.spacing.xl }}>
          {reviewed > 0 ? "Session complete" : "Nothing due"}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(360)} style={{ color: theme.colors.inkMuted, ...theme.typography.body, marginTop: theme.spacing.sm, textAlign: "center" }}>
          {reviewed > 0
            ? `${reviewed} answer${reviewed === 1 ? "" : "s"}${again > 0 ? ` · ${again} came back` : ""}`
            : "This deck has nothing scheduled right now."}
        </Animated.Text>
        <View style={{ marginTop: theme.spacing.xxl, alignSelf: "stretch", paddingHorizontal: theme.spacing.xl }}>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const remaining = queue.length - index;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
        <View>
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }} numberOfLines={1}>
            {deckName}
          </Text>
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
            {remaining} left · {reviewed} done
          </Text>
        </View>
        <PressableScale
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
        >
          <X size={18} color={theme.colors.ink} />
        </PressableScale>
      </View>

      <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceAlt, overflow: "hidden", marginBottom: theme.spacing.lg }}>
        <View style={{ height: "100%", width: `${(reviewed / Math.max(1, reviewed + remaining)) * 100}%`, backgroundColor: theme.colors.accent }} />
      </View>

      <PressableScale onPress={() => setFlipped(true)} scaleTo={0.99} style={{ flex: 1 }} disabled={flipped}>
        <FlipCard
          flipped={flipped}
          turn={turn}
          style={{ flex: 1 }}
          front={
            <>
              <Text style={{ color: theme.colors.ink, ...theme.typography.title, textAlign: "center" }}>{card?.front}</Text>
              <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption, marginTop: theme.spacing.xl }}>tap to reveal</Text>
            </>
          }
          back={
            <>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.body, textAlign: "center" }}>{card?.front}</Text>
              <View style={{ height: 1, alignSelf: "stretch", backgroundColor: theme.colors.border, marginVertical: theme.spacing.lg }} />
              <Text style={{ color: theme.colors.ink, ...theme.typography.title, textAlign: "center" }}>{card?.back}</Text>
            </>
          }
        />
      </PressableScale>

      <View style={{ paddingVertical: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg }}>
        {flipped ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <GradeButtons previews={previews} onGrade={onGrade} />
          </Animated.View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: theme.spacing.md }}>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
              {card?.state === "new"
                ? "New card — you haven't seen this one yet"
                : card
                  ? `Chance you still recall it: ${Math.round(retrievability(card.stability, elapsedDaysFor(card, today)) * 100)}%`
                  : ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
