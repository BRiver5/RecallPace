import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import type { CalibrationBin } from "../lib/calibration.ts";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Dot({ cx, cy, r, color, delay }: { cx: number; cy: number; r: number; color: string; delay: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(delay, withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2)) }));
  }, [cx, cy, delay]);
  const props = useAnimatedProps(() => ({ r: r * grow.value }));
  return <AnimatedCircle cx={cx} cy={cy} fill={color} animatedProps={props} />;
}

// График калибровки: по X — что обещала модель, по Y — что получилось на
// самом деле. Диагональ = идеал. Точка ниже диагонали — модель переоценила
// твою память, выше — недооценила. Размер точки показывает, на скольких
// повторениях она построена, чтобы одна точка из трёх ответов не выглядела
// так же веско, как точка из двухсот.
export function CalibrationChart({ bins, size = 230 }: { bins: CalibrationBin[]; size?: number }) {
  const theme = useTheme();
  const pad = 26;
  const plot = size - pad * 2;
  const withData = bins.filter((b) => b.reviews > 0);
  const maxReviews = Math.max(1, ...withData.map((b) => b.reviews));
  // Отступ под радиус точки: при 100% факта точка иначе наполовину вылезает
  // за верхний край области графика.
  const inset = 11;
  const span = plot - inset * 2;
  const sx = (v: number) => pad + inset + ((v - 0.5) / 0.5) * span;
  const sy = (v: number) => pad + inset + (1 - (v - 0.5) / 0.5) * span;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Rect x={pad} y={pad} width={plot} height={plot} fill={theme.colors.background} rx={8} />
        {[0.6, 0.7, 0.8, 0.9].map((v) => (
          <Line key={v} x1={pad} y1={sy(v)} x2={pad + plot} y2={sy(v)} stroke={theme.colors.border} strokeWidth={1} />
        ))}
        <Line x1={pad} y1={sy(0.5)} x2={pad + plot} y2={sy(1)} stroke={theme.colors.success} strokeWidth={2} strokeDasharray="5 4" />
        {withData.map((bin, i) => (
          <Dot
            key={bin.label}
            cx={sx(Math.max(0.5, Math.min(1, bin.predicted)))}
            cy={sy(Math.max(0.5, Math.min(1, bin.observed)))}
            r={5 + 5 * (bin.reviews / maxReviews)}
            color={theme.colors.accent}
            delay={i * 90}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: size - pad }}>
        <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption, fontSize: 11 }}>predicted 50%</Text>
        <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption, fontSize: 11 }}>100%</Text>
      </View>
    </View>
  );
}
