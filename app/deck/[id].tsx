import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Pencil, Play, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { staggerDelay } from "../../src/theme/motion";
import { MATURITY_COLORS, MATURITY_LABELS } from "../../src/theme/dataviz.ts";
import { archiveDeck, listDecks, renameDeck } from "../../src/data/decks";
import { createCard, deleteCard, listCards, listReviewLogs, updateCardText } from "../../src/data/cards";
import { loadSettings, DEFAULT_SETTINGS, type AppSettings } from "../../src/data/settings";
import { dueCounts, elapsedDaysFor, forecast } from "../../src/lib/scheduler.ts";
import { retrievability } from "../../src/lib/memory.ts";
import { currentRecallLevel, maturityBreakdown, maturityOf, MATURE_STABILITY_DAYS, type Maturity } from "../../src/lib/deckStats.ts";
import { diffDays, formatInterval, todayIso } from "../../src/lib/dates.ts";
import type { Card, Deck, ReviewLog } from "../../src/lib/card.ts";
import { Card as Surface } from "../../src/components/Card";
import { PressableScale } from "../../src/components/PressableScale";
import { ForecastRidge } from "../../src/components/ForecastRidge";
import { EmptyState } from "../../src/components/EmptyState";
import { CardModal } from "../../src/components/CardModal";
import { DeckModal } from "../../src/components/DeckModal";

const MATURITIES: Maturity[] = ["new", "learning", "young", "mature"];

export default function DeckDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayIso();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Modal держим СМОНТИРОВАННЫМ и управляем только visible: если размонтировать
  // его в момент закрытия (условным рендером), нативный диалог на Android
  // остаётся висеть поверх экрана, а React о нём уже не знает — экран намертво
  // перестаёт реагировать. Поймано на прогоне.
  const [cardModalKey, setCardModalKey] = useState(0);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deckModalKey, setDeckModalKey] = useState(0);
  const [deckModalOpen, setDeckModalOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([listDecks(), listCards(), listReviewLogs(), loadSettings()]).then(([d, c, l, s]) => {
      setDecks(d);
      setCards(c);
      setLogs(l);
      setSettings(s);
    });
  }, []);
  useFocusEffect(load);

  const deck = decks.find((d) => d.id === id);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === id), [cards, id]);
  const counts = dueCounts(deckCards, today, settings);
  const breakdown = maturityBreakdown(deckCards);
  const recall = currentRecallLevel(deckCards, today);
  const upcoming = useMemo(() => forecast(deckCards, today, 14), [deckCards, today]);
  const deckLogs = logs.filter((l) => l.deckId === id);

  if (!deck) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
        <EmptyState title="Deck not found" description="It may have been removed." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <PressableScale
              onPress={() => {
                setDeckModalKey((k) => k + 1);
                setDeckModalOpen(true);
              }}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
            >
              <Pencil size={16} color={theme.colors.ink} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                setEditingCard(null);
                setCardModalKey((k) => k + 1);
                setCardModalOpen(true);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent }}
            >
              <Plus size={15} color={theme.colors.onAccent} />
              <Text style={{ color: theme.colors.onAccent, ...theme.typography.label }}>Card</Text>
            </PressableScale>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(380)}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{deck.name}</Text>
          {deck.description ? (
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.body, marginTop: 2 }}>{deck.description}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(380)} style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <Surface style={{ flex: 1, padding: theme.spacing.md }}>
            <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{deckCards.length}</Text>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>cards</Text>
          </Surface>
          <Surface style={{ flex: 1, padding: theme.spacing.md }}>
            <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{counts.total}</Text>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>due now</Text>
          </Surface>
          <Surface style={{ flex: 1, padding: theme.spacing.md }}>
            <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{deckCards.length ? `${Math.round(recall * 100)}%` : "–"}</Text>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>recalled now</Text>
          </Surface>
        </Animated.View>

        {deckCards.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(160).duration(380)}>
            <Surface style={{ marginTop: theme.spacing.lg }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Memory mix</Text>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2, marginBottom: theme.spacing.md }}>
                Mature means the memory now holds for {MATURE_STABILITY_DAYS}+ days.
              </Text>
              <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: theme.colors.surfaceAlt }}>
                {MATURITIES.map((m) =>
                  breakdown[m] > 0 ? <View key={m} style={{ flex: breakdown[m], backgroundColor: MATURITY_COLORS[m] }} /> : null
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                {MATURITIES.filter((m) => breakdown[m] > 0).map((m) => (
                  <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: MATURITY_COLORS[m] }} />
                    <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                      {MATURITY_LABELS[m]} {breakdown[m]}
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>

            {deckLogs.length > 0 ? (
              <Surface style={{ marginTop: theme.spacing.md }}>
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Coming up</Text>
                <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2, marginBottom: theme.spacing.md }}>
                  Cards this deck will ask for over the next two weeks.
                </Text>
                <ForecastRidge days={upcoming} />
              </Surface>
            ) : null}
          </Animated.View>
        ) : null}

        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>Cards</Text>
        {deckCards.length === 0 ? (
          <EmptyState title="No cards yet" description="Add your first card — front is the prompt, back is what you want to recall." />
        ) : (
          deckCards.map((c, i) => {
            const r = c.state === "new" ? null : retrievability(c.stability, elapsedDaysFor(c, today));
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(staggerDelay(i, 40)).duration(300)}>
                <PressableScale
                  onPress={() => {
                    setEditingCard(c);
                    setCardModalKey((k) => k + 1);
                    setCardModalOpen(true);
                  }}
                >
                  <Surface style={{ marginBottom: theme.spacing.sm, padding: theme.spacing.md, flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MATURITY_COLORS[maturityOf(c)] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.ink, ...theme.typography.body, fontSize: 15 }} numberOfLines={1}>
                        {c.front}
                      </Text>
                      <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }} numberOfLines={1}>
                        {c.state === "new"
                          ? "new · not studied yet"
                          : `${Math.round((r ?? 0) * 100)}% recall · ${diffDays(today, c.due) <= 0 ? "due now" : `due in ${formatInterval(diffDays(today, c.due))}`}`}
                      </Text>
                    </View>
                    <PressableScale onPress={() => deleteCard(c.id).then(load)} style={{ padding: 4 }}>
                      <Trash2 size={15} color={theme.colors.inkFaint} />
                    </PressableScale>
                  </Surface>
                </PressableScale>
              </Animated.View>
            );
          })
        )}

        <PressableScale
          onPress={() => archiveDeck(deck.id).then(() => router.back())}
          style={{ marginTop: theme.spacing.xl, paddingVertical: theme.spacing.md, alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label }}>Remove this deck</Text>
        </PressableScale>
      </ScrollView>

      {counts.total > 0 ? (
        <View style={{ position: "absolute", left: theme.spacing.lg, right: theme.spacing.lg, bottom: insets.bottom + theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.push({ pathname: "/review", params: { deckId: deck.id } })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.accent,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radius.pill,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}
          >
            <Play size={17} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.subtitle }}>Review {counts.total}</Text>
          </PressableScale>
        </View>
      ) : null}

      {/* Ключи соседей обязаны различаться: оба счётчика стартуют с 0, и без
          префикса React видит двух детей с ключом `0` и может перепутать их. */}
      <CardModal
        key={`card-${cardModalKey}`}
        visible={cardModalOpen}
        title={editingCard ? "Edit card" : "New card"}
        initialFront={editingCard?.front ?? ""}
        initialBack={editingCard?.back ?? ""}
        onClose={() => setCardModalOpen(false)}
        onSave={async (front, back, addAnother) => {
          if (editingCard) await updateCardText(editingCard.id, front, back);
          else await createCard(deck.id, front, back);
          load();
          if (!addAnother) setCardModalOpen(false);
        }}
      />

      <DeckModal
        key={`deck-${deckModalKey}`}
        visible={deckModalOpen}
        title="Edit deck"
        initialName={deck.name}
        initialDescription={deck.description}
        onClose={() => setDeckModalOpen(false)}
        onSave={async (name, description) => {
          await renameDeck(deck.id, name, description);
          setDeckModalOpen(false);
          load();
        }}
      />
    </View>
  );
}
