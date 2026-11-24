import { Platform } from "react-native";
import settings from "../appsettings.json";

export const apiUrl = settings.Api.BaseUrl.replace(/\/$/, "");

export type Session = {
  message?: string;
  sessionId: string;
  clientId?: string;
  userId?: string;
  email: string;
  fullName: string;
  clientType: string;
};

type MessageBody = {
  message?: string;
};

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function post<T>(path: string, body: unknown, sessionId?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(sessionId ? { "X-Volunteer-Session": sessionId } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  }

  const payload = (await response.json().catch(() => null)) as (T & MessageBody) | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Something went wrong. Try again.");
  }
  if (!payload) {
    throw new ApiError("The Volunteer API returned an empty response.");
  }
  return payload;
}

export function login(email: string, password: string) {
  return post<Session>("/api/auth/login", { email, password });
}

export function register(input: {
  fullName: string;
  email: string;
  password: string;
  account: "volunteer" | "organisation";
}) {
  return post<MessageBody>("/api/auth/register", input);
}

export function logout(sessionId: string) {
  return fetch(`${apiUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "X-Volunteer-Session": sessionId },
  }).catch(() => undefined);
}

export type ListedOpportunity = {
  id: string;
  title: string;
  location: string | null;
  organisationName: string | null;
  categoryName: string | null;
  timeCommitment: string | null;
  volunteerCount: number | null;
  isPaid: boolean;
};

export type OpportunityDetail = {
  title: string;
  description: string;
  location: string | null;
  isRemote: boolean;
  organisationName: string | null;
  categoryName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  deadline: string | null;
  timeCommitment: string | null;
  volunteerCount: number | null;
  isPaid: boolean;
};

export type MyApplication = {
  applicationId: string;
  opportunityId: string;
  title: string;
  organisationName: string;
  status: string;
  submittedAt: string;
};

export type ReceivedApplication = {
  applicationId: string;
  opportunityId: string;
  title: string;
  fullName: string;
  email: string;
  motivation: string;
  status: string;
  submittedAt: string;
};

export type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  age: number | null;
  workplace: string | null;
  country: string | null;
  city: string | null;
  availability: string | null;
  clientType: string;
  photoPath: string | null;
  isPrivate?: boolean;
};

export type CommunityPost = {
  postId: string;
  clientId: string;
  fullName: string;
  city: string | null;
  country: string | null;
  photoPath: string | null;
  body: string;
  imagePath: string | null;
  createdAt: string;
};

export type CommunityComment = {
  commentId: string;
  postId: string;
  fullName: string;
  photoPath: string | null;
  body: string;
  createdAt: string;
};

async function put<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: "PUT",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The server took too long to answer. Try again.");
    }
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as (T & MessageBody) | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Something went wrong. Try again.");
  }
  if (payload === null) {
    throw new ApiError("The Volunteer API returned an empty response.");
  }
  return payload;
}

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  }

  const payload = (await response.json().catch(() => null)) as (T & MessageBody) | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Something went wrong. Try again.");
  }
  if (payload === null) {
    throw new ApiError("The Volunteer API returned an empty response.");
  }
  return payload;
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiUrl}/uploads/${path.replace(/^\//, "")}`;
}

export function listOpportunities() {
  return get<ListedOpportunity[]>("/api/opportunities");
}

export function getOpportunity(id: string) {
  return get<OpportunityDetail>(`/api/opportunities/${id}`);
}

export function listMyApplications(clientId: string) {
  return get<MyApplication[]>(`/api/applications/mine/${clientId}`);
}

export function listReceivedApplications(clientId: string) {
  return get<ReceivedApplication[]>(`/api/applications/received/${clientId}`);
}

export function getMyApplication(opportunityId: string, clientId: string) {
  return get<{ status: string }>(`/api/opportunities/${opportunityId}/applications/${clientId}`);
}

export function applyToOpportunity(opportunityId: string, clientId: string, motivation: string) {
  return post<{ message?: string; status?: string }>(`/api/opportunities/${opportunityId}/applications`, {
    clientId,
    motivation,
  });
}

export function getProfile(clientId: string) {
  return get<Profile>(`/api/profile/${clientId}`);
}

export type AdminSummary = {
  volunteers: number;
  organisations: number;
  pending: number;
  approved: number;
};

export type AdminOrganisation = {
  organisationId: string;
  name: string;
  email: string;
  status: string;
};

export type AdminWeek = {
  weekIndex: number;
  volunteers: number;
  organisations: number;
};

export function adminSummary() {
  return get<AdminSummary>("/api/admin/summary");
}

export function listAdminOrganisations() {
  return get<AdminOrganisation[]>("/api/admin/organisations");
}

export function listAdminWeeks() {
  return get<AdminWeek[]>("/api/admin/weeks");
}

export function setOrganisationStatus(organisationId: string, status: "approved" | "rejected" | "suspended") {
  return put<{ message?: string }>(`/api/admin/organisations/${organisationId}/status`, { status });
}

export type ProfileUpdate = {
  fullName: string;
  phone: string | null;
  age: number | null;
  workplace: string | null;
  country: string | null;
  city: string | null;
  availability: string | null;
  isPrivate?: boolean;
};

export function saveProfile(clientId: string, body: ProfileUpdate) {
  return put<Profile>(`/api/profile/${clientId}`, body);
}

export async function saveProfilePhoto(clientId: string, file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const fetched = await fetch(file.uri);
    const blob = await fetched.blob();
    form.append("photo", new File([blob], file.name, { type: file.type || blob.type || "image/jpeg" }));
  } else {
    form.append("photo", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/profile/${clientId}/photo`, {
      method: "PUT",
      headers: { Accept: "application/json" },
      body: form,
    });
  } catch {
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  }

  const payload = (await response.json().catch(() => null)) as (Profile & MessageBody) | null;
  if (!response.ok || !payload?.fullName) {
    throw new ApiError(payload?.message ?? "Could not save your photo.");
  }
  return payload;
}

export function listCommunity(clientId: string) {
  return get<CommunityPost[]>(`/api/community/${clientId}`);
}

export function listComments(clientId: string) {
  return get<CommunityComment[]>(`/api/community/${clientId}/comments`);
}

export function addComment(clientId: string, postId: string, body: string) {
  return post<{ message?: string }>(`/api/community/${clientId}/comments`, { postId, body });
}

export async function deleteCommunityPost(clientId: string, postId: string) {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/community/${clientId}/${postId}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  }

  const payload = (await response.json().catch(() => null)) as MessageBody | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Could not delete this post.");
  }
  return payload;
}

export async function publishUpdate(clientId: string, body: string) {
  const form = new FormData();
  form.append("body", body);
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/community/${clientId}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });
  } catch {
    throw new ApiError(`The Volunteer API is not reachable at ${apiUrl.replace(/^https?:\/\//, "")}.`);
  }

  const payload = (await response.json().catch(() => null)) as MessageBody | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Could not post this update.");
  }
  return payload;
}
