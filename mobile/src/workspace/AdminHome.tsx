import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ApiError,
  adminSummary,
  listAdminOrganisations,
  listAdminWeeks,
  setOrganisationStatus,
  type AdminOrganisation,
  type AdminSummary,
  type AdminWeek,
} from "../api";
import { colors } from "../theme";

const filters = [
  { id: "pending", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
] as const;

const accent = "#f26b21";
const statusTones = {
  pending: { ink: "#9a6b24" },
  approved: { ink: colors.success },
  rejected: { ink: colors.danger },
  suspended: { ink: colors.muted },
} as const;
const heroPhoto = require("../../assets/hero-community.png");

export function AdminDashboard({ onApprovals }: { onApprovals: () => void }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [weeks, setWeeks] = useState<AdminWeek[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([adminSummary(), listAdminWeeks()])
      .then(([summaryResult, weekResult]) => {
        if (!active) return;
        if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
        if (weekResult.status === "fulfilled") setWeeks(weekResult.value);
        const failed = [summaryResult, weekResult].find((result) => result.status === "rejected");
        setError(failed && failed.status === "rejected" ? messageOf(failed.reason) : null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pending = summary?.pending ?? 0;
  const volunteerWeeks = four(weeks, "volunteers");
  const organisationWeeks = four(weeks, "organisations");
  const joined = volunteerWeeks.map((value, index) => value + organisationWeeks[index]);
  const headline = loading
    ? "Reading the platform."
    : pending === 0
      ? "Nothing is waiting."
      : pending === 1
        ? "One organisation is waiting."
        : `${pending} organisations are waiting.`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={heroPhoto} resizeMode="cover" style={styles.heroPhoto} />
        <LinearGradient colors={["rgba(18,134,200,0.45)", "rgba(12,74,112,0.78)"]} style={styles.heroShade}>
          <Text style={styles.heroNumber}>{loading || !summary ? "—" : String(pending)}</Text>
          <Text style={styles.heroTitle}>{headline}</Text>
          <Pressable accessibilityRole="button" onPress={onApprovals} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Open approvals</Text>
          </Pressable>
        </LinearGradient>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.teal} /> : null}
      <View style={styles.metrics}>
        <Metric label="Organisations" value={summary?.organisations} note={monthNote(organisationWeeks)} tint="#e7f3fb" ink={colors.teal} onPress={onApprovals} />
        <Metric label="Volunteers" value={summary?.volunteers} note={monthNote(volunteerWeeks)} tint="#fff1e8" ink={accent} onPress={onApprovals} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Joined this month</Text>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: colors.teal }]} />
          <Text style={styles.legendText}>Volunteers</Text>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.legendText}>Organisations</Text>
        </View>
        <WeekChart volunteers={volunteerWeeks} organisations={organisationWeeks} />
        <Text style={styles.caption}>{joinedCaption(joined, loading)}</Text>
      </View>
    </ScrollView>
  );
}

export function AdminApprovals() {
  const [rows, setRows] = useState<AdminOrganisation[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ row: AdminOrganisation; status: "approved" | "rejected" | "suspended" } | null>(null);
  const shown = rows.filter((row) => row.status === filter);
  const counts = {
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    suspended: rows.filter((row) => row.status === "suspended").length,
  };

  useEffect(() => {
    let active = true;
    listAdminOrganisations()
      .then((body) => {
        if (!active) return;
        setRows(body);
        setMessage(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setMessage(caught instanceof ApiError ? caught.message : "Could not read organisations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function update(row: AdminOrganisation, status: "approved" | "rejected" | "suspended") {
    setBusyId(row.organisationId);
    setMessage(null);
    try {
      const body = await setOrganisationStatus(row.organisationId, status);
      setRows((current) => current.map((item) => (item.organisationId === row.organisationId ? { ...item, status } : item)));
      setMessage(body.message ?? "Organisation updated.");
    } catch (caught: unknown) {
      setMessage(caught instanceof ApiError ? caught.message : "Could not update that organisation.");
      try {
        setRows(await listAdminOrganisations());
      } catch {
        // Keep the message from the failed update.
      }
    } finally {
      setBusyId(null);
    }
  }

  function ask(row: AdminOrganisation, status: "approved" | "rejected" | "suspended") {
    if (busyId) return;
    setPending({ row, status });
  }

  return (
    <View style={styles.screen}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.statusGrid}>
        {filters.map((item) => {
          const selected = filter === item.id;
          const tone = statusTones[item.id];
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.id)}
              style={[styles.statusCard, selected && { borderColor: tone.ink }]}
            >
              <Text style={[styles.statusCount, { color: tone.ink }]}>{loading ? "—" : String(counts[item.id])}</Text>
              <Text style={styles.statusName}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? <ActivityIndicator color={colors.teal} /> : null}
      {message ? <Text style={styles.note}>{message}</Text> : null}
      {!loading && shown.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyTitle(filter)}</Text>
        </View>
      ) : null}
      {shown.map((row) => (
        <View key={row.organisationId} style={styles.review}>
          <View style={styles.orgRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(row.name)}</Text>
            </View>
            <View style={styles.orgCopy}>
              <Text style={styles.orgName} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.orgEmail} numberOfLines={1}>
                {row.email}
              </Text>
            </View>
            <View style={[styles.pill, pillStyle(row.status)]}>
              <Text style={[styles.pillText, statusStyle(row.status)]}>{statusLabel(row.status)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {row.status === "pending" ? (
              <Pressable accessibilityRole="button" disabled={busyId === row.organisationId} onPress={() => ask(row, "rejected")} style={styles.quiet}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            ) : null}
            {row.status === "approved" ? (
              <Pressable accessibilityRole="button" disabled={busyId === row.organisationId} onPress={() => ask(row, "suspended")} style={styles.quiet}>
                <Text style={styles.quietText}>{busyId === row.organisationId ? "Saving" : "Suspend"}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" disabled={busyId === row.organisationId} onPress={() => ask(row, "approved")} style={styles.approve}>
                <Text style={styles.approveText}>{busyId === row.organisationId ? "Saving" : "Approve"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
    {pending ? (
      <View style={styles.dialogOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setPending(null)} style={styles.dialogBackdrop} />
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{confirmTitle(pending.row.name, pending.status)}</Text>
          <Text style={styles.dialogBody}>{confirmBody(pending.status)}</Text>
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" onPress={() => setPending(null)} style={styles.quiet}>
              <Text style={styles.quietText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const next = pending;
                setPending(null);
                void update(next.row, next.status);
              }}
              style={pending.status === "approved" ? styles.approve : styles.confirmDanger}
            >
              <Text style={styles.approveText}>{confirmLabel(pending.status)}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ) : null}
    </View>
  );
}

function Metric({
  label,
  value,
  note,
  tint,
  ink,
  onPress,
}: {
  label: string;
  value?: number;
  note: string;
  tint: string;
  ink: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.metric, { backgroundColor: tint }]}>
      <Text style={[styles.metricValue, { color: ink }]}>{value === undefined ? "—" : String(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </Pressable>
  );
}

function WeekChart({ volunteers, organisations }: { volunteers: number[]; organisations: number[] }) {
  const max = Math.max(1, ...volunteers, ...organisations);
  return (
    <View style={styles.chart}>
      {volunteers.map((value, index) => (
        <View key={index} style={styles.week}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: value <= 0 ? 4 : Math.max(8, (value / max) * 84), backgroundColor: colors.teal }]} />
            <View style={[styles.bar, { height: (organisations[index] ?? 0) <= 0 ? 4 : Math.max(8, ((organisations[index] ?? 0) / max) * 84), backgroundColor: accent }]} />
          </View>
          <Text style={styles.weekLabel}>Week {index + 1}</Text>
        </View>
      ))}
    </View>
  );
}

function four(weeks: AdminWeek[], key: "volunteers" | "organisations") {
  const values = weeks.slice(0, 4).map((week) => week[key] ?? 0);
  while (values.length < 4) values.push(0);
  return values;
}

function monthNote(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "None this month";
  if (total === 1) return "1 this month";
  return `${total} this month`;
}

function joinedCaption(values: number[], loading: boolean) {
  if (loading) return "Reading who joined this month.";
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "No one has joined this month.";
  const peak = values.indexOf(Math.max(...values));
  if (total === 1) return `1 person joined, in week ${peak + 1}.`;
  return `${total} people joined. The busiest point is week ${peak + 1}.`;
}

function messageOf(reason: unknown) {
  return reason instanceof ApiError ? reason.message : "Could not load the dashboard.";
}

function statusLabel(status: string) {
  if (status === "pending") return "Waiting";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusStyle(status: string) {
  if (status === "approved") return styles.statusGood;
  if (status === "rejected") return styles.statusBad;
  if (status === "suspended") return styles.statusMuted;
  return styles.statusWait;
}

function pillStyle(status: string) {
  if (status === "approved") return styles.pillGood;
  if (status === "rejected") return styles.pillBad;
  if (status === "suspended") return styles.pillMuted;
  return styles.pillWait;
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "•";
}

function confirmTitle(name: string, status: "approved" | "rejected" | "suspended") {
  if (status === "approved") return `Approve ${name}?`;
  if (status === "rejected") return `Reject ${name}?`;
  return `Suspend ${name}?`;
}

function confirmBody(status: "approved" | "rejected" | "suspended") {
  if (status === "approved") return "This organisation will be shown publicly.";
  if (status === "rejected") return "This organisation will not be shown publicly.";
  return "This organisation will be hidden from the public list.";
}

function confirmLabel(status: "approved" | "rejected" | "suspended") {
  if (status === "approved") return "Approve";
  if (status === "rejected") return "Reject";
  return "Suspend";
}

function emptyTitle(filter: (typeof filters)[number]["id"]) {
  if (filter === "pending") return "No organisation is waiting.";
  if (filter === "approved") return "No organisation is approved.";
  if (filter === "rejected") return "No organisation is rejected.";
  if (filter === "suspended") return "No organisation is suspended.";
  return "No organisation is rejected.";
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f7f8",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusCard: {
    width: "47%",
    flexGrow: 0,
    flexBasis: "47%",
    gap: 2,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.white,
    padding: 14,
    minHeight: 92,
  },
  statusCount: {
    fontSize: 28,
    fontWeight: "700",
  },
  statusName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  review: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 14,
  },
  emptyCard: {
    gap: 4,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 16,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  rejectText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  hero: {
    overflow: "hidden",
    borderRadius: 22,
    minHeight: 220,
  },
  heroPhoto: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -36,
    width: "100%",
    height: 320,
  },
  heroShade: {
    flex: 1,
    gap: 4,
    minHeight: 220,
    padding: 18,
  },
  heroNumber: {
    color: colors.white,
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  heroButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroButtonText: {
    color: colors.tealDeep,
    fontSize: 14,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    width: "47%",
    flexGrow: 1,
    gap: 2,
    borderRadius: 18,
    padding: 14,
    minHeight: 96,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  metricLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  metricNote: {
    color: colors.muted,
    fontSize: 12,
  },
  panel: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 14,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  panelLink: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginRight: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 108,
  },
  week: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barTrack: {
    height: 84,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  bar: {
    width: 10,
    borderRadius: 5,
  },
  weekLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7f3fb",
  },
  avatarText: {
    color: colors.tealDeep,
    fontSize: 13,
    fontWeight: "700",
  },
  orgCopy: {
    flex: 1,
    gap: 1,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pillGood: {
    backgroundColor: "#e8f6ee",
  },
  pillBad: {
    backgroundColor: "#fdecec",
  },
  pillWait: {
    backgroundColor: "#e7f3fb",
  },
  pillMuted: {
    backgroundColor: colors.field,
  },
  statusMuted: {
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
  },
  card: {
    gap: 4,
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: 14,
  },
  orgName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  orgEmail: {
    color: colors.muted,
    fontSize: 13,
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusGood: {
    color: colors.success,
  },
  statusBad: {
    color: colors.danger,
  },
  statusWait: {
    color: colors.teal,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  approve: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  approveText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  quiet: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quietText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  note: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "600",
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialogBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(28,25,21,0.45)",
  },
  dialog: {
    width: "100%",
    gap: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 18,
  },
  dialogTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  dialogBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  confirmDanger: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
