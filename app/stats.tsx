import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { GRADE_COLORS, MATURITY_COLORS, MATURITY_LABELS } from "../src/theme/dataviz.ts";
import { listCards, listReviewLogs } from "../src/data/cards";
import { loadSettings, DEFAULT_SETTINGS, type AppSettings } from "../src/data/settings";
import { calibrationBins, calibrationVerdict, suggestedTargetRetention } from "../src/lib/calibration.ts";
import { currentRecallLevel, gradeBreakdown, maturityBreakdown, reviewsPerDay, studyStreak, totalStudyDays, type Maturity } from "../src/lib/deckStats.ts";
import { forecast } from "../src/lib/scheduler.ts";
import { GRADE_LABELS, type Card, type Grade, type ReviewLog } from "../src/lib/card.ts";
import { dayOf, lastDays, todayIso, weekdayNarrow } from "../src/lib/dates.ts";
import { Card as Surface } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { BarChart } from "../src/components/BarChart";
import { DonutChart } from "../src/components/DonutChart";
import { Heatmap } from "../src/components/Heatmap";
import { CalibrationChart } from "../src/components/CalibrationChart";
import { ForecastRidge } from "../src/components/ForecastRidge";
import { EmptyState } from "../src/components/EmptyState";

const MATURITIES: Maturity[] = ["new", "learning", "young", "mature"];

function Section({ index, title, caption, children }: { index: number; title: string; caption?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index, 90)).duration(360)}>
      <Surface style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{title}</Text>
        {caption ? (
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2, marginBottom: theme.spacing.md }}>{caption}</Text>
        ) : (
          <View style={{ height: theme.spacing.md }} />
        )}
        {children}
      </Surface>
    </Animated.View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = todayIso();

  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const load = useCallback(() => {
    Promise.all([listCards(), listReviewLogs(), loadSettings()]).then(([c, l, s]) => {
      setCards(c);
      setLogs(l);
      setSettings(s);
    });
  }, []);
  useFocusEffect(load);

  const verdict = useMemo(() => calibrationVerdict(logs), [logs]);
  const bins = useMemo(() => calibrationBins(logs), [logs]);
  const recall = currentRecallLevel(cards, today);
  const streak = studyStreak(logs, today);
  const perDay = reviewsPerDay(logs, today, 14).map((d) => ({ label: weekdayNarrow(d.day), value: d.count }));
  const grades = gradeBreakdown(logs);
  const breakdown = maturityBreakdown(cards);
  const upcoming = useMemo(() => forecast(cards, today, 14), [cards, today]);
  const suggestion = suggestedTargetRetention(verdict, settings.targetRetention);

  const heatmapCells = useMemo(() => {
    const days = lastDays(today, 84);
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(dayOf(l.reviewedAt), (counts.get(dayOf(l.reviewedAt)) ?? 0) + 1);
    const max = Math.max(1, ...days.map((d) => counts.get(d) ?? 0));
    return days.map((d) => ({ key: d, intensity: (counts.get(d) ?? 0) / max }));
  }, [logs, today]);

  const verdictCopy = () => {
    if (verdict.status === "insufficientData") {
      return `Needs ${verdict.needed - verdict.reviews} more scheduled review${verdict.needed - verdict.reviews === 1 ? "" : "s"} before this can be judged. Reviews of brand-new cards don't count — the model hadn't predicted anything yet.`;
    }
    const predicted = `${Math.round(verdict.predicted * 100)}%`;
    const observed = `${Math.round(verdict.observed * 100)}%`;
    if (verdict.status === "calibrated") {
      return `The model expected ${predicted} and you actually recalled ${observed} across ${verdict.reviews} reviews — close enough that the difference is noise.`;
    }
    if (verdict.status === "overconfident") {
      return `The model expected ${predicted} but you actually recalled ${observed} across ${verdict.reviews} reviews. It's spacing your cards too far apart.`;
    }
    return `The model expected ${predicted} and you actually recalled ${observed} across ${verdict.reviews} reviews. You could afford longer gaps.`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Stats</Text>
        </View>

        {logs.length === 0 ? (
          <EmptyState title="No reviews yet" description="Charts appear once you've answered some cards." />
        ) : (
          <>
            <Section index={0} title="How much you hold right now" caption="Average chance you'd recall each studied card if asked this moment.">
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
                <AnimatedRing progress={recall} size={96} strokeWidth={10} color={theme.colors.accent} trackColor={theme.colors.surfaceAlt}>
                  <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{Math.round(recall * 100)}%</Text>
                </AnimatedRing>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{logs.length}</Text>
                  <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                    reviews over {totalStudyDays(logs)} day{totalStudyDays(logs) === 1 ? "" : "s"}
                  </Text>
                  {streak > 0 ? (
                    <Text style={{ color: theme.colors.accent, ...theme.typography.label, marginTop: 6 }}>{streak}-day streak</Text>
                  ) : null}
                </View>
              </View>
            </Section>

            <Section
              index={1}
              title="Is the schedule honest?"
              caption="Every review is also a test of the model: it predicted your chance of recalling, then found out."
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
                {verdict.status === "calibrated" ? (
                  <CircleCheck size={18} color={theme.colors.success} />
                ) : verdict.status === "insufficientData" ? (
                  <CircleCheck size={18} color={theme.colors.inkFaint} />
                ) : (
                  <TriangleAlert size={18} color={theme.colors.warning} />
                )}
                <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.body }}>{verdictCopy()}</Text>
              </View>
              {verdict.status !== "insufficientData" ? <CalibrationChart bins={bins} /> : null}
              {suggestion !== null ? (
                <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: theme.spacing.md }}>
                  Try target retention {Math.round(suggestion * 100)}% in Settings — currently {Math.round(settings.targetRetention * 100)}%.
                </Text>
              ) : null}
            </Section>

            <Section index={2} title="Reviews, last 14 days">
              <BarChart data={perDay} color={theme.colors.accent} height={110} />
            </Section>

            <Section index={3} title="Coming up" caption="What the schedule will ask of you over the next two weeks.">
              <ForecastRidge days={upcoming} />
            </Section>

            <Section index={4} title="How you answer" caption="Colour plus label — Again is the one that resets a card's spacing.">
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
                <DonutChart
                  size={124}
                  strokeWidth={18}
                  segments={([1, 2, 3, 4] as Grade[]).filter((g) => grades[g] > 0).map((g) => ({ value: grades[g], color: GRADE_COLORS[g] }))}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  {([1, 2, 3, 4] as Grade[]).map((g) => (
                    <View key={g} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRADE_COLORS[g] }} />
                      <Text style={{ flex: 1, color: theme.colors.inkMuted, ...theme.typography.caption }}>{GRADE_LABELS[g]}</Text>
                      <Text style={{ color: theme.colors.ink, ...theme.typography.caption }}>{grades[g]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Section>

            <Section index={5} title="Collection maturity" caption="Mature cards hold for three weeks or more without a reminder.">
              <View style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: theme.colors.surfaceAlt }}>
                {MATURITIES.map((m) => (breakdown[m] > 0 ? <View key={m} style={{ flex: breakdown[m], backgroundColor: MATURITY_COLORS[m] }} /> : null))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                {MATURITIES.map((m) => (
                  <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: MATURITY_COLORS[m] }} />
                    <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                      {MATURITY_LABELS[m]} {breakdown[m]}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>

            <Section index={6} title="Study activity" caption="Last 12 weeks — darker means more reviews that day.">
              <Heatmap
                cells={heatmapCells}
                colorForIntensity={(t) => (t === 0 ? theme.colors.surfaceAlt : `${theme.colors.accent}${Math.round(55 + t * 180).toString(16).padStart(2, "0")}`)}
                cellSize={9}
                gap={3}
              />
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}
