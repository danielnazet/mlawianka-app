import React from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { AuthProvider } from "../contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AuthProvider>
				<PaperProvider>
					<Stack screenOptions={{ headerShown: false }} />
				</PaperProvider>
			</AuthProvider>
		</GestureHandlerRootView>
	);
}
