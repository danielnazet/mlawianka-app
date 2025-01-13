import React, { useState } from "react";
import { View, StyleSheet, ScrollView, ImageBackground } from "react-native";
import { Card, Title, Button, Text } from "react-native-paper";

// Przykładowe dane treningów (do zastąpienia danymi z API)
const SAMPLE_TRAININGS = [
	{
		id: "1",
		title: "Trening Grupa A",
		date: "2024-03-21",
		time: "16:00",
		available: true,
	},
	// ... więcej przykładowych treningów
];

export default function BookingScreen() {
	// Stan przechowujący listę treningów i rezerwacji
	const [trainings, setTrainings] = useState(SAMPLE_TRAININGS);
	const [userBookings, setUserBookings] = useState([]);

	// Funkcja obsługująca rezerwację treningu
	const handleBooking = (trainingId) => {
		// Tutaj logika rezerwacji (do implementacji)
		console.log(`Zarezerwowano trening: ${trainingId}`);
	};

	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<ScrollView style={styles.container}>
					{/* Sekcja dostępnych treningów */}
					<View style={styles.section}>
						<Title style={styles.sectionTitle}>
							Dostępne treningi
						</Title>
						{trainings.map((training) => (
							<Card key={training.id} style={styles.card}>
								<Card.Content>
									<Title>{training.title}</Title>
									<Text>{`Data: ${training.date}`}</Text>
									<Text>{`Godzina: ${training.time}`}</Text>
									<Button
										mode="contained"
										onPress={() =>
											handleBooking(training.id)
										}
										disabled={!training.available}
										style={styles.button}
									>
										{training.available
											? "Zarezerwuj"
											: "Brak miejsc"}
									</Button>
								</Card.Content>
							</Card>
						))}
					</View>
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
	},
	section: {
		padding: 16,
	},
	sectionTitle: {
		marginBottom: 16,
		color: "#1e3a8a",
		textAlign: "center",
	},
	card: {
		marginBottom: 16,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	button: {
		marginTop: 8,
		backgroundColor: "#1e3a8a",
	},
});
