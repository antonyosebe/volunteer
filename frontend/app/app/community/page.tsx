"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { initials, useSession } from "@/lib/session";

type Post = {
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

type Comment = {
  commentId: string;
  postId: string;
  fullName: string;
  photoPath: string | null;
  body: string;
  createdAt: string;
};

export default function Page() {
  const session = useSession();
  const volunteer = session?.clientType === "volunteer";
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const [feed, thread, profile] = await Promise.all([
          fetch(`${apiUrl}/api/community/${session?.clientId}`),
          fetch(`${apiUrl}/api/community/${session?.clientId}/comments`),
          fetch(`${apiUrl}/api/profile/${session?.clientId}`),
        ]);
        const rows = (await feed.json().catch(() => null)) as Post[] | { message?: string } | null;
        const notes = (await thread.json().catch(() => null)) as Comment[] | null;
        const account = (await profile.json().catch(() => null)) as { isPrivate?: boolean } | null;
        if (ignore) return;
        if (!feed.ok || !Array.isArray(rows)) {
          setMessage((rows as { message?: string } | null)?.message ?? "Could not read the community.");
          return;
        }
        setPosts(rows);
        setComments(Array.isArray(notes) ? notes : []);
        setIsPrivate(Boolean(account?.isPrivate));
        setMessage(null);
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      } finally {
        if (!ignore) setReady(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [session?.clientId]);

  function clearPhoto() {
    setPhoto(null);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (photoInput.current) photoInput.current.value = "";
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 2 * 1024 * 1024) {
      clearPhoto();
      setMessage("That image is larger than 2 MB.");
      return;
    }
    setMessage(null);
    setPhoto(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.clientId || !volunteer) return;
    if (!text.trim() && !photo) {
      setMessage("Write an update or choose a photo.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("body", text);
      if (photo) form.append("photo", photo);
      const response = await fetch(`${apiUrl}/api/community/${session.clientId}`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not post this update.");
        return;
      }
      setText("");
      clearPhoto();
      const feed = await fetch(`${apiUrl}/api/community/${session.clientId}`);
      const rows = (await feed.json().catch(() => null)) as Post[] | null;
      if (feed.ok && Array.isArray(rows)) setPosts(rows);
      setMessage("Posted to the community.");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  async function comment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    if (!session?.clientId) return;
    const form = event.currentTarget;
    const note = String(new FormData(form).get("comment") ?? "");
    setCommentPost(postId);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/community/${session.clientId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, body: note }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not add this comment.");
        return;
      }
      form.reset();
      const thread = await fetch(`${apiUrl}/api/community/${session.clientId}/comments`);
      const notes = (await thread.json().catch(() => null)) as Comment[] | null;
      if (thread.ok && Array.isArray(notes)) setComments(notes);
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setCommentPost(null);
    }
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Community</span>
      </p>
      <header className="mt-3 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">Community</h1>
        <p className="mt-1 text-sm text-ink/55">See what other volunteers are doing.</p>
      </header>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          to see the community.
        </p>
      ) : null}
      {volunteer && isPrivate ? (
        <p className="mt-4 max-w-2xl text-sm text-ink/60">Your profile is private, so your posts and comments use the name Anonymous.</p>
      ) : null}
      {volunteer ? (
        <form onSubmit={publish} className="mt-5 max-w-2xl rounded-3xl border border-line bg-white p-5">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Share an update
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="What are you doing?"
              className="rounded-lg border border-line px-3 py-2 font-normal text-ink outline-none focus:border-teal"
            />
          </label>
          {preview ? (
            <img src={preview} alt="" className="mt-3 h-auto w-full rounded-2xl" />
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
              {photo ? "Change photo" : "Add a photo"}
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={choosePhoto}
              />
            </label>
            {photo ? (
              <button type="button" onClick={clearPhoto} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
                Remove
              </button>
            ) : null}
          </div>
          <button type="submit" disabled={pending} className="mt-3 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
            {pending ? "Posting" : "Post"}
          </button>
        </form>
      ) : null}
      {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
      {session && ready && !message && posts.length === 0 ? <p className="mt-6 text-sm text-ink/60">No one has posted yet.</p> : null}
      {posts.length > 0 ? (
        <ul className="mt-6 grid max-w-2xl gap-4">
          {posts.map((post) => {
            const place = [post.city, post.country].filter(Boolean).join(", ");
            return (
              <li key={post.postId} className="rounded-3xl border border-line bg-white p-5">
                <div className="flex items-center gap-3">
                  {post.photoPath ? (
                    <img src={`${apiUrl}/uploads/${post.photoPath}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-teal/10 text-xs font-semibold text-teal">{initials(post.fullName)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{post.fullName}</p>
                    <p className="text-xs text-ink/45">{[place, showDate(post.createdAt)].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                {post.body?.trim() ? <p className="mt-3 text-sm leading-6 text-ink/80">{post.body}</p> : null}
                {post.imagePath ? (
                  <img src={`${apiUrl}/uploads/${post.imagePath}`} alt="" className="mt-3 h-auto w-full rounded-2xl" />
                ) : null}
                <ul className="mt-4 grid gap-3 border-t border-line pt-4 empty:hidden">
                  {comments.filter((item) => item.postId === post.postId).map((item) => (
                    <li key={item.commentId} className="flex gap-3">
                      {item.photoPath ? (
                        <img src={`${apiUrl}/uploads/${item.photoPath}`} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/10 text-xs font-semibold text-teal">{initials(item.fullName)}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className="font-semibold">{item.fullName}</span>
                          <span className="text-ink/40"> · {showDate(item.createdAt)}</span>
                        </p>
                        <p className="text-sm leading-6 text-ink/80">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {session?.clientId ? (
                  <form onSubmit={(event) => void comment(event, post.postId)} className="mt-3 flex gap-2">
                    <input
                      name="comment"
                      maxLength={300}
                      placeholder="Write a comment"
                      className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-teal"
                    />
                    <button type="submit" disabled={commentPost === post.postId} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
                      {commentPost === post.postId ? "Sending" : "Comment"}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function showDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
