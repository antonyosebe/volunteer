import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { PersonIcon } from "./icons";

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function WelcomeMark({ firstName, onPress, color = colors.white }: { firstName: string; onPress: () => void; color?: string }) {
  const greeting = greetingForHour(new Date().getHours());
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${greeting}, ${firstName}. Open account menu`} onPress={onPress} style={styles.welcome}>
      <PersonIcon color={color} />
      <View>
        <Text style={[styles.label, { color }]}>{greeting},</Text>
        <Text style={[styles.name, { color }]}>{firstName}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcome: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 13,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 14,
  },
});
