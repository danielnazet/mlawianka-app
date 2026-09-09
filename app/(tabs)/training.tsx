import React, { useState, useEffect, useRef, useMemo } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	ImageBackground,
	TouchableOpacity,
	Alert,
	Animated,
	FlatList,
	Dimensions,
} from "react-native";
import {
	Card,
	Title,
	Paragraph,
	Text,
	Button,
	Portal,
	Dialog,
	TextInput,
	RadioButton,
} from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { Team, Training, Match } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CALENDAR_PADDING = 12;
const DAY_GAP = 6;
// 5 dni widocznych na ekranie (2 po lewej, obecny na środku, 2 po prawej)
const DAY_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING * 2 - 4 * DAY_GAP) / 5);
const DAY_TOTAL_ITEM_WIDTH = DAY_ITEM_WIDTH + DAY_GAP;

const VIEW_OPTIONS = [
	{
		id: "day",
		label: "Wybrany dzień",
		sublabel: "Wydarzenia z kalendarza",
		icon: "calendar-today",
	},
	{
		id: "trainings",
		label: "Wszystkie treningi",
		sublabel: "Pełny harmonogram",
		icon: "soccer",
	},
	{
		id: "matches",
		label: "Wszystkie mecze",
		sublabel: "Terminarz i wyniki",
		icon: "trophy-outline",
	},
];

export default function TrainingScreen() {
	const { user, profile } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("day"); // "day" | "trainings" | "matches"
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [matches, setMatches] = useState<Match[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Dzisiejsza data jako klucz YYYY-MM-DD
	const todayDateKey = useMemo(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}, []);

	// Wybrany dzień na kalendarzu (domyślnie Dzisiaj)
	const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);

	// Stan formularza wydarzenia
	const [dialogVisible, setDialogVisible] = useState(false);
	const [formTeamModalVisible, setFormTeamModalVisible] = useState(false);
	const [locationModalVisible, setLocationModalVisible] = useState(false);
	const [isMatchDatePickerVisible, setMatchDatePickerVisible] = useState(false);
	const [isTrainingDatePickerVisible, setTrainingDatePickerVisible] = useState(false);
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
	const [formDate, setFormDate] = useState("");
	const [formResult, setFormResult] = useState("");
	const [formError, setFormError] = useState("");
	const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
	const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
	const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
	const [hourDropdownOpen, setHourDropdownOpen] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);

	const isCoachOrAdmin = profile?.role === "admin" || profile?.role === "coach";

	const calendarListRef = useRef<FlatList>(null);
	const fadeAnim = useState(new Animated.Value(1))[0];
	const slideAnim = useState(new Animated.Value(0))[0];

	// Generowanie dni kalendarza (-14 do +45)
	const calendarDays = useMemo(() => {
		const days = [];
		const base = new Date();
		base.setHours(0, 0, 0, 0);

		const dayNamesShort = ["ND", "PN", "WT", "ŚR", "CZ", "PT", "SO"];
		const dayNamesFull = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
		const monthNames = [
			"stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
			"lipca", "sierpnia", "września", "października", "listopada", "grudnia"
		];
		const monthNamesNom = [
			"Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
			"Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
		];

		for (let i = -14; i <= 45; i++) {
			const d = new Date(base);
			d.setDate(base.getDate() + i);

			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const dayNum = String(d.getDate()).padStart(2, "0");
			const key = `${y}-${m}-${dayNum}`;

			days.push({
				date: d,
				dateKey: key,
				dayOfWeekShort: dayNamesShort[d.getDay()],
				dayOfWeekFull: dayNamesFull[d.getDay()],
				dayNumber: d.getDate(),
				monthName: monthNames[d.getMonth()],
				monthNameNom: monthNamesNom[d.getMonth()],
				year: y,
				isToday: i === 0,
				index: i + 14,
			});
		}
		return days;
	}, []);

	const selectedDayInfo = useMemo(() => {
		return calendarDays.find((d) => d.dateKey === selectedDateKey) || calendarDays[14];
	}, [calendarDays, selectedDateKey]);

	const handleTabChange = (newTab: string) => {
		if (newTab === activeTab) return;
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: -6,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start(() => {
			setActiveTab(newTab);
			slideAnim.setValue(8);
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 150,
					useNativeDriver: true,
				}),
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

	// Drużyny, którymi dany użytkownik zarządza (dla Admina wszystkie, dla Trenera tylko te, w których jest przypisany)
	const managedTeams = useMemo(() => {
		if (profile?.role === "admin") {
			return teams;
		}
		if (profile?.role === "coach") {
			return teams.filter(
				(t) => t.coach_id === user?.id || t.id === profile?.team_id
			);
		}
		return [];
	}, [teams, profile, user]);

	// Sprawdzenie czy trener/admin może zarządzać danym wydarzeniem (treningiem lub meczem)
	const canManageEvent = (teamId: number | null) => {
		if (profile?.role === "admin") return true;
		if (profile?.role === "coach") {
			if (!teamId) return false;
			return managedTeams.some((t) => t.id === teamId);
		}
		return false;
	};

	const fetchData = async () => {
		try {
			await fetchTeams();

			if (!user || profile?.role === "fan") {
				const { data: allTeams } = await supabase.from("teams").select("id, name");
				const seniorTeam =
					(allTeams || []).find((t) => {
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

				const { data: allTeams } = await supabase.from("teams").select("id, name");
				const seniorTeam =
					(allTeams || []).find((t) => {
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

	useEffect(() => {
		if (!loading && calendarListRef.current) {
			setTimeout(() => {
				const todayIndex = 14;
				calendarListRef.current?.scrollToIndex({
					index: Math.max(0, todayIndex - 2),
					animated: true,
				});
			}, 300);
		}
	}, [loading]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	const getEventDateKey = (event: any, type: "training" | "match"): string | null => {
		if (type === "match" && event.match_date) {
			const d = new Date(event.match_date);
			if (!isNaN(d.getTime())) {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				return `${y}-${m}-${day}`;
			}
		}
		if (type === "training" && event.time) {
			const iso = event.time.match(/(\d{4})-(\d{2})-(\d{2})/);
			if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

			const dot = event.time.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
			if (dot) {
				const day = String(dot[1]).padStart(2, "0");
				const mo = String(dot[2]).padStart(2, "0");
				return `${dot[3]}-${mo}-${day}`;
			}

			const polishMonths: Record<string, string> = {
				stycz: "01", lut: "02", mar: "03", kwie: "04", maj: "05", czerw: "06",
				lip: "07", sierp: "08", wrzes: "09", wrześ: "09", paźdz: "10", pazdz: "10",
				list: "11", grud: "12"
			};
			const textMatch = event.time.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{4}))?/i);
			if (textMatch) {
				const day = String(textMatch[1]).padStart(2, "0");
				const monthStr = textMatch[2].toLowerCase();
				const yr = textMatch[3] || String(new Date().getFullYear());
				for (const [prefix, moNum] of Object.entries(polishMonths)) {
					if (monthStr.startsWith(prefix)) {
						return `${yr}-${moNum}-${day}`;
					}
				}
			}
		}
		return null;
	};

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

	const selectedDayTrainings = useMemo(() => {
		return trainings.filter((t) => getEventDateKey(t, "training") === selectedDateKey);
	}, [trainings, selectedDateKey]);

	const selectedDayMatches = useMemo(() => {
		return matches.filter((m) => getEventDateKey(m, "match") === selectedDateKey);
	}, [matches, selectedDateKey]);

	const totalEventsOnSelectedDay = selectedDayTrainings.length + selectedDayMatches.length;

	const hasTrainingsOnDate = (dateKey: string) => {
		return trainings.some((t) => getEventDateKey(t, "training") === dateKey);
	};

	const hasMatchesOnDate = (dateKey: string) => {
		return matches.some((m) => getEventDateKey(m, "match") === dateKey);
	};

	const handleSelectDate = (dateKey: string, index: number) => {
		setSelectedDateKey(dateKey);
		calendarListRef.current?.scrollToIndex({
			index: Math.max(0, index - 2),
			animated: true,
		});
	};

	const handleJumpToToday = () => {
		setSelectedDateKey(todayDateKey);
		const todayIndex = 14;
		calendarListRef.current?.scrollToIndex({
			index: Math.max(0, todayIndex - 2),
			animated: true,
		});
	};

	const handleShiftWeek = (direction: "prev" | "next") => {
		const currentIndex = calendarDays.findIndex((d) => d.dateKey === selectedDateKey);
		const targetIndex = direction === "next" ? Math.min(calendarDays.length - 1, currentIndex + 7) : Math.max(0, currentIndex - 7);
		const targetDay = calendarDays[targetIndex];
		if (targetDay) {
			setSelectedDateKey(targetDay.dateKey);
			calendarListRef.current?.scrollToIndex({
				index: Math.max(0, targetIndex - 2),
				animated: true,
			});
		}
	};

	const CLUB_LOCATIONS = [
		{
			id: "stadion",
			name: "Stadion Miejski w Strzegowie",
			address: "Stadion Miejski, ul. Sportowa 4",
			icon: "stadium",
		},
		{
			id: "orlik_1",
			name: "Orlik nr 1 przy SP",
			address: "Orlik nr 1 przy SP, ul. Wojska Polskiego 1",
			icon: "soccer-field",
		},
		{
			id: "orlik_2",
			name: "Orlik Gminny (Parkowa)",
			address: "Orlik Gminny, ul. Parkowa 2",
			icon: "soccer-field",
		},
		{
			id: "hala",
			name: "Hala Sportowa przy SP",
			address: "Hala Sportowa, ul. Wojska Polskiego 1",
			icon: "stadium-variant",
		},
		{
			id: "wyjazd",
			name: "Mecz wyjazdowy / Inny adres",
			address: "",
			icon: "map-marker-outline",
		},
	];

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

	const formatMinutes = (date: Date) => {
		const minutes = date.getMinutes();
		return minutes < 15 || minutes >= 45 ? "00" : "30";
	};

	const openAddDialog = () => {
		if (profile?.role === "coach" && managedTeams.length === 0) {
			Alert.alert(
				"Brak przypisanej drużyny",
				"Nie jesteś przypisany jako trener do żadnej drużyny. Skontaktuj się z administratorem, aby przypisał Cię do zespołu."
			);
			return;
		}

		setEditEventId(null);
		setEventType("training");
		const coachName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
		const defaultTeamId = managedTeams[0]?.id?.toString() || (teams[0]?.id?.toString() || "");
		const teamObj = teams.find(t => t.id.toString() === defaultTeamId);
		setFormTitle(teamObj ? `Trening ${teamObj.name}` : "Trening piłkarski");
		setFormDescription("");
		setFormCoach(coachName);

		const dayInfo = selectedDayInfo || calendarDays[14];
		setFormTime(`${dayInfo.dayOfWeekFull}, ${dayInfo.dayNumber} ${dayInfo.monthName} 17:00`);
		setFormLocation(CLUB_LOCATIONS[1].address);
		setFormMaxCapacity("15");
		setFormTeamId(defaultTeamId);
		setFormOpponent("");
		setFormDate(`${selectedDateKey} 17:00`);
		setFormResult("");
		setFormError("");
		setDialogVisible(true);
	};

	const openEditDialog = (event: any, type: "training" | "match") => {
		if (!canManageEvent(event.team_id)) {
			Alert.alert("Brak uprawnień", "Możesz edytować tylko wydarzenia swoich drużyn.");
			return;
		}

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

	const handleAddOrEditEvent = async () => {
		if (!formTeamId) {
			setFormError("Proszę wybrać zespół.");
			return;
		}

		const selectedTeamIdNum = parseInt(formTeamId);
		if (profile?.role === "coach" && !managedTeams.some((t) => t.id === selectedTeamIdNum)) {
			setFormError("Możesz dodawać wydarzenia tylko dla swojej drużyny.");
			return;
		}

		setActionLoading(true);
		setFormError("");

		try {
			if (editEventId !== null) {
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
				if (eventType === "training") {
					if (!formTitle || !formLocation) {
						throw new Error("Proszę wypełnić Tytuł oraz Miejsce");
					}
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
		} finally {
			setActionLoading(false);
		}
	};

	const confirmDeleteEvent = (event: any, type: "training" | "match") => {
		if (!canManageEvent(event.team_id)) {
			Alert.alert("Brak uprawnień", "Możesz usuwać tylko wydarzenia swoich drużyn.");
			return;
		}

		Alert.alert(
			"Usuwanie wydarzenia",
			"Czy na pewno chcesz usunąć to wydarzenie z terminarza?",
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: async () => {
						try {
							const table = type === "training" ? "trainings" : "matches";
							const { error } = await supabase.from(table).delete().eq("id", event.id);
							if (error) throw error;
							fetchData();
						} catch (err) {
							console.error("Error deleting event:", err);
							Alert.alert("Błąd", "Nie udało się usunąć wydarzenia");
						}
					},
				},
			]
		);
	};

	const getTeamName = (teamId: number | null) => {
		if (!teamId) return "Wszystkie grupy";
		const team = teams.find((t) => t.id === teamId);
		return team ? team.name : `Grupa #${teamId}`;
	};

	const formatMatchDateTime = (dateString: string) => {
		if (!dateString) return "";
		const d = new Date(dateString);
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const hours = String(d.getHours()).padStart(2, "0");
		const mins = String(d.getMinutes()).padStart(2, "0");
		return `${day}.${month}, ${hours}:${mins}`;
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	const renderTrainingCard = (training: Training) => {
		let swipeableRef: Swipeable | null = null;
		const canManage = isCoachOrAdmin && canManageEvent(training.team_id);

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
						confirmDeleteEvent(training, "training");
					}}
				>
					<MaterialIcons name="delete" size={22} color={COLORS.white} />
					<Text style={styles.swipeActionText}>Usuń</Text>
				</TouchableOpacity>
			</View>
		);

		const card = (
			<Card style={styles.eventCard}>
				<Card.Content style={styles.cardContent}>
					<View style={styles.eventTopRow}>
						<View style={styles.timeTag}>
							<MaterialCommunityIcons name="clock-outline" size={15} color={COLORS.primary} />
							<Text style={styles.timeTagText}>{training.time}</Text>
						</View>
						<View style={styles.teamTag}>
							<Text style={styles.teamTagText} numberOfLines={1}>{getTeamName(training.team_id)}</Text>
						</View>
					</View>

					<Text style={styles.eventTitle}>{training.title}</Text>

					<View style={styles.eventBottomRow}>
						<View style={styles.metaChip}>
							<MaterialCommunityIcons name="map-marker-outline" size={15} color={COLORS.textLight} />
							<Text style={styles.metaChipText} numberOfLines={1}>
								{training.location.replace(", 06-540 Strzegowo", "")}
							</Text>
						</View>

						<View style={styles.metaChip}>
							<MaterialCommunityIcons name="account-tie" size={15} color={COLORS.textLight} />
							<Text style={styles.metaChipText}>{training.coach}</Text>
						</View>
					</View>
				</Card.Content>
			</Card>
		);

		if (canManage) {
			return (
				<Swipeable
					key={`tr-${training.id}`}
					ref={(ref) => {
						swipeableRef = ref;
					}}
					renderRightActions={renderRightActions}
					friction={2}
					overshootRight={false}
				>
					{card}
				</Swipeable>
			);
		}
		return <View key={`tr-${training.id}`}>{card}</View>;
	};

	const renderMatchCard = (match: Match) => {
		let swipeableRef: Swipeable | null = null;
		const canManage = isCoachOrAdmin && canManageEvent(match.team_id);

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
						confirmDeleteEvent(match, "match");
					}}
				>
					<MaterialIcons name="delete" size={22} color={COLORS.white} />
					<Text style={styles.swipeActionText}>Usuń</Text>
				</TouchableOpacity>
			</View>
		);

		const card = (
			<Card style={[styles.eventCard, styles.matchCard]}>
				<Card.Content style={styles.cardContent}>
					<View style={styles.eventTopRow}>
						<View style={styles.matchTag}>
							<MaterialCommunityIcons name="trophy-outline" size={15} color="#d97706" />
							<Text style={styles.matchTagText}>MECZ LIGOWY</Text>
						</View>
						<View style={styles.teamTag}>
							<Text style={styles.teamTagText} numberOfLines={1}>{getTeamName(match.team_id)}</Text>
						</View>
					</View>

					<View style={styles.matchVsRow}>
						<Text style={styles.homeTeamText}>GKS Strzegowo</Text>
						<View style={styles.vsBadge}>
							<Text style={styles.vsBadgeText}>VS</Text>
						</View>
						<Text style={styles.awayTeamText}>{match.opponent}</Text>
					</View>

					{match.result ? (
						<View style={styles.resultPill}>
							<Text style={styles.resultPillText}>Wynik: {match.result}</Text>
						</View>
					) : null}

					<View style={styles.eventBottomRow}>
						<View style={styles.metaChip}>
							<MaterialCommunityIcons name="calendar-clock" size={15} color={COLORS.textLight} />
							<Text style={styles.metaChipText}>{formatMatchDateTime(match.match_date)}</Text>
						</View>

						<View style={styles.metaChip}>
							<MaterialCommunityIcons name="map-marker-outline" size={15} color={COLORS.textLight} />
							<Text style={styles.metaChipText} numberOfLines={1}>
								{match.location.replace(", 06-540 Strzegowo", "")}
							</Text>
						</View>
					</View>
				</Card.Content>
			</Card>
		);

		if (canManage) {
			return (
				<Swipeable
					key={`mt-${match.id}`}
					ref={(ref) => {
						swipeableRef = ref;
					}}
					renderRightActions={renderRightActions}
					friction={2}
					overshootRight={false}
				>
					{card}
				</Swipeable>
			);
		}
		return <View key={`mt-${match.id}`}>{card}</View>;
	};

	return (
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			{/* Kalendarz Dni (Date Carousel) */}
			<View style={styles.calendarHeaderContainer}>
				<View style={styles.monthHeaderRow}>
					<View style={styles.monthTitleWrapper}>
						<MaterialCommunityIcons name="calendar-month" size={22} color={COLORS.primary} />
						<Text style={styles.monthTitleText}>
							{selectedDayInfo.monthNameNom} {selectedDayInfo.year}
						</Text>
					</View>

					<View style={styles.monthNavButtons}>
						<TouchableOpacity
							activeOpacity={0.7}
							style={styles.monthNavBtn}
							onPress={() => handleShiftWeek("prev")}
						>
							<MaterialIcons name="chevron-left" size={24} color={COLORS.textDark} />
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.7}
							style={styles.todayQuickBtn}
							onPress={handleJumpToToday}
						>
							<Text style={styles.todayQuickBtnText}>Dziś</Text>
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.7}
							style={styles.monthNavBtn}
							onPress={() => handleShiftWeek("next")}
						>
							<MaterialIcons name="chevron-right" size={24} color={COLORS.textDark} />
						</TouchableOpacity>
					</View>
				</View>

				<FlatList
					ref={calendarListRef}
					data={calendarDays}
					keyExtractor={(item) => item.dateKey}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.calendarListContent}
					getItemLayout={(_, index) => ({
						length: DAY_TOTAL_ITEM_WIDTH,
						offset: DAY_TOTAL_ITEM_WIDTH * index,
						index,
					})}
					renderItem={({ item, index }) => {
						const isSelected = item.dateKey === selectedDateKey;
						const hasTraining = hasTrainingsOnDate(item.dateKey);
						const hasMatch = hasMatchesOnDate(item.dateKey);

						return (
							<TouchableOpacity
								activeOpacity={0.8}
								onPress={() => handleSelectDate(item.dateKey, index)}
								style={[
									styles.dayItem,
									isSelected && styles.dayItemActive,
									item.isToday && !isSelected && styles.dayItemToday,
								]}
							>
								<Text
									style={[
										styles.dayOfWeekText,
										isSelected ? styles.dayOfWeekTextActive : styles.dayOfWeekTextInactive,
									]}
								>
									{item.dayOfWeekShort}
								</Text>

								<Text
									style={[
										styles.dayNumberText,
										isSelected ? styles.dayNumberTextActive : styles.dayNumberTextInactive,
									]}
								>
									{item.dayNumber}
								</Text>

								<View style={styles.dotsRow}>
									{hasTraining && (
										<View
											style={[
												styles.eventDot,
												isSelected ? styles.trainingDotActive : styles.trainingDot,
											]}
										/>
									)}
									{hasMatch && (
										<View
											style={[
												styles.eventDot,
												isSelected ? styles.matchDotActive : styles.matchDot,
											]}
										/>
									)}
								</View>
							</TouchableOpacity>
						);
					}}
				/>
			</View>

			{/* SZYBKI PRZEŁĄCZNIK WIDOKÓW (DZIEŃ / TRENINGI / MECZE) */}
			<View style={styles.viewModeContainer}>
				<View style={styles.quickTabsRow}>
					{VIEW_OPTIONS.map((tab) => {
						const isActive = activeTab === tab.id;
						const count =
							tab.id === "trainings"
								? ` (${trainings.length})`
								: tab.id === "matches"
									? ` (${matches.length})`
									: "";

						return (
							<TouchableOpacity
								key={tab.id}
								activeOpacity={0.85}
								onPress={() => handleTabChange(tab.id)}
								style={[styles.quickTabBtn, isActive && styles.quickTabBtnActive]}
							>
								<MaterialCommunityIcons
									name={tab.icon as any}
									size={18}
									color={isActive ? COLORS.white : COLORS.textDark}
									style={{ marginRight: 4 }}
								/>
								<Text
									style={[styles.quickTabBtnText, isActive && styles.quickTabBtnTextActive]}
									numberOfLines={1}
								>
									{tab.id === "day" ? "Dzień" : tab.id === "trainings" ? "Treningi" : "Mecze"}
									{count}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

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
					keyboardShouldPersistTaps="handled"
				>
					{/* DUŻY, WYGODNY PRZYCISK DLA TRENERÓW / ADMINA */}
					{isCoachOrAdmin && (
						<TouchableOpacity
							activeOpacity={0.85}
							onPress={openAddDialog}
							style={styles.heroAddButton}
						>
							<MaterialIcons name="add-circle" size={24} color={COLORS.white} style={{ marginRight: 8 }} />
							<Text style={styles.heroAddButtonText}>Dodaj trening lub mecz</Text>
						</TouchableOpacity>
					)}

					{/* 1. WIDOK WYBRANEGO DNIA */}
					{activeTab === "day" && (
						<View>
							<View style={styles.daySummaryHeader}>
								<Text style={styles.daySummaryTitle}>
									{selectedDayInfo.dayOfWeekFull}, {selectedDayInfo.dayNumber} {selectedDayInfo.monthName}
								</Text>
								<Text style={styles.daySummarySubtitle}>
									{totalEventsOnSelectedDay === 0
										? "Brak zaplanowanych wydarzeń"
										: `${totalEventsOnSelectedDay} zaplanowane wydarzenia`}
								</Text>
							</View>

							{totalEventsOnSelectedDay === 0 ? (
								<Card style={styles.emptyCard}>
									<Card.Content style={styles.emptyContent}>
										<MaterialCommunityIcons
											name="calendar-blank-outline"
											size={48}
											color={COLORS.textLight}
											style={{ marginBottom: 10 }}
										/>
										<Text style={styles.emptyTitle}>Brak wydarzeń w tym dniu</Text>
										<Text style={styles.emptySubtext}>
											Wybierz inny dzień z kalendarza lub sprawdź pełną listę treningów i meczów.
										</Text>
										{isCoachOrAdmin && (
											<Button
												mode="outlined"
												icon="plus"
												onPress={openAddDialog}
												style={{ marginTop: 12, borderRadius: 10 }}
												textColor={COLORS.primary}
											>
												Zaplanuj trening na ten dzień
											</Button>
										)}
									</Card.Content>
								</Card>
							) : (
								<View>
									{selectedDayMatches.map((m) => renderMatchCard(m))}
									{selectedDayTrainings.map((t) => renderTrainingCard(t))}
								</View>
							)}
						</View>
					)}

					{/* 2. WIDOK WSZYSTKICH TRENINGÓW */}
					{activeTab === "trainings" && (() => {
						const { upcoming, past } = processEvents(trainings, "training");
						if (upcoming.length === 0 && past.length === 0) {
							return (
								<Card style={styles.emptyCard}>
									<Card.Content style={styles.emptyContent}>
										<Text style={styles.emptyTitle}>Brak zaplanowanych treningów</Text>
									</Card.Content>
								</Card>
							);
						}

						return (
							<View>
								<Text style={styles.sectionHeaderTitle}>Nadchodzące treningi ({upcoming.length})</Text>
								{upcoming.map((u) => renderTrainingCard(u.event))}

								{past.length > 0 && (
									<View style={{ marginTop: 16 }}>
										<TouchableOpacity
											activeOpacity={0.7}
											onPress={() => setShowPastTrainings(!showPastTrainings)}
											style={styles.pastToggleBtn}
										>
											<Text style={styles.pastToggleText}>
												{showPastTrainings ? "Ukryj minione treningi" : `Pokaż minione treningi (${past.length})`}
											</Text>
											<MaterialIcons
												name={showPastTrainings ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>
										{showPastTrainings && past.map((p) => renderTrainingCard(p.event))}
									</View>
								)}
							</View>
						);
					})()}

					{/* 3. WIDOK WSZYSTKICH MECZÓW */}
					{activeTab === "matches" && (() => {
						const { upcoming, past } = processEvents(matches, "match");
						if (upcoming.length === 0 && past.length === 0) {
							return (
								<Card style={styles.emptyCard}>
									<Card.Content style={styles.emptyContent}>
										<Text style={styles.emptyTitle}>Brak zaplanowanych meczów</Text>
									</Card.Content>
								</Card>
							);
						}

						return (
							<View>
								<Text style={styles.sectionHeaderTitle}>Nadchodzące mecze ({upcoming.length})</Text>
								{upcoming.map((u) => renderMatchCard(u.event))}

								{past.length > 0 && (
									<View style={{ marginTop: 16 }}>
										<TouchableOpacity
											activeOpacity={0.7}
											onPress={() => setShowPastMatches(!showPastMatches)}
											style={styles.pastToggleBtn}
										>
											<Text style={styles.pastToggleText}>
												{showPastMatches ? "Ukryj minione mecze" : `Pokaż minione mecze (${past.length})`}
											</Text>
											<MaterialIcons
												name={showPastMatches ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>
										{showPastMatches && past.map((p) => renderMatchCard(p.event))}
									</View>
								)}
							</View>
						);
					})()}
				</ScrollView>
			</Animated.View>

			{/* Dialog Dodawania/Edycji Wydarzenia (Responsywne Drop Menu) */}
			<Portal>
				<Dialog
					visible={dialogVisible}
					onDismiss={() => setDialogVisible(false)}
					style={styles.responsiveDialog}
				>
					<View style={styles.dialogHeaderRow}>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
							<View style={styles.dialogHeaderIcon}>
								<MaterialCommunityIcons
									name={eventType === "training" ? "soccer" : "trophy-outline"}
									size={22}
									color={COLORS.primary}
								/>
							</View>
							<Text style={styles.dialogTitleText}>
								{editEventId !== null
									? (eventType === "training" ? "Edycja treningu" : "Edycja meczu")
									: "Nowe wydarzenie"}
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => setDialogVisible(false)}
							hitSlop={8}
							style={styles.dialogCloseBtn}
						>
							<MaterialIcons name="close" size={20} color={COLORS.textLight} />
						</TouchableOpacity>
					</View>

					<Dialog.ScrollArea style={styles.dialogScrollArea}>
						<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 12, gap: 14 }}>
							{formError ? (
								<View style={styles.errorBanner}>
									<MaterialIcons name="error-outline" size={20} color="#dc2626" />
									<Text style={styles.errorBannerText}>{formError}</Text>
								</View>
							) : null}

							{/* Przełącznik Trening / Mecz */}
							{editEventId === null && (
								<View style={styles.formTypeSwitchWrapper}>
									<TouchableOpacity
										activeOpacity={0.8}
										onPress={() => setEventType("training")}
										style={[styles.formTypeBtn, eventType === "training" && styles.formTypeBtnActive]}
									>
										<MaterialCommunityIcons
											name="soccer"
											size={18}
											color={eventType === "training" ? COLORS.white : COLORS.textLight}
											style={{ marginRight: 6 }}
										/>
										<Text style={[styles.formTypeBtnText, eventType === "training" && styles.formTypeBtnTextActive]}>
											Trening
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										activeOpacity={0.8}
										onPress={() => setEventType("match")}
										style={[styles.formTypeBtn, eventType === "match" && styles.formTypeBtnActive]}
									>
										<MaterialCommunityIcons
											name="trophy-outline"
											size={18}
											color={eventType === "match" ? COLORS.white : COLORS.textLight}
											style={{ marginRight: 6 }}
										/>
										<Text style={[styles.formTypeBtnText, eventType === "match" && styles.formTypeBtnTextActive]}>
											Mecz / sparing
										</Text>
									</TouchableOpacity>
								</View>
							)}

							{/* 1. DROP MENU: Wybór Drużyny */}
							<View style={styles.dropdownContainer}>
								<Text style={styles.fieldSectionLabel}>Drużyna / Grupa:</Text>
								{managedTeams.length <= 1 ? (
									<View style={[styles.dropdownHeader, { backgroundColor: "#f1f5f9" }]}>
										<MaterialCommunityIcons name="shield-account" size={20} color={COLORS.primary} />
										<View style={{ flex: 1 }}>
											<Text style={[styles.dropdownSelectedText, { color: COLORS.textDark }]}>
												{formTeamId ? getTeamName(parseInt(formTeamId)) : (managedTeams[0]?.name || "Brak przypisanego zespołu")}
											</Text>
											{profile?.role === "coach" && (
												<Text style={{ fontSize: 11, color: COLORS.textLight, fontFamily: FONTS.regular }}>
													Twój przypisany zespół
												</Text>
											)}
										</View>
										<MaterialCommunityIcons name="lock-outline" size={18} color={COLORS.textLight} />
									</View>
								) : (
									<>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setTeamDropdownOpen(!teamDropdownOpen);
												setTemplateDropdownOpen(false);
												setLocationDropdownOpen(false);
												setHourDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, teamDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="shield-outline" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText}>
													{formTeamId ? getTeamName(parseInt(formTeamId)) : "Wybierz zespół..."}
												</Text>
											</View>
											<MaterialIcons
												name={teamDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{teamDropdownOpen && (
											<View style={styles.dropdownBody}>
												{managedTeams.map((t) => {
													const isSelected = formTeamId === t.id.toString();
													return (
														<TouchableOpacity
															key={t.id}
															activeOpacity={0.8}
															onPress={() => {
																setFormTeamId(t.id.toString());
																setTeamDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="shield-outline"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive, { flex: 1 }]}>
																{t.name}
															</Text>
															{isSelected && (
																<MaterialIcons name="check" size={18} color={COLORS.primary} />
															)}
														</TouchableOpacity>
													);
												})}
											</View>
										)}
									</>
								)}
							</View>

							{eventType === "training" ? (
								<>
									{/* 2. DROP MENU: Szablon nazwy treningu */}
									<View style={styles.dropdownContainer}>
										<Text style={styles.fieldSectionLabel}>Szablon nazwy treningu:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setTemplateDropdownOpen(!templateDropdownOpen);
												setTeamDropdownOpen(false);
												setLocationDropdownOpen(false);
												setHourDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, templateDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="soccer" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText} numberOfLines={1}>
													{formTitle || "Wybierz szablon lub wpisz poniżej..."}
												</Text>
											</View>
											<MaterialIcons
												name={templateDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{templateDropdownOpen && (
											<View style={styles.dropdownBody}>
												{[
													"Trening techniczny",
													"Trening taktyczny",
													"Trening motoryczny",
													"Gry wewnętrzne",
													"Trening bramkarski",
													"Zajęcia ogólnorozwojowe",
												].map((tpl) => {
													const isSelected = formTitle === tpl;
													return (
														<TouchableOpacity
															key={tpl}
															activeOpacity={0.8}
															onPress={() => {
																setFormTitle(tpl);
																setTemplateDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="whistle-outline"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive, { flex: 1 }]}>
																{tpl}
															</Text>
															{isSelected && (
																<MaterialIcons name="check" size={18} color={COLORS.primary} />
															)}
														</TouchableOpacity>
													);
												})}
											</View>
										)}
									</View>

									<TextInput
										label="Nazwa treningu"
										value={formTitle}
										onChangeText={setFormTitle}
										mode="outlined"
										placeholder="np. Trening Techniczny"
										style={styles.input}
										outlineColor="#e2e8f0"
										activeOutlineColor={COLORS.primary}
										left={<TextInput.Icon icon="soccer" />}
									/>

									{/* 3. DROP MENU: Godzina treningu */}
									<View style={styles.dropdownContainer}>
										<Text style={styles.fieldSectionLabel}>Godzina treningu:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setHourDropdownOpen(!hourDropdownOpen);
												setTeamDropdownOpen(false);
												setTemplateDropdownOpen(false);
												setLocationDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, hourDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText}>
													{formTime ? formTime.split(" ").slice(-1)[0] : "17:00"}
												</Text>
											</View>
											<MaterialIcons
												name={hourDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{hourDropdownOpen && (
											<View style={styles.dropdownBody}>
												{["15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"].map((hour) => {
													const isSelected = formTime.includes(hour);
													return (
														<TouchableOpacity
															key={hour}
															activeOpacity={0.8}
															onPress={() => {
																const base = formTime
																	? formTime.replace(/\s\d{1,2}:\d{2}$/, "")
																	: `${selectedDayInfo.dayOfWeekFull}, ${selectedDayInfo.dayNumber} ${selectedDayInfo.monthName}`;
																setFormTime(`${base} ${hour}`);
																setHourDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="clock-time-four-outline"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive, { flex: 1 }]}>
																{hour}
															</Text>
															{isSelected && (
																<MaterialIcons name="check" size={18} color={COLORS.primary} />
															)}
														</TouchableOpacity>
													);
												})}
											</View>
										)}
									</View>

									{/* Pełny wybór terminu */}
									<TouchableOpacity
										activeOpacity={0.85}
										style={styles.dropdownHeader}
										onPress={() => setTrainingDatePickerVisible(true)}
									>
										<MaterialIcons name="event" size={20} color={COLORS.primary} />
										<View style={{ flex: 1 }}>
											<Text style={styles.dropdownSelectedText}>{formTime || "Wybierz datę i godzinę..."}</Text>
										</View>
										<MaterialIcons name="edit-calendar" size={20} color={COLORS.textLight} />
									</TouchableOpacity>

									<TextInput
										label="Trener prowadzący"
										value={formCoach}
										onChangeText={setFormCoach}
										mode="outlined"
										style={styles.input}
										outlineColor="#e2e8f0"
										activeOutlineColor={COLORS.primary}
										left={<TextInput.Icon icon="account-tie" />}
									/>
								</>
							) : (
								<>
									<TextInput
										label="Przeciwnik"
										value={formOpponent}
										onChangeText={setFormOpponent}
										mode="outlined"
										placeholder="np. Mławianka Mława"
										style={styles.input}
										outlineColor="#e2e8f0"
										activeOutlineColor={COLORS.primary}
										left={<TextInput.Icon icon="shield-sword-outline" />}
									/>

									<TouchableOpacity
										activeOpacity={0.85}
										style={styles.dropdownHeader}
										onPress={() => setMatchDatePickerVisible(true)}
									>
										<MaterialIcons name="event" size={20} color={COLORS.primary} />
										<View style={{ flex: 1 }}>
											<Text style={styles.dropdownSelectedText}>{formDate || "Wybierz termin meczu..."}</Text>
										</View>
										<MaterialIcons name="edit-calendar" size={20} color={COLORS.textLight} />
									</TouchableOpacity>

									{editEventId !== null && (
										<TextInput
											label="Wynik meczu (opcjonalnie)"
											value={formResult}
											onChangeText={setFormResult}
											mode="outlined"
											placeholder="np. 3:1"
											style={styles.input}
											outlineColor="#e2e8f0"
											activeOutlineColor={COLORS.primary}
										/>
									)}
								</>
							)}

							{/* 4. DROP MENU: Miejsce / Obiekt */}
							<View style={styles.dropdownContainer}>
								<Text style={styles.fieldSectionLabel}>Miejsce / Obiekt:</Text>
								<TouchableOpacity
									activeOpacity={0.85}
									onPress={() => {
										setLocationDropdownOpen(!locationDropdownOpen);
										setTeamDropdownOpen(false);
										setTemplateDropdownOpen(false);
										setHourDropdownOpen(false);
									}}
									style={[styles.dropdownHeader, locationDropdownOpen && styles.dropdownHeaderActive]}
								>
									<MaterialCommunityIcons name="stadium" size={20} color={COLORS.primary} />
									<View style={{ flex: 1 }}>
										<Text style={styles.dropdownSelectedText} numberOfLines={1}>
											{CLUB_LOCATIONS.find((l) => l.address === formLocation || (!l.address && formLocation === "Mecz wyjazdowy"))?.name || formLocation || "Wybierz obiekt..."}
										</Text>
									</View>
									<MaterialIcons
										name={locationDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
										size={22}
										color={COLORS.textLight}
									/>
								</TouchableOpacity>

								{locationDropdownOpen && (
									<View style={styles.dropdownBody}>
										{CLUB_LOCATIONS.map((loc) => {
											const isSelected = formLocation === (loc.address || "Mecz wyjazdowy");
											return (
												<TouchableOpacity
													key={loc.id}
													activeOpacity={0.8}
													onPress={() => {
														setFormLocation(loc.address || "Mecz wyjazdowy");
														setLocationDropdownOpen(false);
													}}
													style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
												>
													<MaterialCommunityIcons
														name={loc.icon as any}
														size={18}
														color={isSelected ? COLORS.primary : COLORS.textLight}
													/>
													<View style={{ flex: 1 }}>
														<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive]}>
															{loc.name}
														</Text>
														{loc.address ? (
															<Text style={styles.dropdownOptionSubtitle}>{loc.address}</Text>
														) : null}
													</View>
													{isSelected && (
														<MaterialIcons name="check" size={18} color={COLORS.primary} />
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								)}
							</View>
						</ScrollView>
					</Dialog.ScrollArea>

					<View style={styles.modalActionRow}>
						<TouchableOpacity
							activeOpacity={0.75}
							onPress={() => setDialogVisible(false)}
							style={styles.modalCancelBtn}
						>
							<Text style={styles.modalCancelBtnText}>Anuluj</Text>
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.85}
							onPress={handleAddOrEditEvent}
							disabled={actionLoading}
							style={styles.modalSubmitBtn}
						>
							{actionLoading ? (
								<ActivityIndicator size="small" color={COLORS.white} />
							) : (
								<View style={styles.modalSubmitContent}>
									<MaterialCommunityIcons
										name={editEventId !== null ? "check-circle" : (eventType === "training" ? "soccer" : "trophy-outline")}
										size={20}
										color={COLORS.white}
									/>
									<Text style={styles.modalSubmitBtnText}>
										{editEventId !== null
											? "Zapisz zmiany"
											: eventType === "training"
												? "Dodaj do terminarza"
												: "Zapisz mecz"}
									</Text>
								</View>
							)}
						</TouchableOpacity>
					</View>
				</Dialog>
			</Portal>

			{/* Date Pickers */}
			<DateTimePickerModal
				isVisible={isMatchDatePickerVisible}
				mode="datetime"
				onConfirm={(date) => {
					setMatchDatePickerVisible(false);
					const y = date.getFullYear();
					const m = String(date.getMonth() + 1).padStart(2, "0");
					const d = String(date.getDate()).padStart(2, "0");
					const h = String(date.getHours()).padStart(2, "0");
					const min = formatMinutes(date);
					setFormDate(`${y}-${m}-${d} ${h}:${min}`);
				}}
				onCancel={() => setMatchDatePickerVisible(false)}
				locale="pl_PL"
			/>

			<DateTimePickerModal
				isVisible={isTrainingDatePickerVisible}
				mode="datetime"
				onConfirm={(date) => {
					setTrainingDatePickerVisible(false);
					const dayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
					const monthNames = [
						"stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
						"lipca", "sierpnia", "września", "października", "listopada", "grudnia"
					];
					const dayName = dayNames[date.getDay()];
					const day = date.getDate();
					const monthName = monthNames[date.getMonth()];
					const h = String(date.getHours()).padStart(2, "0");
					const min = formatMinutes(date);
					setFormTime(`${dayName}, ${day} ${monthName} ${h}:${min}`);
				}}
				onCancel={() => setTrainingDatePickerVisible(false)}
				locale="pl_PL"
			/>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	backgroundImageStyle: {
		opacity: 0.04,
		resizeMode: "cover",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
	},
	calendarHeaderContainer: {
		backgroundColor: COLORS.white,
		paddingTop: 10,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	monthHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	monthTitleWrapper: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	monthTitleText: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		color: COLORS.textDark,
	},
	monthNavButtons: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	monthNavBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#f8fafc",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	todayQuickBtn: {
		backgroundColor: "#eff6ff",
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#bfdbfe",
	},
	todayQuickBtnText: {
		fontFamily: FONTS.bold,
		fontSize: 12,
		color: COLORS.primary,
	},
	calendarListContent: {
		paddingHorizontal: CALENDAR_PADDING,
		gap: DAY_GAP,
	},
	dayItem: {
		width: DAY_ITEM_WIDTH,
		height: 70,
		borderRadius: 14,
		backgroundColor: "#f8fafc",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	dayItemActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primaryDark,
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
	},
	dayItemToday: {
		borderColor: COLORS.primary,
		borderWidth: 1.5,
		backgroundColor: "#eff6ff",
	},
	dayOfWeekText: {
		fontFamily: FONTS.semiBold,
		fontSize: 11,
		marginBottom: 2,
	},
	dayOfWeekTextActive: {
		color: "rgba(255,255,255,0.85)",
	},
	dayOfWeekTextInactive: {
		color: COLORS.textLight,
	},
	dayNumberText: {
		fontFamily: FONTS.extraBold,
		fontSize: 18,
		lineHeight: 22,
	},
	dayNumberTextActive: {
		color: COLORS.white,
	},
	dayNumberTextInactive: {
		color: COLORS.textDark,
	},
	dotsRow: {
		flexDirection: "row",
		marginTop: 3,
		gap: 3,
		height: 5,
		alignItems: "center",
	},
	eventDot: {
		width: 4.5,
		height: 4.5,
		borderRadius: 2.25,
	},
	trainingDot: {
		backgroundColor: COLORS.primary,
	},
	trainingDotActive: {
		backgroundColor: COLORS.white,
	},
	matchDot: {
		backgroundColor: "#f59e0b",
	},
	matchDotActive: {
		backgroundColor: "#fbbf24",
	},
	viewModeContainer: {
		backgroundColor: COLORS.white,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	quickTabsRow: {
		flexDirection: "row",
		gap: 8,
	},
	quickTabBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	quickTabBtnActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primaryDark,
	},
	quickTabBtnText: {
		fontFamily: FONTS.semiBold,
		fontSize: 12.5,
		color: COLORS.textDark,
	},
	quickTabBtnTextActive: {
		color: COLORS.white,
		fontFamily: FONTS.bold,
	},
	scrollContainer: {
		padding: 16,
		paddingTop: 12,
		paddingBottom: 40,
	},
	heroAddButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.primary,
		borderRadius: 14,
		paddingVertical: 14,
		marginBottom: 16,
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
	},
	heroAddButtonText: {
		fontFamily: FONTS.bold,
		fontSize: 15,
		color: COLORS.white,
	},
	daySummaryHeader: {
		marginBottom: 12,
	},
	daySummaryTitle: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		color: COLORS.textDark,
	},
	daySummarySubtitle: {
		fontFamily: FONTS.regular,
		fontSize: 12.5,
		color: COLORS.textLight,
		marginTop: 1,
	},
	sectionHeaderTitle: {
		fontFamily: FONTS.bold,
		fontSize: 15.5,
		color: COLORS.textDark,
		marginBottom: 10,
	},
	eventCard: {
		backgroundColor: COLORS.white,
		borderRadius: 14,
		marginBottom: 10,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	matchCard: {
		borderColor: "#fef3c7",
	},
	cardContent: {
		padding: 12,
	},
	eventTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	timeTag: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#eff6ff",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 4,
	},
	timeTagText: {
		fontFamily: FONTS.bold,
		fontSize: 12.5,
		color: COLORS.primary,
	},
	matchTag: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fef3c7",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 4,
	},
	matchTagText: {
		fontFamily: FONTS.bold,
		fontSize: 11,
		color: "#d97706",
		letterSpacing: 0.5,
	},
	teamTag: {
		backgroundColor: "#f8fafc",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		maxWidth: "45%",
	},
	teamTagText: {
		fontFamily: FONTS.medium,
		fontSize: 11.5,
		color: COLORS.textDark,
	},
	eventTitle: {
		fontFamily: FONTS.bold,
		fontSize: 15.5,
		color: COLORS.textDark,
		marginBottom: 8,
	},
	matchVsRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 4,
		marginBottom: 6,
	},
	homeTeamText: {
		fontFamily: FONTS.bold,
		fontSize: 14.5,
		color: COLORS.primary,
		flex: 1,
	},
	vsBadge: {
		backgroundColor: "#f1f5f9",
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 4,
		marginHorizontal: 6,
	},
	vsBadgeText: {
		fontFamily: FONTS.bold,
		fontSize: 10.5,
		color: COLORS.textLight,
	},
	awayTeamText: {
		fontFamily: FONTS.bold,
		fontSize: 14.5,
		color: COLORS.textDark,
		flex: 1,
		textAlign: "right",
	},
	resultPill: {
		backgroundColor: "#ecfdf5",
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 6,
		alignSelf: "center",
		marginBottom: 6,
	},
	resultPillText: {
		fontFamily: FONTS.bold,
		fontSize: 12.5,
		color: "#059669",
	},
	eventBottomRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: "#f8fafc",
	},
	metaChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		flex: 1,
	},
	metaChipText: {
		fontFamily: FONTS.regular,
		fontSize: 12,
		color: COLORS.textLight,
	},
	emptyCard: {
		backgroundColor: COLORS.white,
		borderRadius: 14,
		paddingVertical: 22,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	emptyContent: {
		alignItems: "center",
		paddingHorizontal: 16,
	},
	emptyTitle: {
		fontFamily: FONTS.bold,
		fontSize: 15.5,
		color: COLORS.textDark,
		marginBottom: 4,
	},
	emptySubtext: {
		fontFamily: FONTS.regular,
		fontSize: 13,
		color: COLORS.textLight,
		textAlign: "center",
		lineHeight: 18,
	},
	pastToggleBtn: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		padding: 12,
		borderRadius: 10,
		marginBottom: 10,
	},
	pastToggleText: {
		fontFamily: FONTS.medium,
		fontSize: 13,
		color: COLORS.textDark,
	},
	swipeActionsContainer: {
		flexDirection: "row",
		marginBottom: 10,
		borderRadius: 14,
		overflow: "hidden",
		marginLeft: 8,
	},
	swipeActionBtn: {
		justifyContent: "center",
		alignItems: "center",
		width: 70,
		paddingHorizontal: 6,
	},
	editActionBtn: {
		backgroundColor: "#2563eb",
	},
	deleteActionBtn: {
		backgroundColor: "#dc2626",
	},
	swipeActionText: {
		fontFamily: FONTS.semiBold,
		fontSize: 11,
		color: COLORS.white,
		marginTop: 2,
	},
	dialog: {
		backgroundColor: COLORS.white,
		borderRadius: 18,
		maxHeight: "85%",
	},
	dialogTitle: {
		fontFamily: FONTS.bold,
		fontSize: 17,
		color: COLORS.textDark,
	},
	dialogScrollArea: {
		paddingHorizontal: 18,
	},
	dialogActions: {
		paddingHorizontal: 16,
		paddingBottom: 10,
	},
	formTypeSwitchWrapper: {
		flexDirection: "row",
		backgroundColor: "#f1f5f9",
		borderRadius: 10,
		padding: 3,
		marginBottom: 12,
	},
	formTypeBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 9,
		borderRadius: 8,
	},
	formTypeBtnActive: {
		backgroundColor: COLORS.primary,
	},
	formTypeBtnText: {
		fontFamily: FONTS.semiBold,
		fontSize: 13,
		color: COLORS.textLight,
	},
	formTypeBtnTextActive: {
		color: COLORS.white,
	},
	fieldSectionLabel: {
		fontFamily: FONTS.semiBold,
		fontSize: 12.5,
		color: COLORS.textDark,
		marginBottom: 6,
	},
	quickTeamChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#cbd5e1",
		backgroundColor: "#f8fafc",
		gap: 6,
	},
	quickTeamChipActive: {
		borderColor: COLORS.primary,
		backgroundColor: COLORS.primary,
	},
	quickTeamChipText: {
		fontFamily: FONTS.semiBold,
		fontSize: 12,
		color: COLORS.textDark,
	},
	quickTeamChipTextActive: {
		color: COLORS.white,
	},
	quickTimeChip: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#cbd5e1",
		backgroundColor: "#f1f5f9",
	},
	quickTimeChipActive: {
		borderColor: COLORS.primary,
		backgroundColor: COLORS.primary,
	},
	quickTimeChipText: {
		fontFamily: FONTS.semiBold,
		fontSize: 12,
		color: COLORS.textDark,
	},
	quickTimeChipTextActive: {
		color: COLORS.white,
	},
	quickPurposeChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		backgroundColor: "#ffffff",
	},
	quickPurposeChipActive: {
		borderColor: COLORS.primary,
		backgroundColor: "#eff6ff",
	},
	quickPurposeChipText: {
		fontFamily: FONTS.medium,
		fontSize: 11.5,
		color: COLORS.textDark,
	},
	quickPurposeChipTextActive: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
	},
	quickLocationItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		backgroundColor: "#f8fafc",
		gap: 10,
	},
	quickLocationItemActive: {
		borderColor: COLORS.primary,
		backgroundColor: COLORS.primary,
	},
	quickLocationName: {
		fontFamily: FONTS.bold,
		fontSize: 12.5,
		color: COLORS.textDark,
	},
	quickLocationNameActive: {
		color: COLORS.white,
	},
	quickLocationAddress: {
		fontFamily: FONTS.regular,
		fontSize: 10.5,
		color: COLORS.textLight,
		marginTop: 1,
	},
	quickLocationAddressActive: {
		color: "rgba(255,255,255,0.85)",
	},
	responsiveDialog: {
		backgroundColor: COLORS.white,
		borderRadius: 22,
		maxHeight: "88%",
		marginHorizontal: 16,
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.18,
		shadowRadius: 14,
	},
	dialogHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 8,
	},
	dialogHeaderIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: "#eff6ff",
		justifyContent: "center",
		alignItems: "center",
	},
	dialogTitleText: {
		fontFamily: FONTS.bold,
		fontSize: 17,
		color: COLORS.textDark,
	},
	dialogCloseBtn: {
		padding: 6,
		borderRadius: 20,
		backgroundColor: "#f1f5f9",
	},
	errorBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		padding: 10,
		borderRadius: 10,
		backgroundColor: "#fee2e2",
		borderWidth: 1,
		borderColor: "#fca5a5",
	},
	errorBannerText: {
		fontFamily: FONTS.medium,
		fontSize: 12,
		color: "#b91c1c",
		flex: 1,
	},
	dropdownContainer: {
		marginBottom: 4,
	},
	dropdownHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "#e2e8f0",
		backgroundColor: "#f8fafc",
		gap: 10,
	},
	dropdownHeaderActive: {
		borderColor: COLORS.primary,
		backgroundColor: "#ffffff",
	},
	dropdownSelectedText: {
		fontFamily: FONTS.semiBold,
		fontSize: 13.5,
		color: COLORS.textDark,
	},
	dropdownBody: {
		marginTop: 6,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		backgroundColor: "#ffffff",
		padding: 6,
		gap: 4,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	dropdownOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		gap: 10,
	},
	dropdownOptionActive: {
		backgroundColor: "#eff6ff",
	},
	dropdownOptionTitle: {
		fontFamily: FONTS.semiBold,
		fontSize: 13,
		color: COLORS.textDark,
	},
	dropdownOptionTitleActive: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
	},
	dropdownOptionSubtitle: {
		fontFamily: FONTS.regular,
		fontSize: 11,
		color: COLORS.textLight,
		marginTop: 2,
	},
	modalActionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 18,
		paddingVertical: 14,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		backgroundColor: "#ffffff",
		borderBottomLeftRadius: 22,
		borderBottomRightRadius: 22,
	},
	modalCancelBtn: {
		flex: 1,
		height: 48,
		borderRadius: 14,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		justifyContent: "center",
		alignItems: "center",
	},
	modalCancelBtnText: {
		fontFamily: FONTS.semiBold,
		fontSize: 14,
		color: "#64748b",
	},
	modalSubmitBtn: {
		flex: 2,
		height: 48,
		borderRadius: 14,
		backgroundColor: COLORS.primary,
		justifyContent: "center",
		alignItems: "center",
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
	},
	modalSubmitContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	modalSubmitBtnText: {
		fontFamily: FONTS.bold,
		fontSize: 14,
		color: COLORS.white,
		letterSpacing: -0.1,
	},
	selectButton: {
		backgroundColor: "#f8fafc",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		borderRadius: 10,
		padding: 12,
		marginBottom: 10,
	},
	selectButtonLabel: {
		fontFamily: FONTS.regular,
		fontSize: 11.5,
		color: COLORS.textLight,
		marginBottom: 2,
	},
	selectButtonValue: {
		fontFamily: FONTS.semiBold,
		fontSize: 13.5,
		color: COLORS.textDark,
	},
	input: {
		backgroundColor: COLORS.white,
		fontSize: 13.5,
		fontFamily: FONTS.regular,
	},
	errorText: {
		fontFamily: FONTS.medium,
		fontSize: 12,
		color: "#dc2626",
		marginBottom: 8,
	},
});
