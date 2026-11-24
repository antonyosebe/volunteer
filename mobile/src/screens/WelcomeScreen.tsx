import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Brand, Button } from "../components/ui";
import { colors, scriptFont } from "../theme";
import type { RootStackParamList } from "../types";

const hero = require("../../assets/hero-community.png");

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={hero} style={styles.screen} resizeMode="cover">
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(18,134,200,0.18)", "rgba(18,134,200,0.45)", "rgba(12,74,112,0.94)"]}
        locations={[0, 0.42, 1]}
        style={[styles.fill, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 22 }]}
      >
        <Brand tone="white" />
        <View style={styles.copy}>
          <Text style={styles.kicker}>Wherever you are</Text>
          <Text style={styles.title}>
            Make a{"\n"}
            <Text style={styles.script}>difference</Text>
            {"\n"}wherever you go.
          </Text>
          <Text style={styles.subtitle}>
            Discover local organisations and sign up for volunteer opportunities, whether you live there or you are passing through.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label="Log in" tone="light" onPress={() => navigation.navigate("Login")} />
          <Button label="Create an account" tone="outline" onPress={() => navigation.navigate("Signup")} />
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.tealDeep,
  },
  fill: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  copy: {
    gap: 14,
  },
  kicker: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  script: {
    fontFamily: scriptFont,
    fontSize: 44,
    fontWeight: "400",
    lineHeight: 52,
  },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
});
