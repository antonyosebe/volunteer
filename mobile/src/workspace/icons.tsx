import { StyleSheet, View } from "react-native";

export function PlusIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.plusBar, styles.plusAcross, { backgroundColor: color }]} />
      <View style={[styles.plusBar, styles.plusDown, { backgroundColor: color }]} />
    </View>
  );
}

export function ListIcon({ color }: { color: string }) {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((line) => (
        <View key={line} style={styles.listRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={[styles.rule, { backgroundColor: color }]} />
        </View>
      ))}
    </View>
  );
}

export function PeopleIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.head, styles.headLeft, { borderColor: color }]} />
      <View style={[styles.headSmall, { borderColor: color }]} />
      <View style={[styles.shoulder, styles.shoulderLeft, { borderColor: color }]} />
      <View style={[styles.shoulderSmall, { borderColor: color }]} />
    </View>
  );
}

export function PersonIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.personHead, { borderColor: color }]} />
      <View style={[styles.personBody, { borderColor: color }]} />
    </View>
  );
}

export function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.search}>
      <View style={[styles.searchRing, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
  },
  plusBar: {
    position: "absolute",
    borderRadius: 1,
  },
  plusAcross: {
    width: 16,
    height: 2,
    top: 11,
    left: 4,
  },
  plusDown: {
    width: 2,
    height: 16,
    left: 11,
    top: 4,
  },
  list: {
    width: 24,
    height: 24,
    justifyContent: "center",
    gap: 4,
    paddingLeft: 3,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  rule: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  head: {
    position: "absolute",
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.6,
  },
  headLeft: {
    left: 2,
  },
  headSmall: {
    position: "absolute",
    top: 3,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.6,
  },
  shoulder: {
    position: "absolute",
    bottom: 2,
    width: 13,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
  shoulderLeft: {
    left: 0,
  },
  shoulderSmall: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 9,
    height: 6,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
  personHead: {
    position: "absolute",
    top: 1,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.6,
  },
  personBody: {
    position: "absolute",
    bottom: 2,
    left: 4,
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
  search: {
    width: 16,
    height: 16,
  },
  searchRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.6,
  },
  searchHandle: {
    position: "absolute",
    width: 6,
    height: 1.6,
    borderRadius: 1,
    bottom: 1,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
});
