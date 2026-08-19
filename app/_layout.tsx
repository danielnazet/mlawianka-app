import React from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { AuthProvider } from "../contexts/AuthContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import { ActivityIndicator, View } from "react-native";

import { useEffect } from "react";
import { useSegments, useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

function NavigationGuard({ children }: { children: React.ReactNode }) {
	const { user, profile, loading } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;

		const inAuthGroup = (segments as string[]).includes("auth");
		const inCompleteProfileScreen = (segments as string[]).includes("complete_profile");
		const userRole = (profile?.role as string) || "";

		if (user) {
			if (userRole && userRole !== "guest") {
				if (inAuthGroup) {
					router.replace("/news");
				}
			} else if (profile !== null) {
				if (!inCompleteProfileScreen) {
					router.replace("/auth/complete_profile");
				}
			}
		}
	}, [user, profile, loading, segments]);

	return <>{children}</>;
}

export default function Layout() {
	const [fontsLoaded] = useFonts({
		Outfit_400Regular,
		Outfit_500Medium,
		Outfit_600SemiBold,
		Outfit_700Bold,
		Outfit_800ExtraBold,
	});

	if (!fontsLoaded) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
				<ActivityIndicator size="large" color="#1d4ed8" />
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AuthProvider>
				<NavigationGuard>
					<NotificationProvider>
						<PaperProvider>
							<Stack screenOptions={{ headerShown: false }} />
						</PaperProvider>
					</NotificationProvider>
				</NavigationGuard>
			</AuthProvider>
		</GestureHandlerRootView>
	);
}
