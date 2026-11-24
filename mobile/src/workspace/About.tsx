import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrand } from "../brand";
import { colors } from "../theme";
import { privacySections, termsSections, type LegalSection } from "./legal";

const version = "1.0.0";

export function About({ onBack }: { onBack: () => void }) {
  const { siteName } = useBrand();
  const [page, setPage] = useState<"about" | "terms" | "privacy">("about");
  const title = page === "terms" ? "Terms & Conditions" : page === "privacy" ? "Data Privacy Policy" : `About ${siteName}`;
  const back = page === "about" ? onBack : () => setPage("about");

  return (
    <View style={styles.screen}>
      <PageHeader title={title} onBack={back} />
      {page === "about" ? <AboutHome onTerms={() => setPage("terms")} onPrivacy={() => setPage("privacy")} /> : null}
      {page === "terms" ? <LegalBody sections={termsSections} /> : null}
      {page === "privacy" ? <LegalBody sections={privacySections} /> : null}
    </View>
  );
}

function AboutHome({ onTerms, onPrivacy }: { onTerms: () => void; onPrivacy: () => void }) {
  const { siteName, logo } = useBrand();
  return (
    <View style={styles.home}>
      <Image source={logo} resizeMode="cover" style={styles.logo} />
      <Text style={styles.name}>{siteName}</Text>
      <Text style={styles.version}>Version {version}</Text>
      <Pressable accessibilityRole="link" onPress={onTerms} style={styles.linkHit}>
        <Text style={styles.link}>Terms & Conditions</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={onPrivacy} style={styles.linkHit}>
        <Text style={styles.link}>Data Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

function LegalBody({ sections }: { sections: LegalSection[] }) {
  return (
    <ScrollView contentContainerStyle={styles.legal}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          {section.items?.map((item) => (
            <View key={item.label} style={styles.item}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.paragraph}>{item.body}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
        <View style={styles.backMark} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.back} />
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
    paddingBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
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
  home: {
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 24,
    gap: 8,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  name: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  version: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 18,
  },
  linkHit: {
    paddingVertical: 6,
  },
  link: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legal: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 18,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: "700",
  },
  paragraph: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  item: {
    gap: 2,
    marginTop: 6,
  },
  itemLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
});
