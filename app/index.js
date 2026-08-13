import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#1e3a8a" />
			</View>
		);
	}

	if (user) {
		return <Redirect href="/news" />;
	}

	return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "white",
	},
});
