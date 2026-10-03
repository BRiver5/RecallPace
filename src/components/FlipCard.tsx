import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";

// Сигнатурный виджет RecallPace: карточка, которая действительно
// переворачивается в 3D (rotateY с перспективой), а не меняет текст на месте.
// Две грани лежат друг на друге; задняя повёрнута на 180° заранее, и каждая
// прячется backfaceVisibility, когда уходит за ребро. Повороты идут строго
// вперёд (0° → 180° → 360°), поэтому при быстрых ответах карточка не
// "отматывается" назад — это читается как новая карточка, а не как откат.
export function FlipCard({
  flipped,
  turn,
  front,
  back,
  style,
}: {
  flipped: boolean;
  turn: number;
  front: React.ReactNode;
  back: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(turn * 2 + (flipped ? 1 : 0), { duration: 460, easing: Easing.inOut(Easing.cubic) });
  }, [flipped, turn]);

  const face: ViewStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    <View style={[{ width: "100%" }, style]}>
      <Animated.View style={[face, frontStyle]}>{front}</Animated.View>
      <Animated.View style={[face, backStyle]}>{back}</Animated.View>
    </View>
  );
}
