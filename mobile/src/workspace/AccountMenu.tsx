import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfile, mediaUrl } from "../api";
import { useBrand } from "../brand";
import { useSession } from "../session";
import { colors } from "../theme";
import { PersonIcon } from "./icons";

export function AccountMenu({
  visible,
  firstName,
  onClose,
  onProfile,
  onAbout,
  onSettings,
  onRate,
  onSignOut,
}: {
  visible: boolean;
  firstName: string;
  onClose: () => void;
  onProfile: () => void;
  onAbout: () => void;
  onSettings: () => void;
  onRate: () => void;
  onSignOut: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const { siteName, logo } = useBrand();
  const panelWidth = Math.min(320, Math.round(width * 0.84));
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(visible);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setShown(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 180,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setShown(false);
    });
    return () => animation.stop();
  }, [progress, visible]);

  useEffect(() => {
    if (!visible || !session?.clientId) return;
    let active = true;
    getProfile(session.clientId)
      .then((profile) => {
        if (active) setPhoto(mediaUrl(profile.photoPath));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.clientId, visible]);

  if (!shown) return null;

  const items = [
    { id: "about", label: `About ${siteName}`, icon: <Image source={logo} resizeMode="contain" style={styles.menuLogo} />, onPress: onAbout },
    { id: "settings", label: "Settings", icon: <GearIcon />, onPress: onSettings },
    { id: "rate", label: "Rate us", icon: <StarIcon />, onPress: onRate },
  ];

  return (
    <View accessibilityViewIsModal style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={styles.backdropPress} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
          },
        ]}
      >
        <View style={styles.identity}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${firstName}. Account profile`} onPress={onProfile} style={styles.identityMain}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photo}>
                <PersonIcon color={colors.teal} />
              </View>
            )}
            <View style={styles.identityCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {firstName}
              </Text>
              <View style={styles.accountRow}>
                <Text style={styles.account}>Account profile</Text>
                <View style={styles.chevron} />
              </View>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} hitSlop={8} style={styles.close}>
            <View style={styles.closeMark}>
              <View style={[styles.closeBar, styles.closeBarA]} />
              <View style={[styles.closeBar, styles.closeBarB]} />
            </View>
          </Pressable>
        </View>
        <View style={styles.rule} />
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.onPress} style={styles.item}>
              {item.icon}
              <Text style={styles.itemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={styles.signOut}>
          <View style={styles.exit}>
            <View style={styles.exitDoor} />
            <View style={styles.exitArrow} />
          </View>
          <Text style={styles.itemLabel}>Sign out</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(20, 24, 28, 0.45)",
  },
  backdropPress: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.white,
    shadowColor: "#0c4a70",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 6, height: 0 },
    elevation: 12,
  },
  identity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 18,
    paddingRight: 10,
  },
  identityMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  account: {
    color: colors.muted,
    fontSize: 13,
  },
  chevron: {
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.muted,
    transform: [{ rotate: "45deg" }],
  },
  close: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBar: {
    position: "absolute",
    width: 16,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.ink,
  },
  closeBarA: {
    transform: [{ rotate: "45deg" }],
  },
  closeBarB: {
    transform: [{ rotate: "-45deg" }],
  },
  rule: {
    height: 1,
    marginTop: 14,
    marginHorizontal: 18,
    backgroundColor: colors.line,
  },
  list: {
    paddingTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  itemLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  signOut: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  exit: {
    width: 22,
    height: 22,
  },
  exitDoor: {
    position: "absolute",
    left: 1,
    top: 3,
    width: 10,
    height: 16,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: colors.ink,
  },
  exitArrow: {
    position: "absolute",
    left: 8,
    top: 10,
    width: 11,
    height: 1.5,
    backgroundColor: colors.ink,
  },
  star: {
    width: 22,
    height: 22,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  menuLogo: {
    width: 22,
    height: 22,
  },
});

function GearIcon() {
  return <Text style={styles.star}>⚙</Text>;
}

function StarIcon() {
  return <Text style={styles.star}>☆</Text>;
}
