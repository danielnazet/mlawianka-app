import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Card, Title, Paragraph, Text, Button } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

export default function TrainingScreen() {
	const { user } = useAuth();
	const [trainings, setTrainings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchTrainings = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		try {
			const { data, error } = await supabase
				.from("trainings")
				.select("*")
				.order("id", { ascending: true });

			if (error) throw error;
			setTrainings(data || []);
		} catch (error) {
			console.error("Error fetching trainings:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchTrainings();
	}, [user]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchTrainings();
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	if (!user) {
		return (
			<View style={styles.guestContainer}>
				<Card style={styles.guestCard}>
					<Card.Content style={styles.guestContent}>
						<Title style={styles.guestTitle}>Strefa Zawodnika</Title>
						<Paragraph style={styles.guestDescription}>
							Harmonogram treningów jest dostępny wyłącznie dla zalogowanych zawodników klubu Mławianka Mława.
						</Paragraph>
						<Button
							mode="contained"
							onPress={() => router.push("/auth/login")}
							style={styles.guestButton}
							labelStyle={styles.guestButtonLabel}
						>
							Zaloguj się lub zarejestruj
						</Button>
					</Card.Content>
				</Card>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[COLORS.primary]}
					/>
				}
			>
				<Title style={styles.mainTitle}>Harmonogram treningów</Title>
				
				{trainings.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>Brak zaplanowanych treningów.</Text>
					</View>
				) : (
					trainings.map((training) => (
						<Card key={training.id} style={styles.card}>
							<Card.Content>
								<Title style={styles.title}>{training.title}</Title>
								<Paragraph style={styles.description}>
									{training.description}
								</Paragraph>
								<View style={styles.infoRow}>
									<Text style={styles.infoLabel}>Trener:</Text>
									<Text style={styles.infoValue}>{training.coach}</Text>
								</View>
								<View style={styles.infoRow}>
									<Text style={styles.infoLabel}>Termin:</Text>
									<Text style={styles.infoValue}>{training.time}</Text>
								</View>
								<View style={styles.infoRow}>
									<Text style={styles.infoLabel}>Miejsce:</Text>
									<Text style={styles.infoValue}>{training.location}</Text>
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
	},
	scrollContainer: {
		padding: 16,
	},
	mainTitle: {
		textAlign: "center",
		marginBottom: 20,
		color: COLORS.primary,
		fontSize: 22,
		fontWeight: "bold",
	},
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	title: {
		color: COLORS.primary,
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 6,
	},
	description: {
		marginBottom: 12,
		color: COLORS.textDark,
		fontSize: 14,
		lineHeight: 18,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 4,
		borderBottomWidth: 1,
		borderBottomColor: "#f3f4f6",
		paddingBottom: 4,
	},
	infoLabel: {
		fontWeight: "bold",
		color: COLORS.textLight,
		fontSize: 13,
	},
	infoValue: {
		color: COLORS.textDark,
		fontSize: 13,
		fontWeight: "500",
	},
	emptyContainer: {
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 15,
	},
	guestContainer: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
		backgroundColor: COLORS.background,
	},
	guestCard: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 16,
		elevation: 4,
	},
	guestContent: {
		alignItems: "center",
	},
	guestTitle: {
		color: COLORS.primary,
		fontWeight: "bold",
		fontSize: 20,
		marginBottom: 8,
	},
	guestDescription: {
		textAlign: "center",
		color: COLORS.textLight,
		marginBottom: 20,
		fontSize: 14,
		lineHeight: 20,
	},
	guestButton: {
		backgroundColor: COLORS.primary,
		width: "100%",
		borderRadius: 8,
	},
	guestButtonLabel: {
		fontWeight: "bold",
		color: COLORS.white,
	},
});
