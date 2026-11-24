export function formatDay(value: string | null | undefined) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dateSpan(start: string | null | undefined, end: string | null | undefined) {
  const from = formatDay(start);
  const to = formatDay(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

export function initials(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function roleLabel(clientType?: string | null) {
  if (clientType === "admin") return "Staff";
  if (clientType === "org_admin" || clientType === "org_member") return "Organisation";
  if (clientType === "volunteer") return "Volunteer";
  return "Member";
}

const applicationStatus: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  declined: "Rejected",
  withdrawn: "Withdrawn",
};

export function statusLabel(status: string) {
  return applicationStatus[status] ?? status;
}

export function statusTone(status: string) {
  const key = status.toLowerCase();
  if (key === "accepted" || key === "approved") return "success" as const;
  if (key === "declined" || key === "rejected") return "danger" as const;
  return "neutral" as const;
}
