import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ListedOpportunity } from "../api";
import { useSession } from "../session";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";
import { AdminApprovals, AdminDashboard } from "../workspace/AdminHome";
import { About } from "../workspace/About";
import { AccountMenu } from "../workspace/AccountMenu";
import { Community } from "../workspace/Community";
import { MyVolunteers } from "../workspace/MyVolunteers";
import { Opportunities } from "../workspace/Opportunities";
import { OpportunityDetail } from "../workspace/OpportunityDetail";
import { PersonIcon } from "../workspace/icons";
import { Profile } from "../workspace/Profile";
import { RateUs } from "../workspace/RateUs";
import { Settings } from "../workspace/Settings";
import { WelcomeMark } from "../workspace/WelcomeMark";

type Props = NativeStackScreenProps<RootStackParamList, "SignedIn">;
type Tab = "opportunities" | "mine" | "community";
type AdminTab = "dashboard" | "approvals";

const titles: Record<Tab, string> = {
  opportunities: "Volunteer Opportunities",
  mine: "My Applications",
  community: "Community",
};

const volunteerIcon = require("../../assets/tab-volunteer.png");
const communityIcon = require("../../assets/tab-community.png");
const logo = require("../../assets/logo.png");

const tabs: { id: Tab; label: string; source: ImageSourcePropType; tint?: boolean }[] = [
  { id: "opportunities", label: "Volunteer", source: volunteerIcon },
  { id: "mine", label: "My Applications", source: logo },
  { id: "community", label: "Community", source: communityIcon, tint: true },
];

function firstName(fullName?: string | null) {
  const name = fullName?.trim().split(/\s+/)[0];
  return name ? name.toUpperCase() : "THERE";
}

export function SignedInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { clear, session } = useSession();
  const [tab, setTab] = useState<Tab>("opportunities");
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const admin = session?.clientType === "admin";
  const [open, setOpen] = useState<ListedOpportunity | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheet = profileOpen || settingsOpen || rateOpen || aboutOpen;

  function select(next: Tab) {
    setOpen(null);
    setProfileOpen(false);
    setSettingsOpen(false);
    setRateOpen(false);
    setAboutOpen(false);
    setMenuOpen(false);
    setTab(next);
  }

  function openFromMenu(which: "profile" | "settings" | "rate" | "about") {
    setMenuOpen(false);
    setProfileOpen(which === "profile");
    setSettingsOpen(which === "settings");
    setRateOpen(which === "rate");
    setAboutOpen(which === "about");
  }

  function logout() {
    void clear().then(() => {
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
    });
  }

  const title = admin ? (adminTab === "dashboard" ? "Dashboard" : "Approvals") : open?.title || titles[tab];
  const photoHeader = !admin && tab === "opportunities" && !open && !sheet;
  const sectionHeader = admin ? !sheet : (tab === "mine" || tab === "community") && !open && !sheet;

  return (
    <View style={styles.screen}>
      <StatusBar style={(menuOpen && !sheet) || aboutOpen || profileOpen ? "dark" : "light"} />
      {sectionHeader ? (
        <View style={[styles.welcomeBar, { paddingTop: insets.top + 10 }]}>
          {admin && adminTab === "dashboard" ? (
            <WelcomeMark firstName={firstName(session?.fullName)} onPress={() => setMenuOpen(true)} />
          ) : (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Open account menu" onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.profileButton}>
                <PersonIcon color={colors.white} />
              </Pressable>
              <Text style={[styles.sectionTitle, styles.centeredTitle]} numberOfLines={1}>
                {admin ? "Approvals" : tab === "mine" && (session?.clientType === "org_admin" || session?.clientType === "org_member") ? "Applicants" : titles[tab]}
              </Text>
              <View style={styles.profileButton} />
            </>
          )}
        </View>
      ) : photoHeader || sheet || admin ? null : (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            {open ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to opportunities"
                onPress={() => setOpen(null)}
                hitSlop={8}
                style={styles.back}
              >
                <View style={styles.backMark} />
              </Pressable>
            ) : (
              <View style={styles.back} />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.back} />
          </View>
        </View>
      )}
      <View style={styles.body}>
        {profileOpen ? (
          <Profile onBack={() => setProfileOpen(false)} />
        ) : admin && !sheet ? (
          adminTab === "dashboard" ? (
            <AdminDashboard onApprovals={() => setAdminTab("approvals")} />
          ) : (
            <AdminApprovals />
          )
        ) : settingsOpen ? (
          <Settings onBack={() => setSettingsOpen(false)} />
        ) : rateOpen ? (
          <RateUs onBack={() => setRateOpen(false)} />
        ) : aboutOpen ? (
          <About onBack={() => setAboutOpen(false)} />
        ) : open ? (
          <OpportunityDetail id={open.id} />
        ) : tab === "opportunities" ? (
          <Opportunities firstName={firstName(session?.fullName)} onProfile={() => setMenuOpen(true)} onOpen={setOpen} />
        ) : tab === "mine" ? (
          <MyVolunteers />
        ) : (
          <Community />
        )}
      </View>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {(admin
          ? [
              { id: "dashboard" as const, label: "Dashboard" },
              { id: "approvals" as const, label: "Approvals" },
            ]
          : []
        ).map((item) => {
          const active = !sheet && adminTab === item.id;
          const color = active ? colors.teal : "#8b8680";
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setMenuOpen(false);
                setProfileOpen(false);
                setSettingsOpen(false);
                setRateOpen(false);
                setAboutOpen(false);
                setAdminTab(item.id);
              }}
              style={styles.tab}
            >
              <View style={[styles.indicator, active && styles.indicatorActive]} />
              <View style={styles.tabIcon}>{item.id === "dashboard" ? <GridMark color={color} /> : <CheckMark color={color} />}</View>
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        {!admin && tabs.map((item) => {
          const active = !open && !sheet && tab === item.id;
          const color = active ? colors.teal : "#8b8680";
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => select(item.id)}
              style={styles.tab}
            >
              <View style={[styles.indicator, active && styles.indicatorActive]} />
              <View style={styles.tabIcon}>
                <Image source={item.source} resizeMode="contain" tintColor={item.tint ? color : undefined} style={styles.mark} />
              </View>
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <AccountMenu
        visible={menuOpen && !sheet}
        firstName={firstName(session?.fullName)}
        onClose={() => setMenuOpen(false)}
        onProfile={() => openFromMenu("profile")}
        onAbout={() => openFromMenu("about")}
        onSettings={() => openFromMenu("settings")}
        onRate={() => openFromMenu("rate")}
        onSignOut={logout}
      />
    </View>
  );
}

function GridMark({ color }: { color: string }) {
  return (
    <View style={markStyles.grid}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={[markStyles.cell, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function CheckMark({ color }: { color: string }) {
  return <View style={[markStyles.check, { borderColor: color }]} />;
}

const markStyles = StyleSheet.create({
  grid: {
    width: 22,
    height: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  cell: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  check: {
    width: 14,
    height: 8,
    marginTop: 2,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: "-45deg" }],
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f7f8",
  },
  welcomeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.teal,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  profileButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  centeredTitle: {
    textAlign: "center",
  },
  header: {
    backgroundColor: colors.teal,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  headerRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
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
    borderColor: colors.white,
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  body: {
    flex: 1,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    minHeight: 56,
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  indicator: {
    height: 3,
    width: "70%",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: colors.teal,
  },
  tabIcon: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 26,
    height: 26,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
