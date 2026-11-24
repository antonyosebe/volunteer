import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError, login, register } from "../api";
import { AuthScaffold } from "../components/AuthScaffold";
import { Button, Field, Notice } from "../components/ui";
import { useSession } from "../session";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

const volunteerImage = require("../../assets/hero-community.png");
const organisationImage = require("../../assets/mission-volunteers.png");

type Account = "volunteer" | "organisation";
type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { save } = useSession();
  const [account, setAccount] = useState<Account>("volunteer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "success">("error");
  const [pending, setPending] = useState(false);
  const organisation = account === "organisation";

  function choose(next: Account) {
    setAccount(next);
    setMessage(null);
  }

  async function onSubmit() {
    const name = fullName.trim();
    const address = email.trim();
    if (!name || !address || password.length < 8) {
      setTone("error");
      setMessage(
        organisation
          ? "Add an organisation name, email, and a password of at least 8 characters."
          : "Add your full name, email, and a password of at least 8 characters.",
      );
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const created = await register({ fullName: name, email: address, password, account });
      if (organisation) {
        setTone("success");
        setMessage(created.message ?? "Account created. A staff admin still needs to approve your organisation.");
        return;
      }

      const session = await login(address, password);
      if (!session.sessionId) {
        setTone("success");
        setMessage("Account created. Log in to continue.");
        return;
      }
      await save(session);
      navigation.reset({ index: 0, routes: [{ name: "SignedIn" }] });
    } catch (error) {
      setTone("error");
      setMessage(error instanceof ApiError ? error.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold image={organisation ? organisationImage : volunteerImage} onBack={() => navigation.goBack()} photoRatio={0.3}>
      <Text style={styles.title}>{organisation ? "Register an organisation" : "Register as a volunteer"}</Text>
      <View style={styles.switch}>
        <Segment label="Volunteer" selected={!organisation} onPress={() => choose("volunteer")} />
        <Segment label="Organisation" selected={organisation} onPress={() => choose("organisation")} />
      </View>
      <Field
        compact
        label={organisation ? "Organisation name" : "Full name"}
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
      />
      <Field
        compact
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        compact
        label="Password"
        value={password}
        onChangeText={setPassword}
        secure
        shown={showPassword}
        onToggleSecure={() => setShowPassword((current) => !current)}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button compact label={pending ? "Creating account" : "Create account"} onPress={() => void onSubmit()} disabled={pending} />
      {message ? <Notice tone={tone} text={message} /> : null}
      <Pressable onPress={() => navigation.replace("Login")}>
        <Text style={styles.footer}>
          Already a member? <Text style={styles.link}>Log in</Text>
        </Text>
      </Pressable>
    </AuthScaffold>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.segment, selected && styles.segmentOn]}>
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  switch: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.field,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  segmentOn: {
    backgroundColor: colors.teal,
  },
  segmentLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  segmentLabelOn: {
    color: colors.white,
  },
  footer: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 12,
  },
  link: {
    color: colors.ink,
    fontWeight: "700",
  },
});
