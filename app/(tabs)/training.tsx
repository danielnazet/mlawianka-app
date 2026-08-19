import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground, TouchableOpacity, Alert, Animated } from "react-native";
import { Card, Title, Paragraph, Text, Button, Portal, Dialog, TextInput, RadioButton, HelperText, Switch } from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
	const [formTeamModalVisible, setFormTeamModalVisible] = useState(false);
	const [weekdaysModalVisible, setWeekdaysModalVisible] = useState(false);
	const [periodModalVisible, setPeriodModalVisible] = useState(false);
	const [locationModalVisible, setLocationModalVisible] = useState(false);
	const [isCustomLocation, setIsCustomLocation] = useState(false);
	const [isMatchDatePickerVisible, setMatchDatePickerVisible] = useState(false);
	const [isTrainingDatePickerVisible, setTrainingDatePickerVisible] = useState(false);
	const [isStartTimePickerVisible, setStartTimePickerVisible] = useState(false);
	const [isEndTimePickerVisible, setEndTimePickerVisible] = useState(false);
	const [cyclicStartTime, setCyclicStartTime] = useState("17:00");
	const [cyclicEndTime, setCyclicEndTime] = useState("18:30");
	const [showPastTrainings, setShowPastTrainings] = useState(false);
	const [showPastMatches, setShowPastMatches] = useState(false);
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

	const fadeAnim = useState(new Animated.Value(1))[0];
	const slideAnim = useState(new Animated.Value(0))[0];

	const handleTabChange = (newTab: string) => {
		if (newTab === activeTab) return;
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 120,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: -8,
				duration: 120,
				useNativeDriver: true,
			})
		]).start(() => {
			setActiveTab(newTab);
			slideAnim.setValue(12);
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 180,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 180,
					useNativeDriver: true,
				})
			]).start();
		});
	};

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
		try {
			await fetchTeams();

			if (!user || profile?.role === "fan") {
				// Goście oraz Kibice: pobierz mecze Głównego Zespołu Seniorów
				const { data: allTeams } = await supabase.from("teams").select("id, name");
				const seniorTeam = (allTeams || []).find((t) => {
					const n = t.name.toLowerCase();
					return n.includes("senior") || n.includes("pierwszy") || n.includes("i zespół");
				}) || allTeams?.[0];

				let matchQuery = supabase.from("matches").select("*");
				if (seniorTeam) {
					matchQuery = matchQuery.or(`team_id.eq.${seniorTeam.id},team_id.is.null`);
				}
				const { data: guestMatches, error: gmErr } = await matchQuery.order("match_date", { ascending: true });
				if (gmErr) throw gmErr;

				setMatches(guestMatches || []);
				setTrainings([]);
				setActiveTab("matches"); // Domyślnie dla gościa i kibica pokazywane są Mecze
				return;
			}

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

				// Wyznacz zespół Seniorów
				const { data: allTeams } = await supabase.from("teams").select("id, name");
				const seniorTeam = (allTeams || []).find((t) => {
					const n = t.name.toLowerCase();
					return n.includes("senior") || n.includes("pierwszy") || n.includes("i zespół");
				}) || allTeams?.[0];
				const seniorTeamId = seniorTeam ? seniorTeam.id : null;

				if (userTeamId) {
					trainingQuery = trainingQuery.or(`team_id.is.null,team_id.eq.${userTeamId}`);
					if (seniorTeamId && seniorTeamId !== userTeamId) {
						matchQuery = matchQuery.or(`team_id.is.null,team_id.eq.${userTeamId},team_id.eq.${seniorTeamId}`);
					} else {
						matchQuery = matchQuery.or(`team_id.is.null,team_id.eq.${userTeamId}`);
					}
				} else {
					trainingQuery = trainingQuery.is("team_id", null);
					if (seniorTeamId) {
						matchQuery = matchQuery.or(`team_id.is.null,team_id.eq.${seniorTeamId}`);
					} else {
						matchQuery = matchQuery.is("team_id", null);
					}
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

	const sortTeamsOrdered = (teamsList: Team[]) => {
		return [...teamsList].sort((a, b) => {
			const nameA = a.name.toLowerCase();
			const nameB = b.name.toLowerCase();

			const isSeniorA = nameA.includes("senior") || nameA.includes("pierwszy") || nameA.includes("i zespół");
			const isSeniorB = nameB.includes("senior") || nameB.includes("pierwszy") || nameB.includes("i zespół");
			if (isSeniorA && !isSeniorB) return -1;
			if (!isSeniorA && isSeniorB) return 1;

			const matchA = nameA.match(/u-?(\d+)/i);
			const matchB = nameB.match(/u-?(\d+)/i);

			if (matchA && matchB) {
				return parseInt(matchB[1]) - parseInt(matchA[1]);
			}
			if (matchA && !matchB) return -1;
			if (!matchA && matchB) return 1;

			return nameA.localeCompare(nameB, "pl");
		});
	};

	const getVisibleTeamsForForm = () => {
		if (profile?.role === "admin") {
			return sortTeamsOrdered(teams);
		}
		if (profile?.role === "coach") {
			const coachTeams = teams.filter((t) => t.coach_id === user?.id || (profile.team_id && t.id === profile.team_id));
			return sortTeamsOrdered(coachTeams.length > 0 ? coachTeams : teams);
		}
		return sortTeamsOrdered(teams);
	};

	const CLUB_LOCATIONS = [
		{
			id: "stadion",
			name: "Stadion Miejski w Strzegowie",
			address: "Stadion Miejski, ul. Sportowa 4, 06-540 Strzegowo",
			icon: "stadium",
		},
		{
			id: "orlik_1",
			name: "Orlik nr 1 przy SP",
			address: "Orlik nr 1, ul. Wojska Polskiego 1, 06-540 Strzegowo",
			icon: "soccer-field",
		},
		{
			id: "orlik_2",
			name: "Orlik Gminny (Parkowa)",
			address: "Orlik Gminny, ul. Parkowa 2, 06-540 Strzegowo",
			icon: "soccer-field",
		},
		{
			id: "hala",
			name: "Hala Sportowa przy SP",
			address: "Hala Sportowa, ul. Wojska Polskiego 1, 06-540 Strzegowo",
			icon: "stadium-variant",
		},
		{
			id: "wyjazd",
			name: "Mecz wyjazdowy / Inny adres",
			address: "",
			icon: "map-marker-outline",
		},
	];

	const parseEventDate = (event: any, type: "training" | "match"): Date | null => {
		if (type === "match") {
			if (!event.match_date) return null;
			return new Date(event.match_date);
		}
		if (!event.time) return null;
		const match = event.time.match(/(\d{2})[.\/](\d{2})[.\/](\d{4})/);
		if (match) {
			const [_, day, month, year] = match;
			const timeMatch = event.time.match(/(\d{2}):(\d{2})/);
			const hours = timeMatch ? parseInt(timeMatch[1]) : 12;
			const mins = timeMatch ? parseInt(timeMatch[2]) : 0;
			return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, mins);
		}
		return null;
	};

	const processEvents = (eventsList: any[], type: "training" | "match") => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const upcoming: { event: any; date: Date | null }[] = [];
		const past: { event: any; date: Date | null }[] = [];

		eventsList.forEach((e) => {
			const d = parseEventDate(e, type);
			if (!d) {
				upcoming.push({ event: e, date: null });
			} else if (d >= now) {
				upcoming.push({ event: e, date: d });
			} else {
				past.push({ event: e, date: d });
			}
		});

		upcoming.sort((a, b) => {
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date.getTime() - b.date.getTime();
		});

		past.sort((a, b) => {
			if (!a.date) return 1;
			if (!b.date) return -1;
			return b.date.getTime() - a.date.getTime();
		});

		return { upcoming, past };
	};

	const roundTo30Minutes = (date: Date) => {
		const minutes = date.getMinutes();
		const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
		if (minutes >= 45) {
			date.setHours(date.getHours() + 1);
		}
		date.setMinutes(roundedMinutes);
		return date;
	};

	const formatMinutes = (date: Date) => {
		const minutes = date.getMinutes();
		return minutes < 15 || minutes >= 45 ? "00" : "30";
	};

	const handleConfirmMatchDate = (rawDate: Date) => {
		setMatchDatePickerVisible(false);
		const date = roundTo30Minutes(rawDate);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const mins = formatMinutes(date);
		setFormDate(`${year}-${month}-${day} ${hours}:${mins}`);
	};

	const handleConfirmTrainingDate = (rawDate: Date) => {
		setTrainingDatePickerVisible(false);
		const date = roundTo30Minutes(rawDate);
		const dayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
		const monthNames = [
			"stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
			"lipca", "sierpnia", "września", "października", "listopada", "grudnia"
		];
		const dayName = dayNames[date.getDay()];
		const day = date.getDate();
		const monthName = monthNames[date.getMonth()];
		const hours = String(date.getHours()).padStart(2, "0");
		const mins = formatMinutes(date);
		setFormTime(`${dayName}, ${day} ${monthName} ${hours}:${mins}`);
	};

	const handleConfirmStartTime = (rawDate: Date) => {
		setStartTimePickerVisible(false);
		const date = roundTo30Minutes(rawDate);
		const hours = String(date.getHours()).padStart(2, "0");
		const mins = formatMinutes(date);
		const start = `${hours}:${mins}`;
		setCyclicStartTime(start);
		setFormTimeHours(`${start}-${cyclicEndTime}`);
	};

	const handleConfirmEndTime = (rawDate: Date) => {
		setEndTimePickerVisible(false);
		const date = roundTo30Minutes(rawDate);
		const hours = String(date.getHours()).padStart(2, "0");
		const mins = formatMinutes(date);
		const end = `${hours}:${mins}`;
		setCyclicEndTime(end);
		setFormTimeHours(`${cyclicStartTime}-${end}`);
	};

	const openAddDialog = () => {
		const visibleFormTeams = getVisibleTeamsForForm();
		setEditEventId(null);
		setEventType("training");
		setFormTitle("");
		setFormDescription("");
		setFormCoach(profile ? `${profile.first_name} ${profile.last_name}` : "");
		setFormTime("");
		setFormLocation(CLUB_LOCATIONS[1].address);
		setIsCustomLocation(false);
		setFormMaxCapacity("15");
		setFormTeamId(visibleFormTeams[0]?.id?.toString() || "");
		setFormOpponent("");
		setFormDate("");
		setFormResult("");
		setFormError("");
		setIsCyclic(false);
		setSelectedWeekdays([]);
		setRecurrenceMonths(3);
		setFormTimeHours("17:00-18:30");
		setCyclicStartTime("17:00");
		setCyclicEndTime("18:30");
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

	const handleAddOrEditEvent = async () => {
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
			{/* Custom Pill Tab Switcher (widoczny tylko dla zalogowanych zawodników, trenerów, rodziców) */}
			{user && profile?.role !== "fan" && (
				<View style={styles.customTabContainer}>
					<View style={styles.customTabWrapper}>
						{[
							{ id: "trainings", label: "Treningi", icon: "soccer" },
							{ id: "matches", label: "Mecze", icon: "calendar-text-outline" },
						].map((tab) => {
							const isActive = activeTab === tab.id;
							return (
								<TouchableOpacity
									key={tab.id}
									activeOpacity={0.85}
									onPress={() => handleTabChange(tab.id)}
									style={[
										styles.customTabItem,
										isActive && styles.customTabItemActive,
									]}
								>
									<MaterialCommunityIcons
										name={tab.icon as any}
										size={18}
										color={isActive ? COLORS.white : COLORS.textLight}
										style={{ marginRight: 6 }}
									/>
									<Text
										style={[
											styles.customTabText,
											isActive ? styles.customTabTextActive : styles.customTabTextInactive,
										]}
									>
										{tab.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>
			)}

			<Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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

					{!user && (
						<Card style={styles.guestInfoBanner}>
							<View style={styles.guestInfoRow}>
								<View style={styles.guestIconCircle}>
									<MaterialCommunityIcons name="account-key-outline" size={24} color={COLORS.primary} />
								</View>
								<View style={styles.guestTextContainer}>
									<Text style={styles.guestBannerTitle}>Chcesz zobaczyć grafik treningów i ogłoszenia?</Text>
									<Text style={styles.guestBannerSubtitle}>
										Zaloguj się na konto członka klubu GKS Strzegowo, aby uzyskać dostęp do pełnego terminarza, grafiku Orlika, ogłoszeń oraz czatu!
									</Text>
								</View>
							</View>
							<Button
								mode="contained"
								onPress={() => router.push("/auth/login")}
								style={styles.guestLoginBtn}
								labelStyle={styles.guestLoginBtnLabel}
								icon="login"
							>
								Zaloguj się
							</Button>
						</Card>
					)}

					{user && activeTab === "trainings" ? (() => {
						const { upcoming, past } = processEvents(trainings, "training");
						if (upcoming.length === 0 && past.length === 0) {
							return (
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>Brak zaplanowanych treningów.</Text>
								</View>
							);
						}

						return (
							<View>
								{/* Sekcja Nadchodzących Treningów */}
								{upcoming.map((item, index) => {
									const training = item.event;
									const isHero = index === 0;
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
										<Card style={[styles.card, isHero && styles.heroCard]}>
											<Card.Content>
												{isHero && (
													<View style={styles.heroBadgeRow}>
														<MaterialCommunityIcons name="lightning-bolt" size={16} color={COLORS.white} />
														<Text style={styles.heroBadgeText}>NAJBLIŻSZY TRENING</Text>
													</View>
												)}
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
								})}

								{/* Sekcja Archiwum Minionych Treningów */}
								{past.length > 0 && (
									<View style={styles.archiveSection}>
										<TouchableOpacity
											style={styles.archiveHeaderToggle}
											activeOpacity={0.8}
											onPress={() => setShowPastTrainings(!showPastTrainings)}
										>
											<MaterialCommunityIcons
												name={showPastTrainings ? "folder-open" : "folder"}
												size={20}
												color={COLORS.textLight}
											/>
											<Text style={styles.archiveHeaderText}>
												Archiwum minionych treningów ({past.length})
											</Text>
											<MaterialIcons
												name={showPastTrainings ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={24}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{showPastTrainings && past.map((item) => {
											const training = item.event;
											return (
												<Card key={training.id} style={[styles.card, styles.pastCard]}>
													<Card.Content>
														<View style={styles.cardHeader}>
															<Title style={[styles.title, { color: COLORS.textLight }]}>{training.title}</Title>
															<Text style={[styles.groupBadge, { opacity: 0.7 }]}>{getTeamName(training.team_id)}</Text>
														</View>
														<View style={styles.infoRow}>
															<Text style={styles.infoLabel}>Termin:</Text>
															<Text style={[styles.infoValue, { color: COLORS.textLight }]}>{training.time}</Text>
														</View>
													</Card.Content>
												</Card>
											);
										})}
									</View>
								)}
							</View>
						);
					})() : (() => {
						const { upcoming, past } = processEvents(matches, "match");
						if (upcoming.length === 0 && past.length === 0) {
							return (
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>Brak zaplanowanych meczów.</Text>
								</View>
							);
						}

						return (
							<View>
								{/* Sekcja Nadchodzących Meczów */}
								{upcoming.map((item, index) => {
									const match = item.event;
									const isHero = index === 0;
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
										<Card style={[styles.card, styles.matchCard, isHero && styles.heroMatchCard]}>
											<Card.Content>
												{isHero && (
													<View style={styles.heroBadgeRow}>
														<MaterialCommunityIcons name="trophy" size={16} color={COLORS.white} />
														<Text style={styles.heroBadgeText}>NAJBLIŻSZY MECZ</Text>
													</View>
												)}
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
								})}

								{/* Sekcja Archiwum Minionych Meczów */}
								{past.length > 0 && (
									<View style={styles.archiveSection}>
										<TouchableOpacity
											style={styles.archiveHeaderToggle}
											activeOpacity={0.8}
											onPress={() => setShowPastMatches(!showPastMatches)}
										>
											<MaterialCommunityIcons
												name={showPastMatches ? "folder-open" : "folder"}
												size={20}
												color={COLORS.textLight}
											/>
											<Text style={styles.archiveHeaderText}>
												Archiwum minionych meczów ({past.length})
											</Text>
											<MaterialIcons
												name={showPastMatches ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={24}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{showPastMatches && past.map((item) => {
											const match = item.event;
											return (
												<Card key={match.id} style={[styles.card, styles.matchCard, styles.pastCard]}>
													<Card.Content>
														<View style={styles.cardHeader}>
															<Title style={[styles.title, { color: COLORS.textLight }]}>GKS Strzegowo vs {match.opponent}</Title>
															<Text style={[styles.matchBadge, { opacity: 0.7 }]}>{getTeamName(match.team_id)}</Text>
														</View>
														<View style={styles.infoRow}>
															<Text style={styles.infoLabel}>Termin:</Text>
															<Text style={[styles.infoValue, { color: COLORS.textLight }]}>{formatDate(match.match_date)}</Text>
														</View>
														<View style={styles.resultRow}>
															<Text style={styles.resultLabel}>Wynik końcowy:</Text>
															<Text style={[styles.resultValue, { color: COLORS.textLight }]}>
																{match.result ? match.result : "Brak wpisanego wyniku"}
															</Text>
														</View>
													</Card.Content>
												</Card>
											);
										})}
									</View>
								)}
							</View>
						);
					})()}
				</ScrollView>
			</Animated.View>

			{/* Modal formularza dodawania/edycji wydarzenia */}
			<Portal>
				<Dialog visible={dialogVisible} onDismiss={() => !actionLoading && setDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>
						{editEventId !== null ? "Edytuj wydarzenie" : "Dodaj wydarzenie"}
					</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							{/* Przełącznik typu wydarzenia (Trening / Mecz) */}
							{editEventId === null && (
								<View style={styles.eventTypePillsRow}>
									<TouchableOpacity
										activeOpacity={0.85}
										style={[styles.eventTypePill, eventType === "training" && styles.eventTypePillActive]}
										onPress={() => setEventType("training")}
									>
										<MaterialCommunityIcons
											name="soccer"
											size={18}
											color={eventType === "training" ? COLORS.white : COLORS.textLight}
										/>
										<Text style={[styles.eventTypePillText, eventType === "training" && styles.eventTypePillTextActive]}>
											Trening
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										activeOpacity={0.85}
										style={[styles.eventTypePill, eventType === "match" && styles.eventTypePillActive]}
										onPress={() => setEventType("match")}
									>
										<MaterialCommunityIcons
											name="trophy-outline"
											size={18}
											color={eventType === "match" ? COLORS.white : COLORS.textLight}
										/>
										<Text style={[styles.eventTypePillText, eventType === "match" && styles.eventTypePillTextActive]}>
											Mecz
										</Text>
									</TouchableOpacity>
								</View>
							)}

							{/* Wybór docelowego zespołu */}
							<Text style={styles.formLabel}>Docelowy zespół:</Text>
							<TouchableOpacity
								style={styles.dropdownSelector}
								activeOpacity={getVisibleTeamsForForm().length > 1 ? 0.8 : 1}
								onPress={() => {
									if (getVisibleTeamsForForm().length > 1) {
										setFormTeamModalVisible(true);
									}
								}}
							>
								<MaterialIcons name="groups" size={22} color={COLORS.primary} />
								<Text style={styles.dropdownSelectorText}>
									{teams.find((t) => t.id.toString() === formTeamId)?.name || "Wybierz zespół"}
								</Text>
								{getVisibleTeamsForForm().length > 1 && (
									<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
								)}
							</TouchableOpacity>

							{/* Modal wyboru zespołu w formularzu */}
							<Portal>
								<Dialog
									visible={formTeamModalVisible}
									onDismiss={() => setFormTeamModalVisible(false)}
									style={styles.dialogContainer}
								>
									<Dialog.Title style={styles.dialogTitle}>Wybierz zespół</Dialog.Title>
									<Dialog.Content style={{ paddingHorizontal: 16 }}>
										<ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
											{getVisibleTeamsForForm().map((t) => {
												const isSelected = formTeamId === t.id.toString();
												return (
													<TouchableOpacity
														key={t.id}
														style={[
															styles.dropdownOption,
															isSelected && styles.dropdownOptionActive
														]}
														onPress={() => {
															setFormTeamId(t.id.toString());
															setFormTeamModalVisible(false);
														}}
													>
														<MaterialIcons name="group" size={20} color={isSelected ? COLORS.primary : COLORS.textLight} />
														<Text style={[
															styles.dropdownOptionText,
															isSelected && styles.dropdownOptionTextActive
														]}>
															{t.name}
														</Text>
														{isSelected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
													</TouchableOpacity>
												);
											})}
										</ScrollView>
									</Dialog.Content>
									<Dialog.Actions>
										<Button onPress={() => setFormTeamModalVisible(false)}>Zamknij</Button>
									</Dialog.Actions>
								</Dialog>
							</Portal>

							{eventType === "training" ? (
								<View>
									<TextInput
										label="Tytuł treningu"
										value={formTitle}
										onChangeText={setFormTitle}
										mode="outlined"
										style={styles.formInput}
										outlineColor={COLORS.border}
										activeOutlineColor={COLORS.primary}
										textColor={COLORS.textDark}
										left={<TextInput.Icon icon="format-title" color={COLORS.textLight} />}
									/>
									<TextInput
										label="Opis treningu"
										value={formDescription}
										onChangeText={setFormDescription}
										mode="outlined"
										style={styles.formInput}
										outlineColor={COLORS.border}
										activeOutlineColor={COLORS.primary}
										textColor={COLORS.textDark}
										left={<TextInput.Icon icon="text-subject" color={COLORS.textLight} />}
									/>
									<TextInput
										label="Trener prowadzący"
										value={formCoach}
										onChangeText={setFormCoach}
										mode="outlined"
										style={styles.formInput}
										outlineColor={COLORS.border}
										activeOutlineColor={COLORS.primary}
										textColor={COLORS.textDark}
										left={<TextInput.Icon icon="account-tie" color={COLORS.textLight} />}
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
											{/* Wybór dni tygodnia (Dropdown Selector) */}
											<Text style={styles.formLabel}>Wybierz dni tygodnia:</Text>
											<TouchableOpacity
												style={styles.dropdownSelector}
												activeOpacity={0.8}
												onPress={() => setWeekdaysModalVisible(true)}
											>
												<MaterialCommunityIcons name="calendar-multiselect" size={22} color={COLORS.primary} />
												<Text style={styles.dropdownSelectorText}>
													{selectedWeekdays.length > 0
														? selectedWeekdays.join(", ")
														: "Wybierz dni tygodnia (np. Wtorek, Czwartek)"}
												</Text>
												<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
											</TouchableOpacity>

											{/* Modal Wyboru Dni Tygodnia */}
											<Portal>
												<Dialog
													visible={weekdaysModalVisible}
													onDismiss={() => setWeekdaysModalVisible(false)}
													style={styles.dialogContainer}
												>
													<Dialog.Title style={styles.dialogTitle}>Wybierz dni tygodnia</Dialog.Title>
													<Dialog.Content style={{ paddingHorizontal: 16 }}>
														<ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
															{weekdays.map((day) => {
																const isSelected = selectedWeekdays.includes(day);
																return (
																	<TouchableOpacity
																		key={day}
																		style={[
																			styles.dropdownOption,
																			isSelected && styles.dropdownOptionActive
																		]}
																		onPress={() => {
																			if (isSelected) {
																				setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
																			} else {
																				setSelectedWeekdays([...selectedWeekdays, day]);
																			}
																		}}
																	>
																		<MaterialCommunityIcons
																			name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
																			size={22}
																			color={isSelected ? COLORS.primary : COLORS.textLight}
																		/>
																		<Text style={[
																			styles.dropdownOptionText,
																			isSelected && styles.dropdownOptionTextActive
																		]}>
																			{day}
																		</Text>
																	</TouchableOpacity>
																);
															})}
														</ScrollView>
													</Dialog.Content>
													<Dialog.Actions>
														<Button
															mode="contained"
															onPress={() => setWeekdaysModalVisible(false)}
															style={{ backgroundColor: COLORS.primary }}
															labelStyle={{ fontFamily: FONTS.bold, color: COLORS.white }}
														>
															Gotowe
														</Button>
													</Dialog.Actions>
												</Dialog>
											</Portal>

											{/* Wybór czasu trwania cyklu (Dropdown Selector) */}
											<Text style={styles.formLabel}>Czas trwania cyklu:</Text>
											<TouchableOpacity
												style={styles.dropdownSelector}
												activeOpacity={0.8}
												onPress={() => setPeriodModalVisible(true)}
											>
												<MaterialCommunityIcons name="calendar-clock" size={22} color={COLORS.primary} />
												<Text style={styles.dropdownSelectorText}>
													{[
														{ label: "1 miesiąc", val: 1 },
														{ label: "3 miesiące", val: 3 },
														{ label: "6 miesięcy", val: 6 }
													].find((p) => p.val === recurrenceMonths)?.label || "Wybierz czas trwania"}
												</Text>
												<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
											</TouchableOpacity>

											{/* Modal Wyboru Czasu Trwania Cyklu */}
											<Portal>
												<Dialog
													visible={periodModalVisible}
													onDismiss={() => setPeriodModalVisible(false)}
													style={styles.dialogContainer}
												>
													<Dialog.Title style={styles.dialogTitle}>Czas trwania cyklu</Dialog.Title>
													<Dialog.Content style={{ paddingHorizontal: 16 }}>
														<ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
															{[
																{ label: "1 miesiąc (ok. 4 tygodnie)", val: 1 },
																{ label: "3 miesiące (ok. 12 tygodni)", val: 3 },
																{ label: "6 miesięcy (ok. 24 tygodnie)", val: 6 }
															].map((item) => {
																const isSelected = recurrenceMonths === item.val;
																return (
																	<TouchableOpacity
																		key={item.val}
																		style={[
																			styles.dropdownOption,
																			isSelected && styles.dropdownOptionActive
																		]}
																		onPress={() => {
																			setRecurrenceMonths(item.val);
																			setPeriodModalVisible(false);
																		}}
																	>
																		<MaterialCommunityIcons
																			name="history"
																			size={20}
																			color={isSelected ? COLORS.primary : COLORS.textLight}
																		/>
																		<Text style={[
																			styles.dropdownOptionText,
																			isSelected && styles.dropdownOptionTextActive
																		]}>
																			{item.label}
																		</Text>
																		{isSelected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
																	</TouchableOpacity>
																);
															})}
														</ScrollView>
													</Dialog.Content>
													<Dialog.Actions>
														<Button onPress={() => setPeriodModalVisible(false)}>Zamknij</Button>
													</Dialog.Actions>
												</Dialog>
											</Portal>

											{/* Wybór godzin treningu cyklicznego */}
											<Text style={styles.formLabel}>Godziny treningu cyklicznego:</Text>
											<View style={{ flexDirection: "row", gap: 12 }}>
												<View style={{ flex: 1 }}>
													<Text style={[styles.formLabel, { fontSize: 12, marginTop: 0 }]}>Od godz.:</Text>
													<TouchableOpacity
														style={styles.dropdownSelector}
														activeOpacity={0.8}
														onPress={() => setStartTimePickerVisible(true)}
													>
														<MaterialCommunityIcons name="clock-start" size={20} color={COLORS.primary} />
														<Text style={styles.dropdownSelectorText}>{cyclicStartTime}</Text>
													</TouchableOpacity>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={[styles.formLabel, { fontSize: 12, marginTop: 0 }]}>Do godz.:</Text>
													<TouchableOpacity
														style={styles.dropdownSelector}
														activeOpacity={0.8}
														onPress={() => setEndTimePickerVisible(true)}
													>
														<MaterialCommunityIcons name="clock-end" size={20} color={COLORS.primary} />
														<Text style={styles.dropdownSelectorText}>{cyclicEndTime}</Text>
													</TouchableOpacity>
												</View>
											</View>
											<DateTimePickerModal
												isVisible={isStartTimePickerVisible}
												mode="time"
												minuteInterval={30}
												onConfirm={handleConfirmStartTime}
												onCancel={() => setStartTimePickerVisible(false)}
												confirmTextIOS="Zatwierdź"
												cancelTextIOS="Anuluj"
											/>
											<DateTimePickerModal
												isVisible={isEndTimePickerVisible}
												mode="time"
												minuteInterval={30}
												onConfirm={handleConfirmEndTime}
												onCancel={() => setEndTimePickerVisible(false)}
												confirmTextIOS="Zatwierdź"
												cancelTextIOS="Anuluj"
											/>
										</View>
									) : (
										<View>
											<Text style={styles.formLabel}>Termin i godzina treningu:</Text>
											<TouchableOpacity
												style={styles.dropdownSelector}
												activeOpacity={0.8}
												onPress={() => setTrainingDatePickerVisible(true)}
											>
												<MaterialCommunityIcons name="clock-outline" size={22} color={COLORS.primary} />
												<Text style={styles.dropdownSelectorText}>
													{formTime || "Wybierz datę i godzinę treningu"}
												</Text>
												<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
											</TouchableOpacity>
											<DateTimePickerModal
												isVisible={isTrainingDatePickerVisible}
												mode="datetime"
												minuteInterval={30}
												onConfirm={handleConfirmTrainingDate}
												onCancel={() => setTrainingDatePickerVisible(false)}
												confirmTextIOS="Zatwierdź"
												cancelTextIOS="Anuluj"
											/>
										</View>
									)}

									{/* Selektor miejsca wydarzenia */}
									<Text style={styles.formLabel}>Miejsce treningu:</Text>
									<TouchableOpacity
										style={styles.dropdownSelector}
										activeOpacity={0.8}
										onPress={() => setLocationModalVisible(true)}
									>
										<MaterialCommunityIcons name="map-marker-outline" size={22} color={COLORS.primary} />
										<Text style={styles.dropdownSelectorText} numberOfLines={2}>
											{formLocation || "Wybierz obiekt sportowy"}
										</Text>
										<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
									</TouchableOpacity>

									{isCustomLocation && (
										<TextInput
											label="Wpisz własny adres / nazwę stadionu"
											value={formLocation}
											onChangeText={setFormLocation}
											mode="outlined"
											style={styles.formInput}
											outlineColor={COLORS.border}
											activeOutlineColor={COLORS.primary}
											textColor={COLORS.textDark}
											left={<TextInput.Icon icon="map-marker-edit-outline" color={COLORS.textLight} />}
										/>
									)}
								</View>
							) : (
								<View>
									<TextInput
										label="Przeciwnik (np. Mławianka II Mława)"
										value={formOpponent}
										onChangeText={setFormOpponent}
										mode="outlined"
										style={styles.formInput}
										outlineColor={COLORS.border}
										activeOutlineColor={COLORS.primary}
										textColor={COLORS.textDark}
										left={<TextInput.Icon icon="shield-outline" color={COLORS.textLight} />}
									/>
									
									<Text style={styles.formLabel}>Data i godzina meczu:</Text>
									<TouchableOpacity
										style={styles.dropdownSelector}
										activeOpacity={0.8}
										onPress={() => setMatchDatePickerVisible(true)}
									>
										<MaterialCommunityIcons name="calendar-clock" size={22} color={COLORS.primary} />
										<Text style={styles.dropdownSelectorText}>
											{formDate || "Wybierz datę i godzinę meczu"}
										</Text>
										<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
									</TouchableOpacity>
									<DateTimePickerModal
										isVisible={isMatchDatePickerVisible}
										mode="datetime"
										minuteInterval={30}
										onConfirm={handleConfirmMatchDate}
										onCancel={() => setMatchDatePickerVisible(false)}
										confirmTextIOS="Zatwierdź"
										cancelTextIOS="Anuluj"
									/>

									{/* Selektor miejsca meczu */}
									<Text style={styles.formLabel}>Miejsce meczu:</Text>
									<TouchableOpacity
										style={styles.dropdownSelector}
										activeOpacity={0.8}
										onPress={() => setLocationModalVisible(true)}
									>
										<MaterialCommunityIcons name="map-marker-outline" size={22} color={COLORS.primary} />
										<Text style={styles.dropdownSelectorText} numberOfLines={2}>
											{formLocation || "Wybierz miejsce meczu"}
										</Text>
										<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
									</TouchableOpacity>

									{isCustomLocation && (
										<TextInput
											label="Wpisz adres stadionu rywali (wyjazd)"
											value={formLocation}
											onChangeText={setFormLocation}
											mode="outlined"
											style={styles.formInput}
											outlineColor={COLORS.border}
											activeOutlineColor={COLORS.primary}
											textColor={COLORS.textDark}
											left={<TextInput.Icon icon="map-marker-edit-outline" color={COLORS.textLight} />}
										/>
									)}
									<TextInput
										label="Wynik meczu (np. 3:1) - opcjonalnie"
										value={formResult}
										onChangeText={setFormResult}
										mode="outlined"
										style={styles.formInput}
										outlineColor={COLORS.border}
										activeOutlineColor={COLORS.primary}
										textColor={COLORS.textDark}
										left={<TextInput.Icon icon="scoreboard-outline" color={COLORS.textLight} />}
									/>
								</View>
							)}

							{/* Modal Wyboru Miejsca */}
							<Portal>
								<Dialog
									visible={locationModalVisible}
									onDismiss={() => setLocationModalVisible(false)}
									style={styles.dialogContainer}
								>
									<Dialog.Title style={styles.dialogTitle}>Wybierz miejsce</Dialog.Title>
									<Dialog.Content style={{ paddingHorizontal: 16 }}>
										<ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
											{CLUB_LOCATIONS.map((loc) => {
												const isSelected = formLocation === loc.address || (loc.id === "wyjazd" && isCustomLocation);
												return (
													<TouchableOpacity
														key={loc.id}
														style={[
															styles.dropdownOption,
															isSelected && styles.dropdownOptionActive
														]}
														onPress={() => {
															if (loc.id === "wyjazd") {
																setIsCustomLocation(true);
																if (formLocation === loc.address) setFormLocation("");
															} else {
																setIsCustomLocation(false);
																setFormLocation(loc.address);
															}
															setLocationModalVisible(false);
														}}
													>
														<MaterialCommunityIcons
															name={loc.icon as any}
															size={22}
															color={isSelected ? COLORS.primary : COLORS.textLight}
														/>
														<View style={{ flex: 1, marginLeft: 12 }}>
															<Text style={[
																styles.dropdownOptionText,
																{ marginLeft: 0 },
																isSelected && styles.dropdownOptionTextActive
															]}>
																{loc.name}
															</Text>
															{loc.address ? (
																<Text style={{ fontSize: 11, color: COLORS.textLight, fontFamily: FONTS.regular }}>
																	{loc.address}
																</Text>
															) : null}
														</View>
														{isSelected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
													</TouchableOpacity>
												);
											})}
										</ScrollView>
									</Dialog.Content>
									<Dialog.Actions>
										<Button onPress={() => setLocationModalVisible(false)}>Zamknij</Button>
									</Dialog.Actions>
								</Dialog>
							</Portal>

							{formError ? <Text style={styles.formError}>{formError}</Text> : null}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
						<Button
							mode="outlined"
							onPress={() => setDialogVisible(false)}
							disabled={actionLoading}
							labelStyle={{ fontFamily: FONTS.bold }}
							textColor={COLORS.textLight}
							style={{ marginRight: 8, borderColor: COLORS.border }}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleAddOrEditEvent}
							loading={actionLoading}
							disabled={actionLoading}
							labelStyle={{ fontFamily: FONTS.bold, color: COLORS.white }}
							style={{ backgroundColor: COLORS.primary }}
						>
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
		borderLeftColor: COLORS.primary,
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
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
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
		color: COLORS.primary,
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

	// Custom Pill Tab Switcher (Outfit fonts)
	customTabContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	customTabWrapper: {
		flexDirection: "row",
		backgroundColor: "#F1F5F9",
		borderRadius: 14,
		padding: 4,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	customTabItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 9,
		borderRadius: 10,
	},
	customTabItemActive: {
		backgroundColor: COLORS.primary,
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	customTabText: {
		fontSize: 13,
	},
	customTabTextActive: {
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},
	customTabTextInactive: {
		fontFamily: FONTS.semiBold,
		color: COLORS.textLight,
	},

	// Guest Info Banner
	guestInfoBanner: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		marginTop: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		elevation: 2,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	guestInfoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	guestIconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: COLORS.primaryLight,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	guestTextContainer: {
		flex: 1,
	},
	guestBannerTitle: {
		fontSize: 15,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 2,
	},
	guestBannerSubtitle: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		lineHeight: 16,
	},
	guestLoginBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 10,
	},
	guestLoginBtnLabel: {
		fontFamily: FONTS.bold,
		color: COLORS.white,
		fontSize: 13,
	},
	eventTypePillsRow: {
		flexDirection: "row",
		backgroundColor: "#F1F5F9",
		borderRadius: 12,
		padding: 4,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	eventTypePill: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderRadius: 9,
	},
	eventTypePillActive: {
		backgroundColor: COLORS.primary,
		elevation: 2,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
	},
	eventTypePillText: {
		fontSize: 13,
		fontFamily: FONTS.semiBold,
		color: COLORS.textLight,
		marginLeft: 6,
	},
	eventTypePillTextActive: {
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},
	dropdownSelector: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginTop: 4,
		marginBottom: 12,
	},
	dropdownSelectorText: {
		flex: 1,
		fontSize: 14,
		fontFamily: FONTS.semiBold,
		color: COLORS.textDark,
		marginLeft: 10,
	},
	dialogContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
	},
	dropdownOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 4,
	},
	dropdownOptionActive: {
		backgroundColor: COLORS.primaryLight,
	},
	dropdownOptionText: {
		flex: 1,
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		marginLeft: 12,
	},
	dropdownOptionTextActive: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
	},

	// Hero Spotlight Card (Najbliższe Wydarzenie)
	heroCard: {
		borderLeftWidth: 5,
		borderLeftColor: COLORS.primary,
		backgroundColor: "#F0F7FF",
		elevation: 4,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
	},
	heroMatchCard: {
		borderLeftWidth: 5,
		borderLeftColor: COLORS.primary,
		backgroundColor: "#F0F7FF",
	},
	heroBadgeRow: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		backgroundColor: COLORS.primary,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
		marginBottom: 8,
	},
	heroBadgeText: {
		fontSize: 10,
		fontFamily: FONTS.bold,
		color: COLORS.white,
		marginLeft: 4,
		letterSpacing: 0.5,
	},

	// Archiwum minionych wydarzeń
	archiveSection: {
		marginTop: 16,
		marginBottom: 24,
	},
	archiveHeaderToggle: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F8FAFC",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E2E8F0",
		marginBottom: 12,
	},
	archiveHeaderText: {
		flex: 1,
		fontSize: 13,
		fontFamily: FONTS.semiBold,
		color: COLORS.textLight,
		marginLeft: 10,
	},
	pastCard: {
		opacity: 0.75,
		backgroundColor: "#F8FAFC",
		borderLeftColor: "#94A3B8",
	},
});
