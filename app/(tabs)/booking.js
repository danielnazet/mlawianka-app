import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Card, Title, Button, Text, Paragraph } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

export default function BookingScreen() {
	const { user } = useAuth();
	const [trainings, setTrainings] = useState([]);
	const [userBookings, setUserBookings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [actionLoadingId, setActionLoadingId] = useState(null);

	const fetchData = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		try {
			// Pobierz dostępne treningi
			const { data: trainingsData, error: trainingsError } = await supabase
				.from("trainings")
				.select("*")
				.order("id", { ascending: true });

			if (trainingsError) throw trainingsError;
			setTrainings(trainingsData || []);

			// Pobierz rezerwacje zalogowanego użytkownika
			const { data: bookingsData, error: bookingsError } = await supabase
				.from("bookings")
				.select("training_id")
				.eq("user_id", user.id);

			if (bookingsError) throw bookingsError;
			setUserBookings(bookingsData.map(b => b.training_id) || []);
		} catch (error) {
			console.error("Error fetching booking data:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [user]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	// Sprawdzenie, czy dany trening jest już zarezerwowany przez zalogowanego użytkownika
	const isBooked = (trainingId) => {
		return userBookings.includes(trainingId);
	};

	// Obsługa rezerwacji i jej odwoływania
	const handleBookingToggle = async (trainingId) => {
		if (!user) return;
		setActionLoadingId(trainingId);
		try {
			if (isBooked(trainingId)) {
				// Odwołaj rezerwację
				const { error } = await supabase
					.from("bookings")
					.delete()
					.eq("user_id", user.id)
					.eq("training_id", trainingId);

				if (error) throw error;
				setUserBookings(prev => prev.filter(id => id !== trainingId));
			} else {
				// Dodaj rezerwację
				const { error } = await supabase
					.from("bookings")
					.insert([
						{
							user_id: user.id,
							training_id: trainingId,
						}
					]);

				if (error) throw error;
				setUserBookings(prev => [...prev, trainingId]);
			}
		} catch (error) {
			console.error("Booking action error:", error);
		} finally {
			setActionLoadingId(null);
		}
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
						<Title style={styles.guestTitle}>Strefa Rezerwacji</Title>
						<Paragraph style={styles.guestDescription}>
							Rezerwowanie miejsc na treningi jest dostępne wyłącznie dla zalogowanych zawodników klubu Mławianka Mława.
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
				<Title style={styles.mainTitle}>Zapisy na treningi</Title>

				{trainings.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>Brak wolnych terminów treningowych.</Text>
					</View>
				) : (
					trainings.map((training) => {
						const booked = isBooked(training.id);
						const isActionPending = actionLoadingId === training.id;

						return (
							<Card key={training.id} style={styles.card}>
								<Card.Content>
									<Title style={styles.cardTitle}>{training.title}</Title>
									<Text style={styles.infoText}>{`Miejsce: ${training.location}`}</Text>
									<Text style={styles.infoText}>{`Termin: ${training.time}`}</Text>
									<Text style={styles.infoText}>{`Trener: ${training.coach}`}</Text>

									<Button
										mode={booked ? "outlined" : "contained"}
										onPress={() => handleBookingToggle(training.id)}
										style={[
											styles.button,
											booked ? styles.buttonBooked : styles.buttonUnbooked
										]}
										textColor={booked ? COLORS.error : COLORS.white}
										loading={isActionPending}
										disabled={isActionPending}
									>
										{booked ? "Odwołaj rezerwację" : "Zarezerwuj miejsce"}
									</Button>
								</Card.Content>
							</Card>
						);
					})
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
	cardTitle: {
		color: COLORS.textDark,
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 8,
	},
	infoText: {
		color: COLORS.textLight,
		fontSize: 14,
		marginVertical: 2,
	},
	button: {
		marginTop: 16,
		borderRadius: 8,
	},
	buttonUnbooked: {
		backgroundColor: COLORS.primary,
	},
	buttonBooked: {
		borderColor: COLORS.error,
		borderWidth: 1,
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
