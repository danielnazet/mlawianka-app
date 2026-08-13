import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../css/colors";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: COLORS.primary,
				tabBarInactiveTintColor: COLORS.textLight,
				headerStyle: {
					backgroundColor: COLORS.primary,
				},
				headerTintColor: COLORS.white,
				tabBarStyle: {
					backgroundColor: COLORS.white,
					borderTopWidth: 1,
					borderTopColor: COLORS.border,
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
	);
}
