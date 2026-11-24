import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError, login } from "../api";
import { AuthScaffold } from "../components/AuthScaffold";
import { Button, Field, Notice } from "../components/ui";
import { useSession } from "../session";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

const hero = require("../../assets/hero-community.png");

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { save } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setMessage("Enter your email or username and password.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const session = await login(trimmed, password);
      if (!session.sessionId) {
        setMessage("Sign-in failed.");
        return;
      }
      await save(session);
      navigation.reset({ index: 0, routes: [{ name: "SignedIn" }] });
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold image={hero} onBack={() => navigation.goBack()}>
      <Text style={styles.title}>Log in</Text>
      <Field
        compact
        label="Email or username"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
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
        autoComplete="current-password"
        textContentType="password"
      />
      <Button compact label={pending ? "Signing in" : "Log in"} onPress={() => void onSubmit()} disabled={pending} />
      {message ? <Notice tone="error" text={message} /> : null}
      <Text style={styles.footer}>
        Not a member?{" "}
        <Text style={styles.link} onPress={() => navigation.replace("Signup")}>
          Create an account
        </Text>
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
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
