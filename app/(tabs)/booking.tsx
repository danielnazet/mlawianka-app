import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground, TouchableOpacity, Alert } from "react-native";
import { Card, Title, Button, Text, Paragraph, Portal, Dialog, TextInput, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

import { Training, OrlikBooking } from "../../types";

export default function BookingScreen() {
	const { user, profile } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("trainings");
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [userBookings, setUserBookings] = useState<number[]>([]);
	const [orlikBookings, setOrlikBookings] = useState<OrlikBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

	// Stan formularza rezerwacji Orlika
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editOrlikBookingId, setEditOrlikBookingId] = useState<number | null>(null);
	const [bookingDate, setBookingDate] = useState(""); // YYYY-MM-DD
	const [startTime, setStartTime] = useState(""); // HH:MM
	const [endTime, setEndTime] = useState(""); // HH:MM
	const [bookingDesc, setBookingDesc] = useState("");
	const [bookingError, setBookingError] = useState("");
	const [bookingLoading, setBookingLoading] = useState(false);

	const isCoachOrAdmin = profile?.role === "admin" || profile?.role === "coach";

	const fetchTrainings = async (userTeamId: number | null) => {
		try {
			let query = supabase.from("trainings").select("*");
			if (!isCoachOrAdmin && userTeamId) {
				query = query.or(`team_id.is.null,team_id.eq.${userTeamId}`);
			} else if (!isCoachOrAdmin) {
				query = query.is("team_id", null);
			}

			const { data: trainingsData, error: trainingsError } = await query.order("id", { ascending: true });

			if (trainingsError) throw trainingsError;
			setTrainings(trainingsData || []);

			if (user) {
				const { data: bookingsData, error: bookingsError } = await supabase
					.from("bookings")
					.select("training_id")
					.eq("user_id", user.id);

				if (bookingsError) throw bookingsError;
				setUserBookings(bookingsData.map((b) => b.training_id) || []);
			}
		} catch (error) {
			console.error("Error fetching training bookings:", error);
		}
	};

	const fetchOrlikBookings = async () => {
		try {
			const { data, error } = await supabase
				.from("orlik_bookings")
				.select("*, profile:profiles!orlik_bookings_booked_by_fkey(first_name, last_name)")
				.order("booking_date", { ascending: true })
				.order("start_time", { ascending: true });

			if (error) throw error;
			setOrlikBookings(data || []);
		} catch (error) {
			console.error("Error fetching Orlik bookings:", error);
		}
	};

	const fetchData = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		try {
			let userTeamId = profile?.team_id || null;

			if (profile && profile.role === "parent") {
				const { data: relations } = await supabase
					.from("parent_children")
					.select("child_id")
					.eq("parent_id", profile.id);

				if (relations && relations.length > 0) {
					const childId = relations[0].child_id;
					const { data: childProfile } = await supabase
						.from("profiles")
						.select("team_id")
						.eq("id", childId)
						.single();
					if (childProfile?.team_id) {
						userTeamId = childProfile.team_id;
					}
				}
			}

			await fetchTrainings(userTeamId);
			await fetchOrlikBookings();
		} catch (err) {
			console.error("Error fetching data:", err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [user, profile]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	const isBooked = (trainingId: number) => {
		return userBookings.includes(trainingId);
	};

	const handleBookingToggle = async (trainingId: number) => {
		if (!user) return;
		setActionLoadingId(trainingId);
		try {
			if (isBooked(trainingId)) {
				const { error } = await supabase
					.from("bookings")
					.delete()
					.eq("user_id", user.id)
					.eq("training_id", trainingId);

				if (error) throw error;
				setUserBookings((prev) => prev.filter((id) => id !== trainingId));
			} else {
				const { error } = await supabase.from("bookings").insert([
					{
						user_id: user.id,
						training_id: trainingId,
					},
				]);

				if (error) throw error;
				setUserBookings((prev) => [...prev, trainingId]);
			}
		} catch (error) {
			console.error("Error toggling training booking:", error);
		} finally {
			setActionLoadingId(null);
		}
	};

	const openOrlikDialog = () => {
		setEditOrlikBookingId(null);
		setBookingDate("");
		setStartTime("");
		setEndTime("");
		setBookingDesc("");
		setBookingError("");
		setDialogVisible(true);
	};

	const openEditOrlikDialog = (ob: OrlikBooking) => {
		setEditOrlikBookingId(ob.id);
		setBookingDate(ob.booking_date);
		setStartTime(ob.start_time);
		setEndTime(ob.end_time);
		setBookingDesc(ob.description || "");
		setBookingError("");
		setDialogVisible(true);
	};

	const handleAddOrlikBooking = async () => {
		if (!bookingDate || !startTime || !endTime) {
			setBookingError("Proszę wypełnić wszystkie pola.");
			return;
		}

		if (!user) {
			setBookingError("Użytkownik nie jest zalogowany.");
			return;
		}

		setBookingLoading(true);
		setBookingError("");

		try {
			if (editOrlikBookingId !== null) {
				const { error } = await supabase
					.from("orlik_bookings")
					.update({
						booking_date: bookingDate,
						start_time: startTime,
						end_time: endTime,
						description: bookingDesc,
					})
					.eq("id", editOrlikBookingId);

				if (error) throw error;
			} else {
				const { error } = await supabase.from("orlik_bookings").insert([
					{
						booking_date: bookingDate,
						start_time: startTime,
						end_time: endTime,
						description: bookingDesc,
						booked_by: user.id,
					},
				]);

				if (error) throw error;
			}

			setDialogVisible(false);
			fetchOrlikBookings();
		} catch (err: any) {
			setBookingError(err.message || "Błąd zapisu rezerwacji");
		} finally {
			setBookingLoading(false);
		}
	};

	const handleCancelOrlikBooking = async (bookingId: number) => {
		Alert.alert(
			"Anulowanie rezerwacji",
			"Czy na pewno chcesz anulować tę rezerwację boiska Orlik?",
			[
				{ text: "Wróć", style: "cancel" },
				{
					text: "Anuluj rezerwację",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase.from("orlik_bookings").delete().eq("id", bookingId);
							if (error) throw error;
							fetchOrlikBookings();
						} catch (error) {
							console.error("Error cancelling Orlik booking:", error);
							Alert.alert("Błąd", "Nie udało się anulować rezerwacji");
						}
					}
				}
			]
		);
	};

	const formatOrlikDate = (dateStr: string) => {
		if (!dateStr) return "";
		const [year, month, day] = dateStr.split("-");
		return `${day}.${month}.${year}`;
	};

	const formatOrlikTime = (timeStr: string) => {
		if (!timeStr) return "";
		return timeStr.substring(0, 5);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	return (
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			{!user ? (
				<View style={styles.guestContainer}>
					<Card style={styles.guestCard}>
						<Card.Content style={styles.guestContent}>
							<Title style={styles.guestTitle}>Rezerwacje Orlika</Title>
							<Paragraph style={styles.guestDescription}>
								Rejestracja na treningi oraz podgląd rezerwacji Orlika są dostępne wyłącznie dla zalogowanych członków klubu GKS Strzegowo.
							</Paragraph>
							<Button
								mode="contained"
								onPress={() => router.push("/auth/login")}
								style={styles.guestButton}
								labelStyle={styles.guestButtonLabel}
							>
								Zaloguj się
							</Button>
						</Card.Content>
					</Card>
				</View>
			) : (
				<>
					<View style={styles.tabContainer}>
						<Button
							mode={activeTab === "trainings" ? "contained" : "outlined"}
							onPress={() => setActiveTab("trainings")}
							style={styles.tabButton}
							textColor={activeTab === "trainings" ? COLORS.white : COLORS.primary}
						>
							Zapisy na treningi
						</Button>
						<Button
							mode={activeTab === "orlik" ? "contained" : "outlined"}
							onPress={() => setActiveTab("orlik")}
							style={styles.tabButton}
							textColor={activeTab === "orlik" ? COLORS.white : COLORS.primary}
						>
							Rezerwacja Orlika
						</Button>
					</View>

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
						{activeTab === "trainings" ? (
							<View>
								<Title style={styles.mainTitle}>Zapisy na treningi</Title>
								{trainings.length === 0 ? (
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>Brak wolnych terminów treningowych dla Twojego zespołu.</Text>
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
														style={[styles.button, booked ? styles.buttonBooked : styles.buttonUnbooked]}
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
							</View>
						) : (
							<View>
								<View style={styles.orlikHeader}>
									<Title style={styles.mainTitle}>Grafik Orlika</Title>
									{isCoachOrAdmin && (
										<Button
											mode="contained"
											icon="plus"
											onPress={openOrlikDialog}
											style={styles.orlikAddBtn}
											labelStyle={styles.orlikAddBtnLabel}
										>
											Zarezerwuj
										</Button>
									)}
								</View>

								{orlikBookings.length === 0 ? (
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>Brak zarezerwowanych terminów.</Text>
									</View>
								) : (
									orlikBookings.map((ob) => {
										let swipeableRef: Swipeable | null = null;
										const canManage = profile?.role === "admin" || (profile?.role === "coach" && ob.booked_by === user.id);

										const renderRightActions = () => (
											<View style={styles.swipeActionsContainer}>
												<TouchableOpacity
													style={[styles.swipeActionBtn, styles.editActionBtn]}
													onPress={() => {
														swipeableRef?.close();
														openEditOrlikDialog(ob);
													}}
												>
													<MaterialIcons name="edit" size={22} color={COLORS.white} />
													<Text style={styles.swipeActionText}>Edytuj</Text>
												</TouchableOpacity>
												<TouchableOpacity
													style={[styles.swipeActionBtn, styles.deleteActionBtn]}
													onPress={() => {
														swipeableRef?.close();
														handleCancelOrlikBooking(ob.id);
													}}
												>
													<MaterialIcons name="delete" size={22} color={COLORS.white} />
													<Text style={styles.swipeActionText}>Usuń</Text>
												</TouchableOpacity>
											</View>
										);

										const cardContent = (
											<Card style={[styles.card, styles.orlikCard]}>
												<Card.Content>
													<View style={styles.cardHeader}>
														<Title style={styles.orlikTimeText}>
															{formatOrlikTime(ob.start_time)} - {formatOrlikTime(ob.end_time)}
														</Title>
														<Text style={styles.orlikDateBadge}>{formatOrlikDate(ob.booking_date)}</Text>
													</View>
													{ob.description ? (
														<Paragraph style={styles.orlikDesc}>{ob.description}</Paragraph>
													) : null}
													<Text style={styles.orlikBookedBy}>
														Rezerwujący: {ob.profile ? `${ob.profile.first_name} ${ob.profile.last_name}` : "Trener"}
													</Text>
												</Card.Content>
											</Card>
										);

										if (canManage) {
											return (
												<View key={ob.id} style={{ marginBottom: 16 }}>
													<Swipeable
														ref={ref => { swipeableRef = ref; }}
														renderRightActions={renderRightActions}
														friction={2}
														rightThreshold={40}
													>
														<View style={{ marginBottom: -16, overflow: "hidden" }}>
															{cardContent}
														</View>
													</Swipeable>
												</View>
											);
										}
										return <View key={ob.id}>{cardContent}</View>;
									})
								)}
							</View>
						)}
					</ScrollView>
				</>
			)}

			<Portal>
				<Dialog visible={dialogVisible} onDismiss={() => !bookingLoading && setDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>
						{editOrlikBookingId !== null ? "Edytuj rezerwację Orlika" : "Rezerwacja boiska Orlik"}
					</Dialog.Title>
					<Dialog.Content>
						<TextInput
							label="Data rezerwacji (np. 2026-08-20)"
							value={bookingDate}
							onChangeText={setBookingDate}
							mode="outlined"
							style={styles.formInput}
							activeOutlineColor={COLORS.primary}
							placeholder="YYYY-MM-DD"
						/>
						<TextInput
							label="Godzina rozpoczęcia (np. 17:00)"
							value={startTime}
							onChangeText={setStartTime}
							mode="outlined"
							style={styles.formInput}
							activeOutlineColor={COLORS.primary}
							placeholder="HH:MM"
						/>
						<TextInput
							label="Godzina zakończenia (np. 18:30)"
							value={endTime}
							onChangeText={setEndTime}
							mode="outlined"
							style={styles.formInput}
							activeOutlineColor={COLORS.primary}
							placeholder="HH:MM"
						/>
						<TextInput
							label="Cel / Opis rezerwacji"
							value={bookingDesc}
							onChangeText={setBookingDesc}
							mode="outlined"
							style={styles.formInput}
							activeOutlineColor={COLORS.primary}
						/>

						{bookingError ? <Text style={styles.formError}>{bookingError}</Text> : null}
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setDialogVisible(false)} disabled={bookingLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleAddOrlikBooking} loading={bookingLoading} disabled={bookingLoading} labelStyle={styles.dialogBtnLabel}>
							Zapisz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	backgroundImageStyle: {
		opacity: 0.08,
		resizeMode: "cover",
		width: "100%",
		height: "100%",
		position: "absolute",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
	},
	tabContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 16,
	},
	tabButton: {
		flex: 1,
		marginHorizontal: 4,
		borderRadius: 8,
	},
	scrollContainer: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	mainTitle: {
		textAlign: "center",
		marginBottom: 20,
		color: COLORS.primary,
		fontSize: 22,
		fontFamily: FONTS.bold,
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
		overflow: "hidden",
	},
	orlikCard: {
		borderLeftWidth: 4,
		borderLeftColor: COLORS.primary,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	cardTitle: {
		color: COLORS.textDark,
		fontSize: 18,
		fontFamily: FONTS.bold,
		marginBottom: 8,
	},
	infoText: {
		color: COLORS.textLight,
		fontSize: 14,
		marginVertical: 2,
		fontFamily: FONTS.regular,
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
	orlikHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	orlikAddBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 8,
	},
	orlikAddBtnLabel: {
		color: COLORS.white,
		fontFamily: FONTS.bold,
	},
	orlikTimeText: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},
	orlikDateBadge: {
		fontSize: 11,
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		fontFamily: FONTS.semiBold,
	},
	orlikDesc: {
		color: COLORS.textDark,
		fontSize: 14,
		marginBottom: 6,
		fontFamily: FONTS.regular,
	},
	orlikBookedBy: {
		color: COLORS.textLight,
		fontSize: 12,
		fontFamily: FONTS.regular,
	},
	emptyContainer: {
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 15,
		textAlign: "center",
		fontFamily: FONTS.regular,
	},
	guestContainer: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
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
		fontFamily: FONTS.bold,
		fontSize: 20,
		marginBottom: 8,
	},
	guestDescription: {
		textAlign: "center",
		color: COLORS.textLight,
		marginBottom: 20,
		fontSize: 14,
		lineHeight: 20,
		fontFamily: FONTS.regular,
	},
	guestButton: {
		backgroundColor: COLORS.primary,
		width: "100%",
		borderRadius: 8,
	},
	guestButtonLabel: {
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},
	formInput: {
		marginBottom: 8,
		backgroundColor: COLORS.white,
	},
	formError: {
		color: COLORS.error,
		marginTop: 8,
		textAlign: "center",
		fontSize: 13,
		fontFamily: FONTS.bold,
	},
	dialog: {
		borderRadius: 22,
		backgroundColor: COLORS.white,
	},
	dialogTitle: {
		fontFamily: FONTS.extraBold,
		color: COLORS.primary,
		fontSize: 20,
	},
	dialogBtnLabel: {
		fontFamily: FONTS.bold,
	},
	swipeActionsContainer: {
		flexDirection: "row",
		width: 140,
		height: "100%",
		overflow: "hidden",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionBtn: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		height: "100%",
	},
	editActionBtn: {
		backgroundColor: COLORS.primary,
	},
	deleteActionBtn: {
		backgroundColor: "#ef4444",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionText: {
		color: COLORS.white,
		fontSize: 11,
		fontFamily: FONTS.bold,
		marginTop: 4,
	},
});
