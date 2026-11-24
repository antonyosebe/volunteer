import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ApiError, listMyApplications, listReceivedApplications, type MyApplication, type ReceivedApplication } from "../api";
import { formatWhen, statusLabel, statusTone } from "../format";
import { useSession } from "../session";
import { colors } from "../theme";

type Row = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  when: string;
};

export function MyVolunteers() {
  const { session } = useSession();
  const organisation = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const volunteer = session?.clientType === "volunteer";
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!session?.clientId || (!volunteer && !organisation)) {
      setRows([]);
      setStatus("ready");
      return;
    }
    if (mode === "refresh") setRefreshing(true);
    else setStatus("loading");
    try {
      if (organisation) {
        const received = await listReceivedApplications(session.clientId);
        setRows((Array.isArray(received) ? received : []).map(fromReceived));
      } else {
        const mine = await listMyApplications(session.clientId);
        setRows((Array.isArray(mine) ? mine : []).map(fromMine));
      }
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load your volunteers.");
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, [organisation, session?.clientId, volunteer]);

  useEffect(() => {
    void load();
  }, [load]);

  const empty = !session?.clientId || (!volunteer && !organisation)
    ? "Volunteer lists are available on volunteer and organisation accounts."
    : organisation
      ? "No one has applied to your opportunities yet."
      : "You have not applied to an opportunity yet.";

  return (
    <View style={styles.screen}>
      {organisation ? <Text style={styles.lead}>People who applied to your opportunities.</Text> : null}
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
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.teal} />}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={<Text style={styles.message}>{empty}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.place, styles[statusTone(item.status)]]}>{statusLabel(item.status).toUpperCase()}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.subtitle}</Text>
              {item.when ? <Text style={styles.meta}>{item.when}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function fromMine(item: MyApplication): Row {
  return {
    id: item.applicationId,
    title: item.title,
    subtitle: item.organisationName,
    status: item.status,
    when: formatWhen(item.submittedAt),
  };
}

function fromReceived(item: ReceivedApplication): Row {
  return {
    id: item.applicationId,
    title: item.fullName,
    subtitle: item.title,
    status: item.status,
    when: formatWhen(item.submittedAt),
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  lead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  row: {
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  place: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  neutral: {
    color: colors.teal,
  },
  success: {
    color: colors.success,
  },
  danger: {
    color: colors.danger,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
});
