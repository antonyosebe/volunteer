import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ApiError,
  applyToOpportunity,
  getMyApplication,
  getOpportunity,
  type OpportunityDetail as Opportunity,
} from "../api";
import { Button, Notice } from "../components/ui";
import { dateSpan, formatDay, statusLabel, statusTone } from "../format";
import { useSession } from "../session";
import { colors } from "../theme";

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function OpportunityDetail({ id }: { id: string }) {
  const { session } = useSession();
  const volunteer = session?.clientType === "volunteer";
  const [item, setItem] = useState<Opportunity | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<string | null>(null);
  const [motivation, setMotivation] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setNotice(null);
    try {
      const opportunity = await getOpportunity(id);
      let existing: string | null = null;
      if (volunteer && session?.clientId && !(opportunity.deadline && opportunity.deadline < today())) {
        try {
          const mine = await getMyApplication(id, session.clientId);
          existing = mine.status ?? "submitted";
        } catch (caught) {
          if (!(caught instanceof ApiError) || !/not applied/i.test(caught.message)) {
            setNotice(caught instanceof ApiError ? caught.message : "Could not read your application.");
          }
        }
      }
      setApplication(existing);
      setItem(opportunity);
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not open this opportunity.");
      setStatus("error");
    }
  }, [id, session?.clientId, volunteer]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!session?.clientId) return;
    const note = motivation.trim();
    if (note.length < 20) {
      setNotice("Write at least a short note about why you want to help.");
      return;
    }
    setPending(true);
    setNotice(null);
    try {
      const result = await applyToOpportunity(id, session.clientId, note);
      setApplication(result.status ?? "submitted");
      setMotivation("");
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Could not send your application.");
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (status === "error" || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{error ?? "That opportunity is not available."}</Text>
        <Pressable onPress={() => void load()} accessibilityRole="button">
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const place = item.isRemote && item.location ? `${item.location} · Remote` : item.isRemote ? "Remote" : item.location;
  const when = dateSpan(item.startsOn, item.endsOn);
  const closed = Boolean(item.deadline && item.deadline < today());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {item.organisationName ? <Text style={styles.org}>{item.organisationName}</Text> : null}
      <Text style={styles.title}>{item.title}</Text>
      {place ? <Text style={styles.meta}>{place}</Text> : null}
      <Text style={styles.pay}>{item.isPaid ? "Paid" : "Free"}</Text>
      {when ? <Text style={styles.meta}>{when}</Text> : null}
      {item.timeCommitment ? <Text style={styles.meta}>{item.timeCommitment}</Text> : null}
      {item.volunteerCount ? <Text style={styles.meta}>{item.volunteerCount} volunteers</Text> : null}
      {item.categoryName ? <Text style={styles.meta}>{item.categoryName}</Text> : null}
      {item.deadline ? <Text style={styles.meta}>Apply by {formatDay(item.deadline)}</Text> : null}
      <Text style={styles.body}>{item.description}</Text>
      {volunteer && closed ? <Text style={styles.message}>Applications for this opportunity are closed.</Text> : null}
      {volunteer && !closed && application ? (
        <Text style={styles.applied}>
          You have applied. Status: <Text style={styles[statusTone(application)]}>{statusLabel(application)}</Text>
        </Text>
      ) : null}
      {volunteer && !closed && !application ? (
        <View style={styles.apply}>
          <Text style={styles.label}>Why do you want to help?</Text>
          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            multiline
            placeholder="A short note is enough"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            textAlignVertical="top"
          />
          <Button label={pending ? "Sending" : "Apply"} onPress={() => void submit()} disabled={pending} />
        </View>
      ) : null}
      {notice ? <Notice tone="error" text={notice} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: 20,
    gap: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
  },
  org: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  pay: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
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
  applied: {
    marginTop: 16,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
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
  apply: {
    marginTop: 18,
    gap: 10,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
});
