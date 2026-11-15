export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5281";

export async function getJson<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${apiUrl}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return { data: null, error: `The server returned ${response.status}.` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch {
    return { data: null, error: "The Volunteer API is not running yet." };
  }
}
