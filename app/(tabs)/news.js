import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ImageBackground } from "react-native";
import { Card, Title, Paragraph } from "react-native-paper";

// Przykładowe dane aktualności (w przyszłości do zastąpienia danymi z API)
const SAMPLE_NEWS = [
	{
		id: "1",
		title: "Zwycięstwo w lidze!",
		content: "Nasza drużyna wygrała ważny mecz...",
		date: "2024-03-20",
	},
	// ... więcej przykładowych aktualności
];

export default function NewsScreen() {
	// Stan przechowujący listę aktualności
	const [news, setNews] = useState(SAMPLE_NEWS);
	const [loading, setLoading] = useState(false);

	// Funkcja renderująca pojedynczy element aktualności
	const renderNewsItem = ({ item }) => (
		<Card style={styles.card}>
			<Card.Content>
				<Title>{item.title}</Title>
				<Paragraph>{item.content}</Paragraph>
				<Paragraph style={styles.date}>{item.date}</Paragraph>
			</Card.Content>
		</Card>
	);

	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<FlatList
					data={news}
					renderItem={renderNewsItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.list}
				/>
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
	list: {
		padding: 16,
	},
	card: {
		marginBottom: 16,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	date: {
		color: "#6b7280",
		fontSize: 12,
		marginTop: 8,
	},
});
