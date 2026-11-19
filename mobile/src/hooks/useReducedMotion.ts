import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** `true` si le système demande de réduire les animations (équivalent de prefers-reduced-motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        // Lecture impossible : on garde les animations, comme sans préférence déclarée.
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
