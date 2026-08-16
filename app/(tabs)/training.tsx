import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground, TouchableOpacity, Alert } from "react-native";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog, TextInput, RadioButton, HelperText, Switch } from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

import { Team, Training, Match } from "../../types";

export default function TrainingScreen() {
	const { user, profile } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("trainings");
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [matches, setMatches] = useState<Match[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Stan dla formularza dodawania/edycji wydarzenia
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editEventId, setEditEventId] = useState<number | null>(null);
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

	// Stan dla treningów cyklicznych
	const [isCyclic, setIsCyclic] = useState(false);
	const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
	const [recurrenceMonths, setRecurrenceMonths] = useState<number>(3);
	const [formTimeHours, setFormTimeHours] = useState("");

	const weekdays = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
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
			await fetchTeams();

			let trainingQuery = supabase.from("trainings").select("*");
			let matchQuery = supabase.from("matches").select("*");

			if (!isCoachOrAdmin && profile) {
				let userTeamId = profile.team_id;
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
					matchQuery = matchQuery.eq("team_id", -1);
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
		setEditEventId(null);
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
		setIsCyclic(false);
		setSelectedWeekdays([]);
		setRecurrenceMonths(3);
		setFormTimeHours("");
		setDialogVisible(true);
	};

	const openEditDialog = (event: any, type: "training" | "match") => {
		setEditEventId(event.id);
		setEventType(type);
		setFormError("");

		if (type === "training") {
			setFormTitle(event.title || "");
			setFormDescription(event.description || "");
			setFormCoach(event.coach || "");
			setFormTime(event.time || "");
			setFormLocation(event.location || "");
			setFormMaxCapacity(event.max_capacity?.toString() || "15");
			setFormTeamId(event.team_id?.toString() || "");
			setIsCyclic(false);
		} else {
			setFormTeamId(event.team_id?.toString() || "");
			setFormOpponent(event.opponent || "");
			const d = new Date(event.match_date);
			const yr = d.getFullYear();
			const mo = String(d.getMonth() + 1).padStart(2, "0");
			const dy = String(d.getDate()).padStart(2, "0");
			const hr = String(d.getHours()).padStart(2, "0");
			const mn = String(d.getMinutes()).padStart(2, "0");
			setFormDate(`${yr}-${mo}-${dy} ${hr}:${mn}`);
			setFormLocation(event.location || "");
			setFormResult(event.result || "");
		}

		setDialogVisible(true);
	};

	const getDatesForWeekday = (dayName: string, monthsLimit: number) => {
		const dayIndices: Record<string, number> = {
			"Niedziela": 0,
			"Poniedziałek": 1,
			"Wtorek": 2,
			"Środa": 3,
			"Czwartek": 4,
			"Piątek": 5,
			"Sobota": 6,
		};

		const targetDay = dayIndices[dayName];
		const dates: Date[] = [];
		const currentDate = new Date();
		const endDate = new Date();
		endDate.setMonth(currentDate.getMonth() + monthsLimit);

		let temp = new Date(currentDate);
		while (temp <= endDate) {
			if (temp.getDay() === targetDay) {
				dates.push(new Date(temp));
			}
			temp.setDate(temp.getDate() + 1);
		}
		return dates;
	};

	const handleAddEvent = async () => {
		if (!formTeamId) {
			setFormError("Proszę wybrać zespół.");
			return;
		}

		setActionLoading(true);
		setFormError("");

		try {
			if (editEventId !== null) {
				// Edycja
				if (eventType === "training") {
					if (!formTitle || !formTime || !formLocation) {
						throw new Error("Proszę wypełnić Tytuł, Termin oraz Miejsce");
					}
					const { error } = await supabase
						.from("trainings")
						.update({
							title: formTitle,
							description: formDescription,
							coach: formCoach,
							time: formTime,
							location: formLocation,
							max_capacity: parseInt(formMaxCapacity) || 15,
							team_id: parseInt(formTeamId),
						})
						.eq("id", editEventId);
					if (error) throw error;
				} else {
					if (!formOpponent || !formDate || !formLocation) {
						throw new Error("Proszę wypełnić Przeciwnika, Datę meczu oraz Miejsce");
					}
					const { error } = await supabase
						.from("matches")
						.update({
							team_id: parseInt(formTeamId),
							opponent: formOpponent,
							match_date: new Date(formDate).toISOString(),
							location: formLocation,
							result: formResult || null,
						})
						.eq("id", editEventId);
					if (error) throw error;
				}
			} else {
				// Tworzenie nowego
				if (eventType === "training") {
					if (!formTitle || !formLocation) {
						throw new Error("Proszę wypełnić Tytuł oraz Miejsce");
					}

					if (isCyclic) {
						if (selectedWeekdays.length === 0) {
							throw new Error("Proszę wybrać co najmniej jeden dzień tygodnia");
						}
						if (!formTimeHours.trim()) {
							throw new Error("Proszę podać godziny treningu (np. 17:00-18:30)");
						}

						const trainingsToInsert = [];
						for (const day of selectedWeekdays) {
							const dates = getDatesForWeekday(day, recurrenceMonths);
							for (const date of dates) {
								const formattedDate = date.toLocaleDateString("pl-PL", {
									day: "2-digit",
									month: "2-digit",
									year: "numeric",
								});
								const timeString = `${day}, ${formattedDate} ob. ${formTimeHours.trim()}`;
								trainingsToInsert.push({
									title: formTitle,
									description: formDescription,
									coach: formCoach,
									time: timeString,
									location: formLocation,
									max_capacity: parseInt(formMaxCapacity) || 15,
									team_id: parseInt(formTeamId),
								});
							}
						}

						const { error } = await supabase.from("trainings").insert(trainingsToInsert);
						if (error) throw error;
					} else {
						if (!formTime) {
							throw new Error("Proszę podać termin treningu");
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
					}
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

	const confirmDeleteEvent = (id: number, type: "training" | "match") => {
		Alert.alert(
			"Usuwanie wydarzenia",
			`Czy na pewno chcesz usunąć to wydarzenie z terminarza?`,
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: async () => {
						try {
							const table = type === "training" ? "trainings" : "matches";
							const { error } = await supabase.from(table).delete().eq("id", id);
							if (error) throw error;
							fetchData();
						} catch (err) {
							console.error("Error deleting event:", err);
							Alert.alert("Błąd", "Nie udało się usunąć wydarzenia");
						}
					}
				}
			]
		);
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
								trainings.map((training) => {
									let swipeableRef: Swipeable | null = null;
									const renderRightActions = () => (
										<View style={styles.swipeActionsContainer}>
											<TouchableOpacity
												style={[styles.swipeActionBtn, styles.editActionBtn]}
												onPress={() => {
													swipeableRef?.close();
													openEditDialog(training, "training");
												}}
											>
												<MaterialIcons name="edit" size={22} color={COLORS.white} />
												<Text style={styles.swipeActionText}>Edytuj</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[styles.swipeActionBtn, styles.deleteActionBtn]}
												onPress={() => {
													swipeableRef?.close();
													confirmDeleteEvent(training.id, "training");
												}}
											>
												<MaterialIcons name="delete" size={22} color={COLORS.white} />
												<Text style={styles.swipeActionText}>Usuń</Text>
											</TouchableOpacity>
										</View>
									);

									const cardContent = (
										<Card style={styles.card}>
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
									);

									if (isCoachOrAdmin) {
										return (
											<View key={training.id} style={{ marginBottom: 16 }}>
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
									return <View key={training.id}>{cardContent}</View>;
								})
							)
						) : (
							matches.length === 0 ? (
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>Brak zaplanowanych meczów.</Text>
								</View>
							) : (
								matches.map((match) => {
									let swipeableRef: Swipeable | null = null;
									const renderRightActions = () => (
										<View style={styles.swipeActionsContainer}>
											<TouchableOpacity
												style={[styles.swipeActionBtn, styles.editActionBtn]}
												onPress={() => {
													swipeableRef?.close();
													openEditDialog(match, "match");
												}}
											>
												<MaterialIcons name="edit" size={22} color={COLORS.white} />
												<Text style={styles.swipeActionText}>Edytuj</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[styles.swipeActionBtn, styles.deleteActionBtn]}
												onPress={() => {
													swipeableRef?.close();
													confirmDeleteEvent(match.id, "match");
												}}
											>
												<MaterialIcons name="delete" size={22} color={COLORS.white} />
												<Text style={styles.swipeActionText}>Usuń</Text>
											</TouchableOpacity>
										</View>
									);

									const cardContent = (
										<Card style={[styles.card, styles.matchCard]}>
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
									);

									if (isCoachOrAdmin) {
										return (
											<View key={match.id} style={{ marginBottom: 16 }}>
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
									return <View key={match.id}>{cardContent}</View>;
								})
							)
						)}
					</ScrollView>
				</>
			)}

			{/* Modal formularza dodawania/edycji wydarzenia */}
			<Portal>
				<Dialog visible={dialogVisible} onDismiss={() => !actionLoading && setDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>
						{editEventId !== null ? "Edytuj wydarzenie" : "Dodaj wydarzenie"}
					</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							{editEventId === null && (
								<View style={styles.roleSelection}>
									<View style={styles.radioItem}>
										<RadioButton
											value="training"
											status={eventType === "training" ? "checked" : "unchecked"}
											onPress={() => setEventType("training")}
											color={COLORS.primary}
										/>
										<Text style={styles.radioLabel}>Trening</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton
											value="match"
											status={eventType === "match" ? "checked" : "unchecked"}
											onPress={() => setEventType("match")}
											color={COLORS.primary}
										/>
										<Text style={styles.radioLabel}>Mecz</Text>
									</View>
								</View>
							)}

							<Text style={styles.formLabel}>Wybierz zespół:</Text>
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
										label="Tytuł treningu"
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

									{editEventId === null && (
										<View style={styles.switchRow}>
											<Text style={styles.switchLabel}>Trening cykliczny (co tydzień)</Text>
											<Switch
												value={isCyclic}
												onValueChange={setIsCyclic}
												color={COLORS.primary}
											/>
										</View>
									)}

									{editEventId === null && isCyclic ? (
										<View style={styles.cyclicContainer}>
											<Text style={styles.formLabel}>Wybierz dni tygodnia:</Text>
											<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekdayChipsScroll}>
												{weekdays.map((day) => {
													const selected = selectedWeekdays.includes(day);
													return (
														<TouchableOpacity
															key={day}
															style={[styles.weekdayChip, selected && styles.weekdayChipActive]}
															onPress={() => {
																if (selected) {
																	setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
																} else {
																	setSelectedWeekdays([...selectedWeekdays, day]);
																}
															}}
														>
															<Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextActive]}>
																{day}
															</Text>
														</TouchableOpacity>
													);
												})}
											</ScrollView>

											<Text style={styles.formLabel}>Czas trwania cyklu:</Text>
											<View style={styles.periodChipsContainer}>
												{[
													{ label: "1 miesiąc", val: 1 },
													{ label: "3 miesiące", val: 3 },
													{ label: "6 miesięcy", val: 6 }
												].map((item) => {
													const active = recurrenceMonths === item.val;
													return (
														<TouchableOpacity
															key={item.val}
															style={[styles.periodChip, active && styles.periodChipActive]}
															onPress={() => setRecurrenceMonths(item.val)}
														>
															<Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>
																{item.label}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>

											<TextInput
												label="Godziny treningu (np. 17:00-18:30)"
												value={formTimeHours}
												onChangeText={setFormTimeHours}
												mode="outlined"
												style={styles.formInput}
												activeOutlineColor={COLORS.primary}
												placeholder="HH:MM-HH:MM"
											/>
										</View>
									) : (
										<TextInput
											label="Termin (np. Wtorek 17:00-18:30)"
											value={formTime}
											onChangeText={setFormTime}
											mode="outlined"
											style={styles.formInput}
											activeOutlineColor={COLORS.primary}
										/>
									)}

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
						<Button onPress={() => setDialogVisible(false)} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleAddEvent} loading={actionLoading} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
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
		opacity: 0.045,
		resizeMode: "contain",
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
		borderLeftWidth: 4,
		borderLeftColor: COLORS.primary,
		overflow: "hidden",
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
		fontFamily: FONTS.bold,
		flex: 1,
		marginRight: 8,
	},
	groupBadge: {
		fontSize: 10,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	matchBadge: {
		fontSize: 10,
		fontFamily: FONTS.bold,
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
		fontFamily: FONTS.regular,
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
		fontFamily: FONTS.bold,
		color: COLORS.textLight,
		fontSize: 13,
	},
	infoValue: {
		color: COLORS.textDark,
		fontSize: 13,
		fontFamily: FONTS.medium,
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
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		fontSize: 14,
	},
	resultValue: {
		color: COLORS.success,
		fontSize: 14,
		fontFamily: FONTS.bold,
	},
	emptyContainer: {
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 15,
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
	dialog: {
		borderRadius: 22,
		backgroundColor: COLORS.white,
	},
	dialogTitle: {
		fontFamily: FONTS.extraBold,
		color: COLORS.primary,
		fontSize: 20,
	},
	dialogScroll: {
		maxHeight: 400,
	},
	formLabel: {
		fontSize: 14,
		fontFamily: FONTS.bold,
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
		fontFamily: FONTS.bold,
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
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		marginBottom: 12,
		paddingVertical: 4,
	},
	switchLabel: {
		fontSize: 14,
		color: COLORS.textDark,
		flex: 1,
		paddingRight: 10,
		fontFamily: FONTS.regular,
	},
	cyclicContainer: {
		marginBottom: 12,
	},
	weekdayChipsScroll: {
		flexDirection: "row",
		paddingVertical: 4,
		marginBottom: 8,
	},
	weekdayChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: COLORS.background,
		marginRight: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	weekdayChipActive: {
		backgroundColor: COLORS.primaryLight,
		borderColor: COLORS.primary,
	},
	weekdayChipText: {
		fontSize: 12,
		color: COLORS.textDark,
		fontFamily: FONTS.regular,
	},
	weekdayChipTextActive: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
	},
	periodChipsContainer: {
		flexDirection: "row",
		gap: 8,
		marginVertical: 8,
	},
	periodChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: COLORS.background,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	periodChipActive: {
		backgroundColor: COLORS.primaryLight,
		borderColor: COLORS.primary,
	},
	periodChipText: {
		fontSize: 12,
		color: COLORS.textDark,
		fontFamily: FONTS.regular,
	},
	periodChipTextActive: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
	},
	dialogContent: {
		paddingTop: 0,
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
		fontFamily: FONTS.regular,
	},
});
