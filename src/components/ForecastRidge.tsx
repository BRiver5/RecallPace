import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import type { ForecastDay } from "../lib/scheduler.ts";
import { weekdayNarrow } from "../lib/dates.ts";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Нагрузка на ближайшие две недели сплошной областью, а не столбиками:
// важна форма волны ("во вторник прилетит горб"), а не точное число в каждом
// дне. Область «вырастает» снизу один раз при появлении данных.
export function ForecastRidge({ days, height = 120 }: { days: ForecastDay[]; height?: number }) {
  const theme = useTheme();
  const width = 300;
  const max = Math.max(1, ...days.map((d) => d.count));
  const step = days.length > 1 ? width / (days.length - 1) : width;
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [days.map((d) => d.count).join(",")]);

  const animatedProps = useAnimatedProps(() => {
    const points = days.map((d, i) => {
      const x = i * step;
      const y = height - (d.count / max) * (height - 12) * grow.value;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { d: `M 0 ${height} L ${points.join(" L ")} L ${width} ${height} Z` };
  });

  return (
    <View>
      <Svg width={width} height={height}>
        <AnimatedPath animatedProps={animatedProps} fill={theme.colors.accent} fillOpacity={0.9} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        {days.map((d, i) => (
          <Text key={d.day} style={{ color: i === 0 ? theme.colors.ink : theme.colors.inkFaint, ...theme.typography.caption, fontSize: 10 }}>
            {weekdayNarrow(d.day)}
          </Text>
        ))}
      </View>
    </View>
  );
}
