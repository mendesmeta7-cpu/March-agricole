import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { colors, radius, spacing } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}

/** Bloc de chargement à pulsation douce ; immobile si le système demande moins d'animations. */
export function Skeleton({ width = "100%", height = 16, rounded = radius.sm }: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton, opacity }}
    />
  );
}

/** Plusieurs lignes de texte en chargement ; la dernière est plus courte. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.lines}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing.sm },
});
