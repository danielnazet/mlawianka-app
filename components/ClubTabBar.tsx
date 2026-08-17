import React, { ComponentProps, useEffect, useState } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { COLORS } from "../css/colors";

type IconName = ComponentProps<typeof Ionicons>["name"];

type TabDefinition = {
  label: string;
  activeIcon: IconName;
  inactiveIcon: IconName;
};

const TAB_CONFIG: Record<string, TabDefinition> = {
  news: {
    label: "Aktualności",
    activeIcon: "newspaper",
    inactiveIcon: "newspaper-outline",
  },
  training: {
    label: "Terminarz",
    activeIcon: "calendar",
    inactiveIcon: "calendar-outline",
  },
  booking: {
    label: "Orlik",
    activeIcon: "football",
    inactiveIcon: "football-outline",
  },
  chat: {
    label: "Czat",
    activeIcon: "chatbubbles",
    inactiveIcon: "chatbubbles-outline",
  },
  profile: {
    label: "Profil",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
};

const INDICATOR_SPRING = {
  damping: 20,
  stiffness: 220,
  mass: 0.75,
  overshootClamping: false,
};

const ICON_SPRING = {
  damping: 14,
  stiffness: 260,
  mass: 0.65,
};

type TabButtonProps = {
  label: string;
  activeIcon: IconName;
  inactiveIcon: IconName;
  focused: boolean;
  badge?: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabButton({
  label,
  activeIcon,
  inactiveIcon,
  focused,
  badge,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const iconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.72, {
      duration: 150,
    }),
    transform: [
      {
        translateY: withSpring(focused ? -1 : 0, ICON_SPRING),
      },
      {
        scale: withSpring(focused ? 1.1 : 1, ICON_SPRING),
      },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.7, {
      duration: 150,
    }),
    transform: [
      {
        translateY: withSpring(focused ? -1 : 0, ICON_SPRING),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={5}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <Ionicons
          name={focused ? activeIcon : inactiveIcon}
          size={23}
          color={focused ? COLORS.primary : "#64748b"}
        />

        {badge ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>
              {badge}
            </Animated.Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.label,
          focused && styles.focusedLabel,
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function ClubTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const visibleRoutes = state.routes.filter((route) => {
    const config = TAB_CONFIG[route.name];
    if (!config) return false;

    // Sprawdzamy czy zakładka ma być ukryta (np. role-based dynamic href: null)
    const options = (descriptors[route.key]?.options ?? {}) as any;
    if (options.href === null) {
      return false;
    }
    if (typeof options.tabBarButton === "function") {
      try {
        const button = options.tabBarButton();
        if (button === null) {
          return false;
        }
      } catch (e) {
        // Ignorujemy błędy wywołania
      }
    }
    return true;
  });

  const currentRouteKey = state.routes[state.index]?.key;

  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex(
      (route) => route.key === currentRouteKey,
    ),
  );

  const itemWidth =
    visibleRoutes.length > 0
      ? barWidth / visibleRoutes.length
      : 0;

  useEffect(() => {
    if (itemWidth === 0) {
      return;
    }

    indicatorX.value = withSpring(
      activeIndex * itemWidth,
      INDICATOR_SPRING,
    );
  }, [activeIndex, itemWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: indicatorX.value,
      },
    ],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.safeAreaContainer,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.outerShadow}>
        <View style={styles.tabBar}>
          <View style={styles.tabsRow} onLayout={handleLayout}>
            {itemWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeIndicator,
                  {
                    width: Math.max(itemWidth - 5, 0),
                  },
                  indicatorStyle,
                ]}
              />
            ) : null}

            {visibleRoutes.map((route) => {
              const routeIndex = state.routes.findIndex(
                (item) => item.key === route.key,
              );

              const focused = state.index === routeIndex;
              const config = TAB_CONFIG[route.name];
              const options =
                descriptors[route.key]?.options ?? {};

              const badgeValue = options.tabBarBadge;

              const badge =
                typeof badgeValue === "number" ||
                typeof badgeValue === "string"
                  ? String(badgeValue)
                  : undefined;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  void Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Light,
                  );

                  navigation.navigate(
                    route.name,
                    route.params,
                  );
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              return (
                <TabButton
                  key={route.key}
                  label={config.label}
                  activeIcon={config.activeIcon}
                  inactiveIcon={config.inactiveIcon}
                  focused={focused}
                  badge={badge}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    backgroundColor: "transparent",
    paddingTop: 7,
  },

  outerShadow: {
    marginHorizontal: 8,
    borderRadius: 34,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: Platform.OS === "ios" ? 0.22 : 0,
    shadowRadius: 12,

    elevation: 12,
  },

  tabBar: {
    height: 64,
    padding: 3,

    borderRadius: 34,
    borderWidth: 1.4,
    borderColor: "#E5E7EB",

    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },

  tabsRow: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },

  activeIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 2.5,

    borderRadius: 30,

    backgroundColor: "#E5E7EB",

    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  tabButton: {
    flex: 1,
    zIndex: 2,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 2,
    gap: 2,
  },

  iconWrapper: {
    height: 27,
    minWidth: 30,

    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    maxWidth: "100%",

    color: "#64748b",
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  focusedLabel: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  badge: {
    position: "absolute",
    top: -5,
    right: -8,

    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,

    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,

    backgroundColor: COLORS.error,

    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
  },
});
