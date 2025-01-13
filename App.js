import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import "react-native-url-polyfill/auto";
import RootNavigator from "./navigation/RootNavigator";

const theme = {
	...MD3LightTheme,
	colors: {
		...MD3LightTheme.colors,
		primary: "#1e3a8a",
		secondary: "#0ea5e9",
	},
};

export default function App() {
	return (
		<PaperProvider theme={theme}>
			<NavigationContainer>
				<RootNavigator />
				<StatusBar style="auto" />
			</NavigationContainer>
		</PaperProvider>
	);
}
