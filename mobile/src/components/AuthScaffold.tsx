import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, scriptFont } from "../theme";

export function AuthScaffold({
  image,
  onBack,
  children,
  photoRatio = 0.46,
}: {
  image: ImageSourcePropType;
  onBack: () => void;
  children: React.ReactNode;
  photoRatio?: number;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const photoHeight = Math.round(height * photoRatio);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.scroll, { minHeight: height }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground source={image} style={{ height: photoHeight }} resizeMode="cover">
          <LinearGradient
            colors={["rgba(12,74,112,0.25)", "rgba(12,74,112,0.05)", "rgba(12,74,112,0.62)"]}
            locations={[0, 0.42, 1]}
            style={[styles.fill, { paddingTop: insets.top + 8 }]}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12} style={styles.back}>
              <Text style={styles.backMark}>‹</Text>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            <Text style={styles.caption}>
              Make a <Text style={styles.script}>difference</Text>
              {"\n"}wherever you go.
            </Text>
          </LinearGradient>
        </ImageBackground>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.tealDeep,
  },
  scroll: {
    flexGrow: 1,
  },
  fill: {
    flex: 1,
    justifyContent: "space-between",
  },
  back: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 40,
    marginLeft: 22,
  },
  backMark: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 24,
    marginTop: -2,
  },
  backLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  caption: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginHorizontal: 22,
    marginBottom: 28,
  },
  script: {
    fontFamily: scriptFont,
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 30,
  },
  sheet: {
    flexGrow: 1,
    gap: 14,
    marginTop: -20,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
});
