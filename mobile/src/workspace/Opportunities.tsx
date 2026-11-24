import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, listOpportunities, type ListedOpportunity } from "../api";
import { colors, scriptFont } from "../theme";
import { SearchIcon } from "./icons";
import { WelcomeMark } from "./WelcomeMark";

const hero = require("../../assets/hero-community.png");
const paper = "#f4f7f8";

export function Opportunities({
  firstName,
  onProfile,
  onOpen,
}: {
  firstName: string;
  onProfile: () => void;
  onOpen: (item: ListedOpportunity) => void;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ListedOpportunity[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setStatus("loading");
    try {
      const rows = await listOpportunities();
      setItems(Array.isArray(rows) ? rows : []);
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load opportunities.");
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needle = query.trim().toLowerCase();
  const shown = items.filter((item) => {
    if (!needle) return true;
    const haystack = `${item.title ?? ""} ${item.organisationName ?? ""} ${item.location ?? ""} ${item.categoryName ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <View style={styles.screen}>
      <ImageBackground source={hero} imageStyle={styles.heroImage} style={[styles.hero, { height: insets.top + 286 }]} resizeMode="cover">
        <LinearGradient colors={["rgba(18,134,200,0.72)", "rgba(16,112,176,0.74)", "rgba(12,74,112,0.82)"]} locations={[0, 0.48, 1]} style={[styles.heroShade, { paddingTop: insets.top + 12 }]}>
          <WelcomeMark firstName={firstName} onPress={onProfile} />
          <View>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Volunteer <Text style={styles.script}>opportunities</Text>
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <SearchIcon color={colors.teal} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by place, cause, or organisation"
            placeholderTextColor="#9aa0a6"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search opportunities"
          />
        </View>
      </View>
      {status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <Pressable onPress={() => void load()} accessibilityRole="button">
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.teal} />}
          contentContainerStyle={shown.length === 0 ? styles.emptyList : styles.list}
          ListHeaderComponent={
            <Text style={styles.count}>
              {shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.message}>{needle ? "No opportunities match this search." : "No opportunities are posted yet."}</Text>
          }
          renderItem={({ item }) => <OpportunityCard item={item} onPress={() => onOpen(item)} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function facts(item: ListedOpportunity) {
  return [item.location, item.timeCommitment, item.volunteerCount ? `${item.volunteerCount} volunteers` : null]
    .filter((fact): fact is string => Boolean(fact))
    .join("  ·  ");
}

function OpportunityCard({ item, onPress }: { item: ListedOpportunity; onPress: () => void }) {
  const detail = facts(item);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.chips}>
        {item.categoryName ? <Text style={styles.chip}>{item.categoryName}</Text> : null}
        <Text style={[styles.chip, item.isPaid ? styles.chipPaid : styles.chipFree]}>{item.isPaid ? "Paid" : "Free"}</Text>
      </View>
      <View style={styles.cardRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.title || "Untitled"}</Text>
          {item.organisationName ? <Text style={styles.org}>{item.organisationName}</Text> : null}
        </View>
        <View style={styles.chevronWrap}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
      {detail ? <Text style={styles.fact}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: paper,
  },
  hero: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.tealDeep,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroShade: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 112,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 36,
  },
  script: {
    fontFamily: scriptFont,
    fontSize: 32,
    fontWeight: "400",
    lineHeight: 36,
  },
  searchWrap: {
    marginTop: -22,
    marginHorizontal: 16,
    zIndex: 2,
  },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    shadowColor: "#0c4a70",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: 12,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 20,
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retry: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 16,
    shadowColor: "#0c4a70",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "transparent",
    color: colors.tealDeep,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  chipPaid: {
    backgroundColor: "transparent",
    color: colors.success,
  },
  chipFree: {
    backgroundColor: "transparent",
    color: colors.teal,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  org: {
    color: colors.muted,
    fontSize: 14,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.field,
  },
  chevron: {
    color: colors.teal,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "400",
  },
  fact: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
});
