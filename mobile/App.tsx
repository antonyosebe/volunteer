import { GreatVibes_400Regular, useFonts } from "@expo-google-fonts/great-vibes";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandProvider, useBrand } from "./src/brand";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignedInScreen } from "./src/screens/SignedInScreen";
import { SignupScreen } from "./src/screens/SignupScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { SessionProvider, useSession } from "./src/session";
import { colors } from "./src/theme";
import type { RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Routes() {
  const { ready, session } = useSession();
  if (!ready) return <Boot />;

  return (
    <Stack.Navigator initialRouteName={session ? "SignedIn" : "Welcome"} screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="SignedIn" component={SignedInScreen} />
    </Stack.Navigator>
  );
}

function Boot() {
  const { siteName, logo } = useBrand();
  return (
    <View style={styles.boot}>
      <StatusBar style="dark" />
      <Image source={logo} resizeMode="contain" style={styles.logo} />
      <Text style={styles.name}>{siteName}</Text>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ GreatVibes_400Regular });
  const ready = fontsLoaded || fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <SafeAreaProvider>
      <BrandProvider>
        <SessionProvider>
          {ready ? (
            <NavigationContainer>
              <Routes />
            </NavigationContainer>
          ) : (
            <Boot />
          )}
        </SessionProvider>
      </BrandProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.white,
  },
  logo: {
    width: 88,
    height: 88,
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
  },
});
