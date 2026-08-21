import React from "react";
import { Tabs } from "expo-router";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { View, Image, StyleSheet, Text } from "react-native";
import { ClubTabBar } from "../../components/ClubTabBar";
import { LinearGradient } from "expo-linear-gradient";
import { useNotifications } from "../../contexts/NotificationContext";
import { FONTS } from "../../css/fonts";

function HeaderBackground() {
	return (
		<View style={StyleSheet.absoluteFill}>
			<LinearGradient
				colors={[
					COLORS.primaryDark,
					COLORS.primary,
				]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={StyleSheet.absoluteFill}
			/>

			{/* Delikatne rozświetlenie na środku */}
			<LinearGradient
				pointerEvents="none"
				colors={[
					"transparent",
					"rgba(255,255,255,0.07)",
					"transparent",
				]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={StyleSheet.absoluteFill}
			/>

			<View style={styles.headerBottomLine} />
		</View>
	);
}

function HeaderTitle() {
	return (
		<View style={styles.headerTitleContainer}>
			<Text style={styles.headerTitle}>
				GKS Strzegowo
			</Text>
			<Text style={styles.headerSubtitle}>
				APLIKACJA KLUBOWA
			</Text>
		</View>
	);
}

function HeaderLogo() {
	return (
		<View style={styles.logoOuterContainer}>
			<View style={styles.logoContainer}>
				<Image
					source={require("../assets/logo_gks.png")}
					style={styles.logo}
				/>
			</View>
		</View>
	);
}

export default function TabLayout() {
	const { user, profile } = useAuth();
	const { unreadChatsCount, unreadAnnouncementsCount } = useNotifications();

	// Warunki dostępu
	const isLoggedIn = Boolean(user);
	const canManageBooking = isLoggedIn && (profile?.role === "admin" || profile?.role === "coach");

	return (
		<Tabs
			tabBar={(props) => <ClubTabBar {...props} />}
			screenOptions={{
				headerShown: true,
				headerTitle: () => <HeaderTitle />,
				headerTitleAlign: "center",
				headerLeft: () => <HeaderLogo />,
				headerRight: () => (
					<View style={styles.headerRightSpacer} />
				),
				headerBackground: () => <HeaderBackground />,
				headerStyle: {
					backgroundColor: "transparent",
				},
				headerTintColor: COLORS.white,
				headerShadowVisible: false,
				tabBarHideOnKeyboard: true,
				// Delikatna animacja zawartości ekranu (zgodnie z projektem użytkownika)
				animation: "fade",
				transitionSpec: {
					animation: "timing",
					config: {
						duration: 160,
					},
				},
				sceneStyle: {
					backgroundColor: COLORS.background,
				},
			}}
		>
			<Tabs.Screen
				name="news"
				options={{
					title: "Aktualności",
					tabBarBadge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined,
				}}
			/>

			<Tabs.Screen
				name="training"
				options={{
					title: "Terminarz",
				}}
			/>

			<Tabs.Screen
				name="booking"
				options={{
					title: "Grafik Orlika",
					href: canManageBooking ? undefined : null,
				}}
			/>

			<Tabs.Screen
				name="chat"
				options={{
					title: "Czat",
					href: isLoggedIn ? undefined : null,
					tabBarBadge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
				}}
			/>

			<Tabs.Screen
				name="profile"
				options={{
					title: "Profil",
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	headerTitleContainer: {
		alignItems: "center",
		justifyContent: "center",
		gap: 1,
	},
	headerTitle: {
		color: COLORS.white,
		fontFamily: FONTS.extraBold,
		fontSize: 18,
		lineHeight: 21,
		letterSpacing: 0.25,
	},
	headerSubtitle: {
		color: "rgba(255,255,255,0.72)",
		fontFamily: FONTS.bold,
		fontSize: 8.5,
		lineHeight: 11,
		letterSpacing: 1.25,
	},
	headerBottomLine: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: 1,
		backgroundColor: "rgba(239,246,255,0.28)",
	},
	logoOuterContainer: {
		width: 50,
		height: 44,
		marginLeft: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	logoContainer: {
		width: 39,
		height: 39,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
		borderColor: "rgba(255,255,255,0.65)",
		shadowColor: "#0F172A",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.22,
		shadowRadius: 4,
		elevation: 4,
	},
	logo: {
		width: 29,
		height: 29,
		resizeMode: "contain",
	},
	headerRightSpacer: {
		width: 50,
		height: 44,
		marginRight: 10,
	},
});
