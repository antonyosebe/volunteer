import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, getProfile, saveProfile } from "../api";
import { Notice } from "../components/ui";
import { roleLabel } from "../format";
import { useSession } from "../session";
import { colors } from "../theme";

export function Settings({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const volunteer = session?.clientType === "volunteer";
  const [loading, setLoading] = useState(Boolean(session?.clientId));
  const [saving, setSaving] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.clientId || !volunteer) {
      setLoading(false);
      return;
    }
    let active = true;
    getProfile(session.clientId)
      .then((profile) => {
        if (active) setIsPrivate(Boolean(profile.isPrivate));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof ApiError ? caught.message : "Could not load settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.clientId, volunteer]);

  async function togglePrivate(next: boolean) {
    if (!session?.clientId || saving) return;
    setSaving(true);
    setError(null);
    setIsPrivate(next);
    try {
      const profile = await getProfile(session.clientId);
      await saveProfile(session.clientId, {
        fullName: profile.fullName,
        phone: profile.phone,
        age: profile.age,
        workplace: profile.workplace,
        country: profile.country,
        city: profile.city,
        availability: profile.availability,
        isPrivate: next,
      });
    } catch (caught: unknown) {
      setIsPrivate(!next);
      setError(caught instanceof ApiError ? caught.message : "Could not save this setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
          <View style={styles.backMark} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.email || "—"}</Text>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.value}>{roleLabel(session?.clientType)}</Text>
        </View>
        {volunteer ? (
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Private profile</Text>
              <Text style={styles.rowNote}>Hide your profile from other volunteers.</Text>
            </View>
            <Switch
              accessibilityLabel="Private profile"
              value={isPrivate}
              disabled={loading || saving}
              onValueChange={togglePrivate}
              trackColor={{ false: "#d5d8dc", true: colors.teal }}
              thumbColor={colors.white}
            />
          </View>
        ) : null}
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
    padding: 20,
    gap: 16,
  },
  card: {
    gap: 4,
    borderRadius: 16,
    backgroundColor: colors.field,
    padding: 16,
  },
  label: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.field,
    padding: 16,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  rowNote: {
    color: colors.muted,
    fontSize: 13,
  },
});
