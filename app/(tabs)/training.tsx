import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground } from "react-native";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog, TextInput, RadioButton, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

import { Team, Training, Match } from "../../types";

export default function TrainingScreen() {
	const { user, profile } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("trainings");
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [matches, setMatches] = useState<Match[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Stan dla formularza dodawania wydarzenia
	const [dialogVisible, setDialogVisible] = useState(false);
	const [eventType, setEventType] = useState<"training" | "match">("training");
	const [formTitle, setFormTitle] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formCoach, setFormCoach] = useState("");
	const [formTime, setFormTime] = useState("");
	const [formLocation, setFormLocation] = useState("");
	const [formMaxCapacity, setFormMaxCapacity] = useState("15");
	const [formTeamId, setFormTeamId] = useState("");
	const [formOpponent, setFormOpponent] = useState("");
	const [formDate, setFormDate] = useState(""); // np. "2026-08-20 17:00"
	const [formResult, setFormResult] = useState("");
	const [formError, setFormError] = useState("");
	const [actionLoading, setActionLoading] = useState(false);

	const isCoachOrAdmin = profile?.role === "admin" || profile?.role === "coach";

	const fetchTeams = async () => {
		try {
			const { data, error } = await supabase.from("teams").select("*").order("id", { ascending: true });
			if (error) throw error;
			setTeams(data || []);
		} catch (err) {
			console.error("Error fetching teams:", err);
		}
	};

	const fetchData = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		try {
			// Pobierz zespoły
			await fetchTeams();

			// Pobierz treningi
			let trainingQuery = supabase.from("trainings").select("*");
			// Pobierz mecze
			let matchQuery = supabase.from("matches").select("*");

			// Jeśli to zwykły użytkownik, filtruj po jego zespole
			if (!isCoachOrAdmin && profile) {
				let userTeamId = profile.team_id;
				// Jeśli to rodzic, znajdźmy najpierw jego dziecko i jego team_id
				if (profile.role === "parent") {
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

				if (userTeamId) {
					trainingQuery = trainingQuery.or(`team_id.is.null,team_id.eq.${userTeamId}`);
					matchQuery = matchQuery.eq("team_id", userTeamId);
				} else {
					trainingQuery = trainingQuery.is("team_id", null);
					matchQuery = matchQuery.eq("team_id", -1); // pusty wynik
				}
			}

			const { data: trainingsData, error: tError } = await trainingQuery.order("id", { ascending: true });
			const { data: matchesData, error: mError } = await matchQuery.order("match_date", { ascending: true });

			if (tError) throw tError;
			if (mError) throw mError;

			setTrainings(trainingsData || []);
			setMatches(matchesData || []);
		} catch (error) {
			console.error("Error fetching schedule data:", error);
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

	const openAddDialog = () => {
		setFormTitle("");
		setFormDescription("");
		setFormCoach(profile ? `${profile.first_name} ${profile.last_name}` : "");
		setFormTime("");
		setFormLocation("");
		setFormMaxCapacity("15");
		setFormTeamId(teams[0]?.id?.toString() || "");
		setFormOpponent("");
		setFormDate("");
		setFormResult("");
		setFormError("");
		setDialogVisible(true);
	};

	const handleAddEvent = async () => {
		if (!formTeamId) {
			setFormError("Proszę wybrać zespół.");
			return;
		}

		setActionLoading(true);
		setFormError("");

		try {
			if (eventType === "training") {
				if (!formTitle || !formTime || !formLocation) {
					throw new Error("Proszę wypełnić Tytuł, Termin oraz Miejsce");
				}

				const { error } = await supabase.from("trainings").insert([
					{
						title: formTitle,
						description: formDescription,
						coach: formCoach,
						time: formTime,
						location: formLocation,
						max_capacity: parseInt(formMaxCapacity) || 15,
						team_id: parseInt(formTeamId),
					},
				]);
				if (error) throw error;
			} else {
				if (!formOpponent || !formDate || !formLocation) {
					throw new Error("Proszę wypełnić Przeciwnika, Datę meczu oraz Miejsce");
				}

				const { error } = await supabase.from("matches").insert([
					{
						team_id: parseInt(formTeamId),
						opponent: formOpponent,
						match_date: new Date(formDate).toISOString(),
						location: formLocation,
						result: formResult || null,
					},
				]);
				if (error) throw error;
			}

			setDialogVisible(false);
			fetchData();
		} catch (err: any) {
			setFormError(err.message || "Wystąpił błąd zapisu");
			console.error(err);
		} finally {
			setActionLoading(false);
		}
	};

	const getTeamName = (teamId: number | null) => {
		if (!teamId) return "Wszystkie grupy";
		const team = teams.find((t) => t.id === teamId);
		return team ? team.name : `Grupa #${teamId}`;
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("pl-PL", {
			weekday: "long",
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
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
							<Title style={styles.guestTitle}>Harmonogram Klubu</Title>
							<Paragraph style={styles.guestDescription}>
								Harmonogram treningów oraz lista meczów są dostępne wyłącznie dla zalogowanych członków klubu GKS Strzegowo.
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
						<SegmentedButtons
							value={activeTab}
							onValueChange={setActiveTab}
							buttons={[
								{
									value: "trainings",
									label: "Treningi",
									icon: "soccer",
									checkedColor: COLORS.white,
									style: activeTab === "trainings" ? styles.activeTabButton : styles.inactiveTabButton,
								},
								{
									value: "matches",
									label: "Mecze",
									icon: "calendar",
									checkedColor: COLORS.white,
									style: activeTab === "matches" ? styles.activeTabButton : styles.inactiveTabButton,
								},
							]}
						/>
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
						{isCoachOrAdmin && (
							<Button
								mode="contained"
								icon="plus"
								onPress={openAddDialog}
								style={styles.addButton}
								labelStyle={styles.addButtonLabel}
							>
								Dodaj wydarzenie
							</Button>
						)}

						{activeTab === "trainings" ? (
							trainings.length === 0 ? (
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>Brak zaplanowanych treningów.</Text>
								</View>
							) : (
								trainings.map((training) => (
									<Card key={training.id} style={styles.card}>
										<Card.Content>
											<View style={styles.cardHeader}>
												<Title style={styles.title}>{training.title}</Title>
												<Text style={styles.groupBadge}>{getTeamName(training.team_id)}</Text>
											</View>
											{training.description ? (
												<Paragraph style={styles.description}>
													{training.description}
												</Paragraph>
											) : null}
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
							)
						) : (
							matches.length === 0 ? (
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>Brak zaplanowanych meczów.</Text>
								</View>
							) : (
								matches.map((match) => (
									<Card key={match.id} style={[styles.card, styles.matchCard]}>
										<Card.Content>
											<View style={styles.cardHeader}>
												<Title style={styles.title}>GKS Strzegowo vs {match.opponent}</Title>
												<Text style={styles.matchBadge}>{getTeamName(match.team_id)}</Text>
											</View>
											<View style={styles.infoRow}>
												<Text style={styles.infoLabel}>Termin:</Text>
												<Text style={styles.infoValue}>{formatDate(match.match_date)}</Text>
											</View>
											<View style={styles.infoRow}>
												<Text style={styles.infoLabel}>Miejsce:</Text>
												<Text style={styles.infoValue}>{match.location}</Text>
											</View>
											<View style={styles.resultRow}>
												<Text style={styles.resultLabel}>Wynik:</Text>
												<Text style={styles.resultValue}>
													{match.result ? match.result : "Nadchodzący"}
												</Text>
											</View>
										</Card.Content>
									</Card>
								))
							)
						)}
					</ScrollView>
				</>
			)}

			{/* Modal formularza dodawania wydarzenia */}
			<Portal>
				<Dialog visible={dialogVisible} onDismiss={() => !actionLoading && setDialogVisible(false)}>
					<Dialog.Title>Dodaj nowe wydarzenie</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll}>
							{/* Wybór typu wydarzenia */}
							<RadioButton.Group
								onValueChange={(val) => setEventType(val as any)}
								value={eventType}
							>
								<View style={styles.roleSelection}>
									<View style={styles.radioItem}>
										<RadioButton value="training" color={COLORS.primary} />
										<Text style={styles.radioLabel}>Trening</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton value="match" color={COLORS.primary} />
										<Text style={styles.radioLabel}>Mecz</Text>
									</View>
								</View>
							</RadioButton.Group>

							{/* Wybór Drużyny */}
							<Text style={styles.formLabel}>Dla której drużyny?</Text>
							<RadioButton.Group
								onValueChange={setFormTeamId}
								value={formTeamId}
							>
								{teams.map((t) => (
									<View key={t.id} style={styles.radioItem}>
										<RadioButton value={t.id.toString()} color={COLORS.primary} />
										<Text style={styles.radioLabel}>{t.name}</Text>
									</View>
								))}
							</RadioButton.Group>

							{eventType === "training" ? (
								<View>
									<TextInput
										label="Nazwa treningu"
										value={formTitle}
										onChangeText={setFormTitle}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Opis treningu"
										value={formDescription}
										onChangeText={setFormDescription}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Trener prowadzący"
										value={formCoach}
										onChangeText={setFormCoach}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Termin (np. Wtorek 17:00-18:30)"
										value={formTime}
										onChangeText={setFormTime}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Miejsce (np. Boisko główne)"
										value={formLocation}
										onChangeText={setFormLocation}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Limit miejsc"
										value={formMaxCapacity}
										onChangeText={setFormMaxCapacity}
										keyboardType="numeric"
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
								</View>
							) : (
								<View>
									<TextInput
										label="Przeciwnik"
										value={formOpponent}
										onChangeText={setFormOpponent}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Data meczu (np. 2026-08-20 18:00)"
										value={formDate}
										onChangeText={setFormDate}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
										placeholder="YYYY-MM-DD HH:MM"
									/>
									<TextInput
										label="Miejsce (np. Strzegowo (Dom) lub Wyjazd)"
										value={formLocation}
										onChangeText={setFormLocation}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
									<TextInput
										label="Wynik (np. 3:1) - opcjonalnie"
										value={formResult}
										onChangeText={setFormResult}
										mode="outlined"
										style={styles.formInput}
										activeOutlineColor={COLORS.primary}
									/>
								</View>
							)}

							{formError ? <Text style={styles.formError}>{formError}</Text> : null}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setDialogVisible(false)} disabled={actionLoading}>
							Anuluj
						</Button>
						<Button onPress={handleAddEvent} loading={actionLoading} disabled={actionLoading}>
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
		padding: 16,
	},
	activeTabButton: {
		backgroundColor: COLORS.primary,
	},
	inactiveTabButton: {
		backgroundColor: COLORS.white,
	},
	scrollContainer: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	addButton: {
		backgroundColor: COLORS.primary,
		marginBottom: 16,
		borderRadius: 8,
	},
	addButtonLabel: {
		color: COLORS.white,
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
		borderLeftWidth: 4,
		borderLeftColor: COLORS.primary,
	},
	matchCard: {
		borderLeftColor: COLORS.success,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	title: {
		color: COLORS.textDark,
		fontSize: 18,
		fontWeight: "bold",
		flex: 1,
		marginRight: 8,
	},
	groupBadge: {
		fontSize: 10,
		fontWeight: "bold",
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	matchBadge: {
		fontSize: 10,
		fontWeight: "bold",
		color: COLORS.success,
		backgroundColor: "#e6fbf3",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
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
		borderBottomColor: "#f1f5f9",
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
	resultRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "#cbd5e1",
	},
	resultLabel: {
		fontWeight: "bold",
		color: COLORS.textDark,
		fontSize: 14,
	},
	resultValue: {
		color: COLORS.success,
		fontSize: 14,
		fontWeight: "bold",
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
	dialogScroll: {
		maxHeight: 400,
	},
	roleSelection: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 12,
	},
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 4,
	},
	radioLabel: {
		fontSize: 14,
		color: COLORS.textDark,
		marginLeft: 8,
	},
	formLabel: {
		fontSize: 14,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginTop: 12,
		marginBottom: 4,
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
	},
});
