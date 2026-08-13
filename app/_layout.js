import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { AuthProvider } from "../contexts/AuthContext";

export default function Layout() {
	return (
		<AuthProvider>
			<PaperProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</PaperProvider>
		</AuthProvider>
	);
}
