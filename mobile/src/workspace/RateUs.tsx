import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

const storageKey = "volunteer-rating";

export function RateUs({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        const next = Number(value);
        if (active && next >= 1 && next <= 5) setScore(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function choose(next: number) {
    setScore(next);
    void AsyncStorage.setItem(storageKey, String(next));
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
          <View style={styles.backMark} />
        </Pressable>
        <Text style={styles.title}>Rate us</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.body}>
        <Text style={styles.lead}>How is the app so far?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= score;
            return (
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`} onPress={() => choose(value)}>
                <Text style={[styles.star, filled && styles.starOn]}>{filled ? "★" : "☆"}</Text>
              </Pressable>
            );
          })}
        </View>
        {score > 0 ? <Text style={styles.thanks}>Thanks for rating us.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.teal,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backMark: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  lead: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  stars: {
    flexDirection: "row",
    gap: 8,
  },
  star: {
    color: "#c5c1bb",
    fontSize: 36,
    lineHeight: 42,
  },
  starOn: {
    color: "#e2a100",
  },
  thanks: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
  },
});
