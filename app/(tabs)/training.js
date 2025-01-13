import React, { useState } from "react";
import { View, StyleSheet, ScrollView, ImageBackground } from "react-native";
import { Card, Title, Paragraph, Text } from "react-native-paper";

// Przykładowe dane treningów
const SAMPLE_TRAININGS = [
	{
		id: "1",
		title: "Trening Grupa A (U-8)",
		description: "Trening techniki i koordynacji",
		coach: "Adam Kowalski",
		time: "Poniedziałek 16:00-17:30",
		location: "Boisko główne",
	},
	{
		id: "2",
		title: "Trening Grupa B (U-10)",
		description: "Trening taktyczny",
		coach: "Marek Nowak",
		time: "Wtorek 16:00-17:30",
		location: "Boisko treningowe",
	},
	// Możesz dodać więcej przykładowych treningów
];

export default function TrainingScreen() {
	const [trainings] = useState(SAMPLE_TRAININGS);

	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<ScrollView style={styles.container}>
					<Title style={styles.mainTitle}>
						Harmonogram treningów
					</Title>
					{trainings.map((training) => (
						<Card key={training.id} style={styles.card}>
							<Card.Content>
								<Title style={styles.title}>
									{training.title}
								</Title>
								<Paragraph style={styles.description}>
									{training.description}
								</Paragraph>
								<Text style={styles.info}>
									Trener: {training.coach}
								</Text>
								<Text style={styles.info}>
									Termin: {training.time}
								</Text>
								<Text style={styles.info}>
									Miejsce: {training.location}
								</Text>
							</Card.Content>
						</Card>
					))}
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
	mainTitle: {
		textAlign: "center",
		marginBottom: 20,
		color: "#1e3a8a",
		fontSize: 24,
	},
	card: {
		marginBottom: 16,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	title: {
		color: "#1e3a8a",
		fontSize: 18,
	},
	description: {
		marginVertical: 8,
		color: "#4b5563",
	},
	info: {
		marginVertical: 4,
		color: "#374151",
	},
});
