import React from "react";
import { Stack } from "expo-router";

export default function AdminLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="manage_coaches" options={{ headerShown: false }} />
			<Stack.Screen name="manage_members" options={{ headerShown: false }} />
			<Stack.Screen name="manage_teams" options={{ headerShown: false }} />
		</Stack>
	);
}
