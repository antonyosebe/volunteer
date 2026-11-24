import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useBrand } from "../brand";
import { colors } from "../theme";

export function Brand({ tone = "teal" }: { tone?: "teal" | "white" }) {
  const { siteName, logo } = useBrand();
  const color = tone === "white" ? colors.white : colors.teal;
  return (
    <View style={styles.brand}>
      <Image source={logo} style={styles.logo} />
      <Text style={[styles.brandName, { color }]}>{siteName}</Text>
    </View>
  );
}

export function Field({
  label,
  secure,
  shown,
  onToggleSecure,
  compact,
  ...input
}: TextInputProps & {
  label: string;
  secure?: boolean;
  shown?: boolean;
  onToggleSecure?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...input}
          accessibilityLabel={label}
          secureTextEntry={secure && !shown}
          placeholderTextColor="#9a948c"
          style={[styles.input, compact && styles.inputCompact]}
        />
        {secure ? (
          <Pressable onPress={onToggleSecure} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.toggle, compact && styles.toggleCompact]}>{shown ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  tone = "solid",
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "solid" | "light" | "outline";
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "solid" && styles.buttonSolid,
        tone === "light" && styles.buttonLight,
        tone === "outline" && styles.buttonOutline,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonLabel, compact && styles.buttonLabelCompact, tone === "light" ? styles.buttonLabelTeal : styles.buttonLabelLight]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <Text accessibilityRole="alert" style={[styles.notice, tone === "error" ? styles.error : styles.success]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  brandName: {
    fontSize: 15,
    fontWeight: "700",
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 12,
  },
  inputRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: 12,
  },
  inputCompact: {
    fontSize: 13,
    paddingVertical: 10,
  },
  toggle: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "600",
  },
  toggleCompact: {
    fontSize: 12,
  },
  button: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 18,
  },
  buttonSolid: {
    backgroundColor: colors.teal,
  },
  buttonLight: {
    backgroundColor: colors.white,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  pressed: {
    opacity: 0.72,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  buttonLabelCompact: {
    fontSize: 13,
  },
  buttonLabelLight: {
    color: colors.white,
  },
  buttonLabelTeal: {
    color: colors.teal,
  },
  notice: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
  },
  success: {
    color: colors.success,
  },
});
