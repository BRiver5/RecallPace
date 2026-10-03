import { Text, View } from "react-native";
import { useTheme } from "../theme";
import { PressableScale } from "./PressableScale";
import { GRADE_COLORS } from "../theme/dataviz.ts";
import { GRADE_LABELS, type Grade } from "../lib/card.ts";
import { formatInterval } from "../lib/dates.ts";

// Под каждой оценкой — когда карточка вернётся, если нажать именно её.
// Это и есть главный смысл SRS, обычно спрятанный: видно цену ответа.
export function GradeButtons({ previews, onGrade }: { previews: Record<Grade, number>; onGrade: (grade: Grade) => void }) {
  const theme = useTheme();
  const grades: Grade[] = [1, 2, 3, 4];

  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
      {grades.map((grade) => (
        <PressableScale
          key={grade}
          onPress={() => onGrade(grade)}
          scaleTo={0.93}
          style={{
            flex: 1,
            backgroundColor: GRADE_COLORS[grade],
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
          }}
        >
          <Text style={{ color: grade === 2 || grade === 3 ? theme.colors.ink : theme.colors.onAccent, ...theme.typography.label }}>
            {GRADE_LABELS[grade]}
          </Text>
          <Text
            style={{
              color: grade === 2 || grade === 3 ? theme.colors.ink : theme.colors.onAccent,
              ...theme.typography.caption,
              fontSize: 11,
              opacity: 0.85,
              marginTop: 2,
            }}
          >
            {grade === 1 ? "today" : formatInterval(previews[grade])}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}
