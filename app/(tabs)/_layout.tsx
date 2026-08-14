import React, { useRef, useEffect } from "react";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { View, StyleSheet, TouchableOpacity, Animated, Image } from "react-native";

const AnimatedTabButton = (props: any) => {
	const { accessibilityState, children, onPress } = props;
	const focused = accessibilityState?.selected;

	// Bąbelek startuje ze skali 0.4 i opacity 0, gdy nieaktywny
	const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.4)).current;
	const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

	useEffect(() => {
		if (focused) {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 5,
					tension: 40,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 180,
					useNativeDriver: true,
				})
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 0.4,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 150,
					useNativeDriver: true,
				})
			]).start();
		}
	}, [focused]);

	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={onPress}
			style={styles.tabButtonWrapper}
		>
			<View style={styles.tabButtonContent}>
				{/* Animowane tło bąbelkowe rosnące od środka na zewnątrz */}
				<Animated.View
					style={[
						styles.tabButtonBg,
						{
							transform: [{ scale: scaleAnim }],
							opacity: opacityAnim,
						}
					]}
				/>
				{/* Zawartość (ikona + tekst) */}
				<View style={styles.tabButtonForeground}>
					{children}
				</View>
			</View>
		</TouchableOpacity>
	);
};

export default function TabLayout() {
	const { user, profile } = useAuth();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: COLORS.primary,
				tabBarInactiveTintColor: COLORS.textLight,
				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: "700",
					marginTop: 1,
				},
				headerTitle: "GKS Strzegowo",
				headerTitleAlign: "center",
				headerTitleStyle: {
					fontWeight: "bold",
					fontSize: 19,
					letterSpacing: 0.5,
				},
				headerLeft: () => (
					<View style={{
						width: 40,
						height: 40,
						borderRadius: 20,
						backgroundColor: COLORS.white,
						justifyContent: "center",
						alignItems: "center",
						marginLeft: 16,
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 2 },
						shadowOpacity: 0.15,
						shadowRadius: 3,
						elevation: 3,
					}}>
						<Image
							source={require("../assets/logo_gks.png")}
							style={{ width: 30, height: 30, resizeMode: "contain" }}
						/>
					</View>
				),
				headerStyle: {
					backgroundColor: COLORS.primary,
				},
				headerTintColor: COLORS.white,
				tabBarStyle: {
					backgroundColor: COLORS.white,
					borderTopWidth: 0,
					borderRadius: 24,
					marginHorizontal: 16,
					marginBottom: 16,
					height: 68,
					// Cień pod tab-barem (iOS style)
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 6 },
					shadowOpacity: 0.08,
					shadowRadius: 8,
					elevation: 4,
					paddingBottom: 0,
					paddingTop: 0,
				},
				tabBarButton: (props) => <AnimatedTabButton {...props} />,
			}}
		>
			<Tabs.Screen
				name="news"
				options={{
					title: "Wiadomości",
					tabBarIcon: ({ color }) => (
						<MaterialIcons
							name="newspaper"
							size={26}
							color={color}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="training"
				options={{
					title: "Terminarz",
					tabBarIcon: ({ color }) => (
						<MaterialIcons
							name="sports-soccer"
							size={26}
							color={color}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="booking"
				options={{
					title: "Orlik",
					href: (user && profile?.role !== "parent") ? undefined : null, // Ukryj dla gości i rodziców
					tabBarIcon: ({ color }) => (
						<MaterialIcons
							name="event"
							size={26}
							color={color}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="chat"
				options={{
					title: "Czat",
					href: user ? undefined : null, // Ukryj tabę jeśli użytkownik jest niezalogowany
					tabBarIcon: ({ color }) => (
						<MaterialIcons
							name="chat"
							size={26}
							color={color}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="profile"
				options={{
					title: "Profil",
					tabBarIcon: ({ color }) => (
						<MaterialIcons
							name="person"
							size={26}
							color={color}
						/>
					),
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabButtonWrapper: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	tabButtonContent: {
		width: "88%",
		height: 52, // Idealna wysokość podświetlenia wewnątrz paska
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	tabButtonBg: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		borderRadius: 99,
		backgroundColor: "#EBF3FF", // Delikatny niebieski bąbelek Revolut
		borderWidth: 1.5,
		borderColor: "#D0E3FF", // Lekka niebieska otoczka
	},
	tabButtonForeground: {
		alignItems: "center",
		justifyContent: "center",
	},
});
