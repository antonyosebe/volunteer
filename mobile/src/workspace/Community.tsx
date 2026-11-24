import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addComment,
  ApiError,
  deleteCommunityPost,
  listComments,
  listCommunity,
  mediaUrl,
  publishUpdate,
  type CommunityComment,
  type CommunityPost,
} from "../api";
import { formatDay, initials } from "../format";
import { useSession } from "../session";
import { colors } from "../theme";

export function Community() {
  const listRef = useRef<FlatList<CommunityPost>>(null);
  const { session } = useSession();
  const volunteer = session?.clientType === "volunteer";
  const clientId = session?.clientId;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [composing, setComposing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!clientId) {
      setStatus("ready");
      return;
    }
    if (mode === "refresh") setRefreshing(true);
    else setStatus("loading");
    try {
      const [feed, thread] = await Promise.all([listCommunity(clientId), listComments(clientId)]);
      setPosts(Array.isArray(feed) ? feed : []);
      setComments(Array.isArray(thread) ? thread : []);
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not read the community.");
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    if (!clientId) return;
    const body = text.trim();
    if (!body) {
      setNotice("Write an update first.");
      return;
    }
    setPosting(true);
    setNotice(null);
    try {
      await publishUpdate(clientId, body);
      setText("");
      setComposing(false);
      const feed = await listCommunity(clientId);
      setPosts(Array.isArray(feed) ? feed : []);
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Could not post this update.");
    } finally {
      setPosting(false);
    }
  }

  function askRemove(postId: string) {
    Alert.alert("Delete this post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove(postId) },
    ]);
  }

  async function remove(postId: string) {
    if (!clientId) return;
    setNotice(null);
    try {
      await deleteCommunityPost(clientId, postId);
      setPosts((current) => current.filter((item) => item.postId !== postId));
      setComments((current) => current.filter((item) => item.postId !== postId));
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Could not delete this post.");
    }
  }

  async function comment(postId: string) {
    if (!clientId) return;
    const body = (drafts[postId] ?? "").trim();
    if (!body) return;
    setSending(postId);
    setNotice(null);
    try {
      await addComment(clientId, postId, body);
      setDrafts((current) => ({ ...current, [postId]: "" }));
      const thread = await listComments(clientId);
      setComments(Array.isArray(thread) ? thread : []);
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Could not add this comment.");
    } finally {
      setSending(null);
    }
  }

  if (!clientId) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Community is available once you are signed in as a volunteer or organisation.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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
          ref={listRef}
          data={composing ? [] : posts}
          keyExtractor={(item) => item.postId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.teal} />}
          contentContainerStyle={[styles.list, volunteer && styles.listWithFab]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.lead}>See what other volunteers are doing.</Text>
              {composing ? (
                <View style={styles.composer}>
                  <Text style={styles.sheetTitle}>New post</Text>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="What are you doing?"
                    placeholderTextColor="#9aa0a6"
                    multiline
                    maxLength={500}
                    autoFocus
                    style={styles.composerInput}
                    textAlignVertical="top"
                  />
                  {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                  <View style={styles.sheetActions}>
                    <Pressable accessibilityRole="button" onPress={() => setComposing(false)} style={styles.cancel}>
                      <Text style={styles.cancelLabel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={posting}
                      onPress={() => void publish()}
                      style={({ pressed }) => [styles.post, (pressed || posting) && styles.pressed]}
                    >
                      <Text style={styles.postLabel}>{posting ? "Posting" : "Post"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : notice ? (
                <Text style={styles.notice}>{notice}</Text>
              ) : null}
              {!composing && posts.length === 0 ? <Text style={styles.message}>No one has posted yet.</Text> : null}
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              comments={comments.filter((note) => note.postId === item.postId)}
              draft={drafts[item.postId] ?? ""}
              onDraft={(value) => setDrafts((current) => ({ ...current, [item.postId]: value }))}
              sending={sending === item.postId}
              onComment={() => void comment(item.postId)}
              canComment={Boolean(clientId)}
              mine={item.clientId.toLowerCase() === clientId.toLowerCase()}
              onDelete={() => askRemove(item.postId)}
            />
          )}
        />
      )}
      {volunteer && status === "ready" && !composing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New post"
          onPress={() => {
            setNotice(null);
            setComposing(true);
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <View style={styles.plus}>
            <View style={styles.plusBar} />
            <View style={[styles.plusBar, styles.plusBarVertical]} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function PostImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(1);

  return (
    <Image
      source={{ uri }}
      resizeMode="contain"
      onLoad={(event) => {
        const width = event.nativeEvent.source?.width ?? 0;
        const height = event.nativeEvent.source?.height ?? 0;
        if (width > 0 && height > 0) setRatio(width / height);
      }}
      style={[styles.photo, { aspectRatio: ratio }]}
    />
  );
}

function PostCard({
  post,
  comments,
  draft,
  onDraft,
  sending,
  onComment,
  canComment,
  mine,
  onDelete,
}: {
  post: CommunityPost;
  comments: CommunityComment[];
  draft: string;
  onDraft: (value: string) => void;
  sending: boolean;
  onComment: () => void;
  canComment: boolean;
  mine: boolean;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const photo = mediaUrl(post.photoPath);
  const image = mediaUrl(post.imagePath);
  const place = [post.city, post.country].filter(Boolean).join(", ");
  const when = formatDay(post.createdAt);

  return (
    <View style={styles.card}>
      <View style={styles.author}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials(post.fullName)}</Text>
          </View>
        )}
        <View style={styles.authorCopy}>
          <Text style={styles.name}>{post.fullName}</Text>
          <Text style={styles.meta}>{[place, when].filter(Boolean).join(" · ")}</Text>
        </View>
        {mine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post options"
            hitSlop={8}
            onPress={() => setMenu((open) => !open)}
            style={styles.more}
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </Pressable>
        ) : null}
      </View>
      {menu ? (
        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMenu(false);
              onDelete();
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuDelete}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
      {post.body?.trim() ? <Text style={styles.body}>{post.body}</Text> : null}
      {image ? <PostImage uri={image} /> : null}
      {comments.map((note) => (
        <View key={note.commentId} style={styles.comment}>
          <Text style={styles.commentName}>{note.fullName}</Text>
          <Text style={styles.commentBody}>{note.body}</Text>
        </View>
      ))}
      {canComment ? (
        <View style={styles.commentRow}>
          <TextInput
            value={draft}
            onChangeText={onDraft}
            placeholder="Write a comment"
            placeholderTextColor="#9aa0a6"
            style={styles.commentInput}
            maxLength={300}
          />
          <Pressable accessibilityRole="button" disabled={sending} onPress={onComment} style={styles.commentButton}>
            <Text style={styles.commentButtonLabel}>{sending ? "…" : "Send"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
  },
  list: {
    paddingBottom: 24,
  },
  listWithFab: {
    paddingBottom: 88,
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  plus: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBar: {
    position: "absolute",
    width: 18,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  plusBarVertical: {
    transform: [{ rotate: "90deg" }],
  },
  composer: {
    gap: 10,
    marginTop: 8,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  cancel: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 8,
  },
  lead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  composerInput: {
    minHeight: 84,
    borderRadius: 12,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  post: {
    alignSelf: "flex-start",
    borderRadius: 12,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  postLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  notice: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },
  retry: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 14,
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.field,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,134,200,0.12)",
  },
  avatarText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "700",
  },
  authorCopy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  body: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  more: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  menu: {
    alignSelf: "flex-end",
    minWidth: 128,
    marginTop: -6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuDelete: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  photo: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.field,
  },
  comment: {
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  commentName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  commentBody: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.field,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 14,
  },
  commentButton: {
    borderRadius: 10,
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentButtonLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
