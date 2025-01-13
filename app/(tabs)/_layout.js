import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ImageBackground, View, StyleSheet } from "react-native";

export default function TabLayout() {
	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<Tabs
					screenOptions={{
						tabBarActiveTintColor: "#1e3a8a",
						tabBarInactiveTintColor: "#6b7280",
						headerStyle: {
							backgroundColor: "#1e3a8a",
						},
						headerTintColor: "#fff",
						tabBarStyle: {
							backgroundColor: "rgba(255, 255, 255, 0.95)",
						},
					}}
				>
					<Tabs.Screen
						name="news"
						options={{
							title: "Aktualności",
							tabBarIcon: ({ color }) => (
								<MaterialIcons
									name="newspaper"
									size={24}
									color={color}
								/>
							),
						}}
					/>

					<Tabs.Screen
						name="training"
						options={{
							title: "Treningi",
							tabBarIcon: ({ color }) => (
								<MaterialIcons
									name="sports-soccer"
									size={24}
									color={color}
								/>
							),
						}}
					/>

					<Tabs.Screen
						name="booking"
						options={{
							title: "Rezerwacje",
							tabBarIcon: ({ color }) => (
								<MaterialIcons
									name="event"
									size={24}
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
									size={24}
									color={color}
								/>
							),
						}}
					/>
				</Tabs>
			</View>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	backgroundImage: {
		flex: 1,
		width: "100%",
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
});
