import React from "react";
import { View, StyleSheet, ScrollView, ImageBackground } from "react-native";
import { Card, Title, Button, Text, Avatar } from "react-native-paper";
import { router } from "expo-router";

// Przykładowe dane użytkownika (później do zastąpienia danymi z API)
const USER_DATA = {
	firstName: "Jan",
	lastName: "Kowalski",
	email: "jan.kowalski@example.com",
	group: "Grupa A (U-8)",
	joinDate: "01.01.2024",
};

export default function ProfileScreen() {
	const handleLogout = () => {
		// Tutaj dodamy później logikę wylogowania
		router.replace("/auth/login");
	};

	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<ScrollView style={styles.container}>
					<View style={styles.header}>
						<Avatar.Text
							size={80}
							label={`${USER_DATA.firstName[0]}${USER_DATA.lastName[0]}`}
							style={styles.avatar}
						/>
						<Title style={styles.name}>
							{USER_DATA.firstName} {USER_DATA.lastName}
						</Title>
					</View>

					<Card style={styles.card}>
						<Card.Content>
							<View style={styles.infoRow}>
								<Text style={styles.label}>Email:</Text>
								<Text style={styles.value}>
									{USER_DATA.email}
								</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.label}>Grupa:</Text>
								<Text style={styles.value}>
									{USER_DATA.group}
								</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.label}>
									Data dołączenia:
								</Text>
								<Text style={styles.value}>
									{USER_DATA.joinDate}
								</Text>
							</View>
						</Card.Content>
					</Card>

					<Button
						mode="contained"
						onPress={handleLogout}
						style={styles.logoutButton}
					>
						Wyloguj się
					</Button>
				</ScrollView>
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
		backgroundColor: "rgba(255, 255, 255, 0.95)",
	},
	container: {
		flex: 1,
		padding: 16,
	},
	header: {
		alignItems: "center",
		marginVertical: 20,
	},
	avatar: {
		backgroundColor: "#1e3a8a",
		marginBottom: 10,
	},
	name: {
		fontSize: 24,
		color: "#1e3a8a",
	},
	card: {
		marginBottom: 20,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 8,
	},
	label: {
		fontWeight: "bold",
		color: "#4b5563",
	},
	value: {
		color: "#1e3a8a",
	},
	logoutButton: {
		marginTop: 20,
		backgroundColor: "#1e3a8a",
	},
});
