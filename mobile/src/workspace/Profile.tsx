import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, getProfile, mediaUrl, saveProfile, saveProfilePhoto, type Profile as ProfileInfo } from "../api";
import { Button, Field, Notice } from "../components/ui";
import { roleLabel } from "../format";
import { useSession } from "../session";
import { colors } from "../theme";
import { PersonIcon } from "./icons";

type Draft = {
  fullName: string;
  phone: string;
  age: string;
  workplace: string;
  country: string;
  city: string;
  availability: string;
  isPrivate: boolean;
};

type PendingPhoto = {
  uri: string;
  name: string;
  type: string;
};

export function Profile({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { save, session } = useSession();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(Boolean(session?.clientId));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photoPick, setPhotoPick] = useState<PendingPhoto | null>(null);
  const name = (editing ? draft?.fullName : profile?.fullName) || session?.fullName?.trim() || "Your profile";
  const email = profile?.email || session?.email || "";
  const kind = roleLabel(profile?.clientType || session?.clientType);
  const volunteer = (profile?.clientType || session?.clientType) === "volunteer";
  const photo = photoPick?.uri || mediaUrl(profile?.photoPath);
  const place = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const headline = (name.trim().split(/\s+/)[0] || name).toUpperCase();

  useEffect(() => {
    if (!session?.clientId) return;
    let active = true;
    setLoading(true);
    getProfile(session.clientId)
      .then((body) => {
        if (!active) return;
        setProfile(body);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : "Could not load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.clientId]);

  function startEdit() {
    setDraft({
      fullName: profile?.fullName || session?.fullName || "",
      phone: profile?.phone ?? "",
      age: profile?.age ? String(profile.age) : "",
      workplace: profile?.workplace ?? "",
      country: profile?.country ?? "",
      city: profile?.city ?? "",
      availability: profile?.availability ?? "",
      isPrivate: Boolean(profile?.isPrivate),
    });
    setPhotoPick(null);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setPhotoPick(null);
    setError(null);
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = asset.mimeType || "image/jpeg";
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
    const picked = { uri: asset.uri, name: asset.fileName || `photo.${extension}`, type };
    setError(null);
    if (editing) {
      setPhotoPick(picked);
      return;
    }
    if (!session?.clientId) return;
    setSaving(true);
    try {
      const saved = await saveProfilePhoto(session.clientId, picked);
      setProfile(saved);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : "Could not save your photo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits() {
    if (!session?.clientId || !draft || saving) return;
    const fullName = draft.fullName.trim();
    if (!fullName) {
      setError("Enter your full name.");
      return;
    }
    const ageText = draft.age.trim();
    const age = ageText.length === 0 ? null : Number(ageText);
    if (ageText.length > 0 && (!Number.isInteger(age) || age! < 1 || age! > 120)) {
      setError("Enter an age from 1 to 120.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let saved = await saveProfile(session.clientId, {
        fullName,
        phone: draft.phone.trim() || null,
        age: volunteer ? age : null,
        workplace: volunteer ? draft.workplace.trim() || null : null,
        country: volunteer ? draft.country.trim() || null : null,
        city: volunteer ? draft.city.trim() || null : null,
        availability: volunteer ? draft.availability.trim() || null : null,
        ...(volunteer ? { isPrivate: draft.isPrivate } : {}),
      });
      if (photoPick) {
        saved = await saveProfilePhoto(session.clientId, photoPick);
      }
      setProfile(saved);
      await save({ ...session, fullName: saved.fullName });
      setPhotoPick(null);
      setDraft(null);
      setEditing(false);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const facts = [
    profile?.phone ? { label: "Phone", value: profile.phone } : null,
    place ? { label: "Place", value: place } : null,
    profile?.workplace ? { label: "Workplace", value: profile.workplace } : null,
    profile?.availability ? { label: "Availability", value: profile.availability } : null,
    profile?.age ? { label: "Age", value: String(profile.age) } : null,
    { label: "Account", value: kind },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
          <View style={styles.backMark} />
        </Pressable>
        <Text style={styles.title}>My Profile</Text>
        <View style={styles.back} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={pickPhoto} style={styles.photoWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photo}>
                <PersonIcon color={colors.teal} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <View style={styles.cameraBody}>
                <View style={styles.cameraLens} />
              </View>
            </View>
          </Pressable>
          <Text style={styles.name}>{headline}</Text>
          {email ? (
            <Text style={styles.email}>
              <Text style={styles.emailLabel}>Email </Text>
              {email}
            </Text>
          ) : null}
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}
        {editing && draft ? (
          <View style={styles.form}>
            <Field label="Full name" value={draft.fullName} onChangeText={(fullName) => setDraft({ ...draft, fullName })} autoCapitalize="words" />
            <Field label="Phone" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} keyboardType="phone-pad" />
            {volunteer ? (
              <>
                <Field label="City" value={draft.city} onChangeText={(city) => setDraft({ ...draft, city })} />
                <Field label="Country" value={draft.country} onChangeText={(country) => setDraft({ ...draft, country })} />
                <Field label="Workplace" value={draft.workplace} onChangeText={(workplace) => setDraft({ ...draft, workplace })} />
                <Field label="Age" value={draft.age} onChangeText={(age) => setDraft({ ...draft, age })} keyboardType="number-pad" />
                <Field label="Availability" value={draft.availability} onChangeText={(availability) => setDraft({ ...draft, availability })} />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draft.isPrivate }}
                  onPress={() => setDraft({ ...draft, isPrivate: !draft.isPrivate })}
                  style={styles.privateRow}
                >
                  <View style={[styles.box, draft.isPrivate && styles.boxOn]} />
                  <Text style={styles.privateLabel}>Private profile</Text>
                </Pressable>
              </>
            ) : null}
            <Button label={saving ? "Saving" : "Save"} onPress={saveEdits} disabled={saving} />
            <Button label="Cancel" onPress={cancelEdit} disabled={saving} tone="light" />
          </View>
        ) : (
          <>
            {facts.length > 0 ? (
              <View style={styles.card}>
                {facts.map((fact) => (
                  <View key={fact.label} style={styles.fact}>
                    <Text style={styles.factLabel}>{fact.label}</Text>
                    <Text style={styles.factValue}>{fact.value}</Text>
                  </View>
                ))}
                {profile?.isPrivate ? <Text style={styles.privateNote}>Your profile is private.</Text> : null}
              </View>
            ) : null}
            <Button label="Edit" onPress={startEdit} disabled={loading || saving || !session?.clientId} />
          </>
        )}
      </ScrollView>
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
    backgroundColor: colors.white,
    paddingBottom: 8,
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
    borderColor: colors.ink,
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingTop: 18,
  },
  photoWrap: {
    width: 112,
    height: 112,
    marginBottom: 8,
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef1f4",
    borderWidth: 2,
    borderColor: colors.white,
  },
  cameraBody: {
    width: 14,
    height: 10,
    borderRadius: 2,
    borderWidth: 1.4,
    borderColor: "#5c656e",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraLens: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1.2,
    borderColor: "#5c656e",
  },
  name: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  email: {
    color: colors.ink,
    fontSize: 14,
    textAlign: "center",
  },
  emailLabel: {
    color: colors.muted,
  },
  form: {
    gap: 14,
  },
  privateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.teal,
    backgroundColor: colors.white,
  },
  boxOn: {
    backgroundColor: colors.teal,
  },
  privateLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  account: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    gap: 14,
    borderRadius: 16,
    backgroundColor: colors.field,
    padding: 16,
  },
  fact: {
    gap: 2,
  },
  factLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  factValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  privateNote: {
    color: colors.muted,
    fontSize: 13,
  },
});
