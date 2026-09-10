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
	FlatList,
	Dimensions,
	Image,
} from "react-native";
import {
	Card,
	Button,
	Text,
	Portal,
	Dialog,
	TextInput,
	Title,
	RadioButton,
	Avatar,
	Paragraph
} from "react-native-paper";


import { router } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { OrlikBooking, Training } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CALENDAR_PADDING = 12;
const DAY_GAP = 6;
// 5 dni widocznych na ekranie (2 po lewej, obecny na środku, 2 po prawej)
const DAY_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING * 2 - 4 * DAY_GAP) / 5);
const DAY_TOTAL_ITEM_WIDTH = DAY_ITEM_WIDTH + DAY_GAP;

export const ORLIK_PITCHES = [
	{
		id: "all",
		name: "Wszystkie boiska Orlik",
		shortName: "Wszystkie",
		address: "Strzegowo",
	},
	{
		id: "orlik_1",
		name: "Orlik nr 1 przy SP",
		shortName: "Orlik SP",
		address: "Orlik nr 1 przy SP, ul. Wojska Polskiego 1",
	},
	{
		id: "orlik_2",
		name: "Orlik Gminny (Parkowa)",
		shortName: "Orlik Parkowa",
		address: "Orlik Gminny, ul. Parkowa 2",
	},
];

type UnifiedOrlikSlot = {
	id: string;
	sourceId: number;
	sourceType: "booking" | "training";
	bookingDate: string; // YYYY-MM-DD
	startTime: string; // HH:MM
	endTime: string; // HH:MM
	title: string;
	bookerName: string;
	description?: string | null;
	pitchLocation: string;
	canManage: boolean;
};

export default function BookingScreen() {
	const { user, profile } = useAuth();
	const [orlikBookings, setOrlikBookings] = useState<OrlikBooking[]>([]);
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedPitchId, setSelectedPitchId] = useState<string>("all");

	// Dzisiejsza data jako klucz YYYY-MM-DD
	const todayDateKey = useMemo(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}, []);

	const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);

	// Stan formularza rezerwacji Orlika
	const [dialogVisible, setDialogVisible] = useState(false);
	const [authPromptModalVisible, setAuthPromptModalVisible] = useState(false);
	const [editOrlikBookingId, setEditOrlikBookingId] = useState<number | null>(null);
	const [formPitchLocation, setFormPitchLocation] = useState(ORLIK_PITCHES[1].address);
	const [formPitchModalVisible, setFormPitchModalVisible] = useState(false);
	const [bookingDate, setBookingDate] = useState("");
	const [startTime, setStartTime] = useState("17:00");
	const [endTime, setEndTime] = useState("18:30");
	const [bookingDesc, setBookingDesc] = useState("");
	const [bookingError, setBookingError] = useState("");
	const [bookingLoading, setBookingLoading] = useState(false);
	const [isDatePickerVisible, setDatePickerVisible] = useState(false);
	const [isStartTimePickerVisible, setStartTimePickerVisible] = useState(false);
	const [isEndTimePickerVisible, setEndTimePickerVisible] = useState(false);

	const calendarListRef = useRef<FlatList>(null);
	const isCoachOrAdmin = profile?.role === "admin" || profile?.role === "coach";

	// Generowanie dni kalendarza
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

	// Pobieranie rezerwacji oraz treningów
	const fetchData = async () => {
		try {
			const { data: bookingsData, error: bError } = await supabase
				.from("orlik_bookings")
				.select("*, profile:profiles!orlik_bookings_booked_by_fkey(first_name, last_name, role)")
				.order("booking_date", { ascending: true })
				.order("start_time", { ascending: true });

			if (bError) throw bError;

			const { data: trainingsData, error: tError } = await supabase
				.from("trainings")
				.select("*")
				.order("id", { ascending: true });

			if (tError) throw tError;

			setOrlikBookings(bookingsData || []);
			setTrainings(trainingsData || []);
		} catch (error) {
			console.error("Error fetching Orlik schedule data:", error);
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

	// Parsowanie daty treningu
	const parseTrainingDateKey = (timeStr: string): string | null => {
		if (!timeStr) return null;
		const iso = timeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

		const dot = timeStr.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
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
		const textMatch = timeStr.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{4}))?/i);
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
		return null;
	};

	const parseTrainingTimes = (timeStr: string): { start: string; end: string } => {
		const rangeMatch = timeStr.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
		if (rangeMatch) {
			return { start: rangeMatch[1], end: rangeMatch[2] };
		}
		const singleMatch = timeStr.match(/(\d{2}:\d{2})/);
		if (singleMatch) {
			return { start: singleMatch[1], end: "" };
		}
		return { start: "17:00", end: "18:30" };
	};

	// Zunifikowana lista slotów
	const unifiedSlots: UnifiedOrlikSlot[] = useMemo(() => {
		const slots: UnifiedOrlikSlot[] = [];

		orlikBookings.forEach((ob) => {
			const booker = ob.profile
				? `${ob.profile.first_name || ""} ${ob.profile.last_name || ""}`.trim()
				: "Użytkownik / Sztab";

			const canManage =
				profile?.role === "admin" ||
				(Boolean(user) && ob.booked_by === user?.id);

			slots.push({
				id: `booking-${ob.id}`,
				sourceId: ob.id,
				sourceType: "booking",
				bookingDate: ob.booking_date,
				startTime: ob.start_time ? ob.start_time.substring(0, 5) : "17:00",
				endTime: ob.end_time ? ob.end_time.substring(0, 5) : "18:30",
				title: ob.description || "Rezerwacja boiska",
				bookerName: booker || "Użytkownik",
				description: ob.description,
				pitchLocation: ob.location || ORLIK_PITCHES[1].address,
				canManage,
			});
		});

		trainings.forEach((t) => {
			const loc = t.location || "";
			const isOrlikTraining =
				loc.toLowerCase().includes("orlik") ||
				loc.toLowerCase().includes("wojska polskiego") ||
				loc.toLowerCase().includes("parkowa");

			if (isOrlikTraining) {
				const dateKey = parseTrainingDateKey(t.time);
				if (dateKey) {
					const { start, end } = parseTrainingTimes(t.time);
					slots.push({
						id: `training-${t.id}`,
						sourceId: Number(t.id),
						sourceType: "training",
						bookingDate: dateKey,
						startTime: start,
						endTime: end,
						title: t.title || "Trening drużyny",
						bookerName: t.coach || "Trener GKS",
						description: t.description,
						pitchLocation: loc,
						canManage:
							profile?.role === "admin" ||
							(profile?.role === "coach" &&
								Boolean(user) &&
								t.coach?.toLowerCase().includes(profile.last_name?.toLowerCase() || "")),
					});
				}
			}
		});

		slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
		return slots;
	}, [orlikBookings, trainings, profile, user]);

	// Filtrowanie slotów
	const daySlots = useMemo(() => {
		return unifiedSlots.filter((slot) => {
			const matchesDate = slot.bookingDate === selectedDateKey;
			if (!matchesDate) return false;

			if (selectedPitchId === "orlik_1") {
				return (
					slot.pitchLocation.toLowerCase().includes("nr 1") ||
					slot.pitchLocation.toLowerCase().includes("wojska polskiego") ||
					!slot.pitchLocation.toLowerCase().includes("parkowa")
				);
			}
			if (selectedPitchId === "orlik_2") {
				return (
					slot.pitchLocation.toLowerCase().includes("parkowa") ||
					slot.pitchLocation.toLowerCase().includes("gminny")
				);
			}
			return true;
		});
	}, [unifiedSlots, selectedDateKey, selectedPitchId]);

	const hasBookingsOnDate = (dateKey: string) => {
		return unifiedSlots.some((s) => s.bookingDate === dateKey);
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
		const targetIndex =
			direction === "next"
				? Math.min(calendarDays.length - 1, currentIndex + 7)
				: Math.max(0, currentIndex - 7);
const targetDay = calendarDays[targetIndex];
		if (targetDay) {
			setSelectedDateKey(targetDay.dateKey);
			calendarListRef.current?.scrollToIndex({
				index: Math.max(0, targetIndex - 2),
				animated: true,
			});
		}
	};

	const [pitchDropdownOpen, setPitchDropdownOpen] = useState(false);
	const [slotsDropdownOpen, setSlotsDropdownOpen] = useState(false);
	const [purposeDropdownOpen, setPurposeDropdownOpen] = useState(false);

	const toMinutes = (timeStr: string) => {
		if (!timeStr) return 0;
		const [h, m] = timeStr.split(":").map(Number);
		return (h || 0) * 60 + (m || 0);
	};

	const isLocationSame = (locA: string, locB: string) => {
		const a = (locA || "").toLowerCase();
		const b = (locB || "").toLowerCase();
		const aIsParkowa = a.includes("parkowa") || a.includes("gminny");
		const bIsParkowa = b.includes("parkowa") || b.includes("gminny");
		if (aIsParkowa && bIsParkowa) return true;
		if (!aIsParkowa && !bIsParkowa) return true;
		return false;
	};

	const checkBookingConflict = (
		date: string,
		start: string,
		end: string,
		location: string,
		excludeId?: number | null
	): UnifiedOrlikSlot | null => {
		const newStartMin = toMinutes(start);
		const newEndMin = toMinutes(end);

		if (newEndMin <= newStartMin) return null;

		for (const slot of unifiedSlots) {
			if (slot.bookingDate !== date) continue;
			if (excludeId && slot.sourceType === "booking" && slot.sourceId === excludeId) continue;
			if (!isLocationSame(slot.pitchLocation, location)) continue;

			const slotStartMin = toMinutes(slot.startTime);
			const slotEndMin = toMinutes(slot.endTime);
			const effectiveEnd = slotEndMin <= slotStartMin ? slotStartMin + 90 : slotEndMin;

			if (newStartMin < effectiveEnd && newEndMin > slotStartMin) {
				return slot;
			}
		}
		return null;
	};

	const activeConflict = useMemo(() => {
		if (!dialogVisible || !bookingDate || !startTime || !endTime || !formPitchLocation) return null;
		return checkBookingConflict(bookingDate, startTime, endTime, formPitchLocation, editOrlikBookingId);
	}, [dialogVisible, bookingDate, startTime, endTime, formPitchLocation, editOrlikBookingId, unifiedSlots]);

	const handleBookingPress = () => {
		if (!user) {
			setAuthPromptModalVisible(true);
			return;
		}
		openOrlikDialog();
	};

	const openOrlikDialog = () => {
		setEditOrlikBookingId(null);
		setBookingDate(selectedDateKey);
		setFormPitchLocation(selectedPitchId === "orlik_2" ? ORLIK_PITCHES[2].address : ORLIK_PITCHES[1].address);
		setStartTime("17:00");
		setEndTime("18:30");
		setBookingDesc("");
		setBookingError("");
		setPitchDropdownOpen(false);
		setSlotsDropdownOpen(false);
		setPurposeDropdownOpen(false);
		setDialogVisible(true);
	};

	const openEditOrlikDialog = (slot: UnifiedOrlikSlot) => {
		if (slot.sourceType === "training") {
			router.push("/(tabs)/training" as any);
			return;
		}
		setEditOrlikBookingId(slot.sourceId);
		setBookingDate(slot.bookingDate);
		setFormPitchLocation(slot.pitchLocation);
		setStartTime(slot.startTime);
		setEndTime(slot.endTime);
		setBookingDesc(slot.description || "");
		setBookingError("");
		setPitchDropdownOpen(false);
		setSlotsDropdownOpen(false);
		setPurposeDropdownOpen(false);
		setDialogVisible(true);
	};

	const handleSaveOrlikBooking = async () => {
		if (!bookingDate || !startTime || !endTime) {
			setBookingError("Proszę podać datę oraz godziny rezerwacji.");
			return;
		}

		if (toMinutes(endTime) <= toMinutes(startTime)) {
			setBookingError("Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.");
			return;
		}

		if (activeConflict) {
			setBookingError(
				`Termin jest zajęty! Kolizja z: ${activeConflict.title} (${activeConflict.startTime} - ${activeConflict.endTime})`
			);
			Alert.alert(
				"Konflikt terminów na Orliku",
				`W wybranym terminie (${startTime} - ${endTime}) na tym boisku odbywa się już: "${activeConflict.title}" (${activeConflict.bookerName}). Wybierz inne godziny lub drugi Orlik.`,
				[{ text: "Rozumiem" }]
			);
			return;
		}

		if (!user) {
			setBookingError("Musisz być zalogowany.");
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
						description: bookingDesc.trim() || null,
						location: formPitchLocation,
					})
					.eq("id", editOrlikBookingId);

				if (error) throw error;
			} else {
				const { error } = await supabase.from("orlik_bookings").insert([
					{
						booking_date: bookingDate,
						start_time: startTime,
						end_time: endTime,
						description: bookingDesc.trim() || null,
						location: formPitchLocation,
						booked_by: user.id,
					},
				]);

				if (error) throw error;
			}

			setDialogVisible(false);
			fetchData();
		} catch (err: any) {
			console.error("Error saving Orlik booking:", err);
			setBookingError(err.message || "Wystąpił błąd podczas zapisywania rezerwacji.");
		} finally {
			setBookingLoading(false);
		}
	};

	const handleDeleteSlot = async (slot: UnifiedOrlikSlot) => {
		if (slot.sourceType === "training") {
			Alert.alert(
				"Trening drużyny",
				"To wydarzenie jest treningiem drużyny. Możesz nim zarządzać w zakładce Terminarz.",
				[
					{ text: "Wróć", style: "cancel" },
					{ text: "Przejdź do Terminarza", onPress: () => router.push("/(tabs)/training" as any) },
				]
			);
			return;
		}

		Alert.alert(
			"Anulowanie rezerwacji",
			"Czy na pewno chcesz anulować tę rezerwację boiska Orlik?",
			[
				{ text: "Wróć", style: "cancel" },
				{
					text: "Usuń rezerwację",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase.from("orlik_bookings").delete().eq("id", slot.sourceId);
							if (error) throw error;
							fetchData();
						} catch (error) {
							console.error("Error deleting Orlik booking:", error);
							Alert.alert("Błąd", "Nie udało się usunąć rezerwacji.");
						}
					},
				},
			]
		);
	};

	const formatMinutes = (date: Date) => {
		const m = date.getMinutes();
		return m < 15 || m >= 45 ? "00" : "30";
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
						const hasEvents = hasBookingsOnDate(item.dateKey);

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

								{hasEvents && (
									<View
										style={[
											styles.eventDot,
											isSelected ? styles.eventDotActive : styles.eventDotInactive,
										]}
									/>
								)}
							</TouchableOpacity>
						);
					}}
				/>
			</View>

			{/* SZYBKI WYBÓR BOISKA ORLIK (WSZYSTKIE / ORLIK SP / ORLIK PARKOWA) */}
			<View style={styles.pitchSelectorContainer}>
				<View style={styles.quickPitchesRow}>
					{ORLIK_PITCHES.map((pitch) => {
						const isSelected = selectedPitchId === pitch.id;
						return (
							<TouchableOpacity
								key={pitch.id}
								activeOpacity={0.85}
								onPress={() => setSelectedPitchId(pitch.id)}
								style={[styles.quickPitchBtn, isSelected && styles.quickPitchBtnActive]}
							>
								<MaterialCommunityIcons
									name="soccer-field"
									size={16}
									color={isSelected ? COLORS.white : COLORS.textDark}
									style={{ marginRight: 4 }}
								/>
								<Text
									style={[styles.quickPitchBtnText, isSelected && styles.quickPitchBtnTextActive]}
									numberOfLines={1}
								>
									{pitch.shortName}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				keyboardShouldPersistTaps="handled"
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
			>
				{/* DUŻY PRZYCISK REZERWACJI BOISKA DLA KAŻDEGO (RODZIC, TRENER, KIBIC, GOŚĆ) */}
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={handleBookingPress}
					style={styles.heroBookingButton}
				>
					<MaterialIcons name="add-circle" size={24} color={COLORS.white} style={{ marginRight: 8 }} />
					<Text style={styles.heroBookingButtonText}>
						{user ? "Zarezerwuj godziny na Orliku" : "Zaloguj się, aby zarezerwować Orlik"}
					</Text>
				</TouchableOpacity>

				{/* Podsumowanie Dnia */}
				<View style={styles.dayHeaderRow}>
					<View style={{ flex: 1 }}>
						<Text style={styles.dayTitleText}>
							{selectedDayInfo.dayOfWeekFull}, {selectedDayInfo.dayNumber} {selectedDayInfo.monthName}
						</Text>
						<Text style={styles.dayStatusText}>
							{daySlots.length === 0
								? "🟢 Cały dzień wolny"
								: `${daySlots.length} zajęte przedziały godzinowe`}
						</Text>
					</View>
				</View>

				{/* Lista zajętych terminów na dany dzień */}
				{daySlots.length === 0 ? (
					<Card style={styles.freePitchCard}>
						<Card.Content style={styles.freePitchContent}>
							<View style={styles.freeIconCircle}>
								<MaterialCommunityIcons name="check-circle-outline" size={40} color="#16a34a" />
							</View>
							<Text style={styles.freeTitle}>Boisko jest w pełni wolne</Text>
							<Text style={styles.freeSubtext}>
								W tym dniu nie zaplanowano żadnych treningów ani rezerwacji. Możesz bez przeszkód zarezerwować wolny termin na grę lub trening.
							</Text>
							<Button
								mode="contained"
								icon="calendar-plus"
								onPress={handleBookingPress}
								style={styles.freeAddBtn}
								buttonColor={COLORS.primary}
								textColor={COLORS.white}
							>
								{user ? "Zarezerwuj wolny termin" : "Zaloguj się, aby zarezerwować"}
							</Button>
						</Card.Content>
					</Card>
				) : (
					daySlots.map((slot) => {
						let swipeableRef: Swipeable | null = null;

						const renderRightActions = () => (
							<View style={styles.swipeActionsContainer}>
								<TouchableOpacity
									style={[styles.swipeActionBtn, styles.editActionBtn]}
									onPress={() => {
										swipeableRef?.close();
										openEditOrlikDialog(slot);
									}}
								>
									<MaterialIcons name="edit" size={22} color={COLORS.white} />
									<Text style={styles.swipeActionText}>Edytuj</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.swipeActionBtn, styles.deleteActionBtn]}
									onPress={() => {
										swipeableRef?.close();
										handleDeleteSlot(slot);
									}}
								>
									<MaterialIcons name="delete" size={22} color={COLORS.white} />
									<Text style={styles.swipeActionText}>Usuń</Text>
								</TouchableOpacity>
							</View>
						);

						const isTraining = slot.sourceType === "training";

						const card = (
							<Card style={[styles.slotCard, isTraining ? styles.trainingSlotCard : styles.bookingSlotCard]}>
								<Card.Content style={styles.slotContent}>
									<View style={styles.slotTopRow}>
										<View style={styles.timePill}>
											<MaterialCommunityIcons name="clock-time-four-outline" size={15} color={COLORS.primary} />
											<Text style={styles.timePillText}>
												{slot.startTime} {slot.endTime ? `- ${slot.endTime}` : ""}
											</Text>
										</View>

										<View style={[styles.typeBadge, isTraining ? styles.occupiedBadge : styles.bookingBadge]}>
											<MaterialCommunityIcons
												name={isTraining ? "alert-octagon" : "calendar-check"}
												size={14}
												color={isTraining ? "#dc2626" : "#b45309"}
												style={{ marginRight: 4 }}
											/>
											<Text style={[styles.typeBadgeText, isTraining ? styles.occupiedBadgeText : styles.bookingBadgeText]}>
												{isTraining ? "🚫 ORLIK ZAJĘTY" : "🔴 REZERWACJA (ZAJĘTE)"}
											</Text>
										</View>
									</View>

									<Text style={styles.slotTitle}>
										{isTraining
											? (slot.title ? `Trening: ${slot.title}` : "Trening klubowy GKS Strzegowo")
											: (slot.title || "Rezerwacja boiska")}
									</Text>

									<View style={styles.slotMetaRow}>
										<View style={styles.metaItem}>
											<MaterialCommunityIcons
												name={isTraining ? "whistle-outline" : "account-circle-outline"}
												size={15}
												color={isTraining ? "#dc2626" : COLORS.textLight}
											/>
											<Text style={[styles.metaText, isTraining && { color: "#991b1b", fontFamily: FONTS.semiBold }]}>
												{isTraining ? `Trener: ${slot.bookerName}` : `Rezerwacja: ${slot.bookerName}`}
											</Text>
										</View>

										<View style={styles.metaItem}>
											<MaterialCommunityIcons name="map-marker-outline" size={15} color={COLORS.textLight} />
											<Text style={styles.metaText} numberOfLines={1}>
												{slot.pitchLocation.includes("Parkowa") ? "Orlik Parkowa" : "Orlik SP"}
											</Text>
										</View>
									</View>
								</Card.Content>
							</Card>
						);

						if (slot.canManage) {
							return (
								<Swipeable
									key={slot.id}
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
						return <View key={slot.id}>{card}</View>;
					})
				)}
			</ScrollView>

					{/* Dialog Rezerwacji Orlika (Responsywne Drop Menu) */}
					<Portal>
						<Dialog
							visible={dialogVisible}
							onDismiss={() => setDialogVisible(false)}
							style={styles.responsiveDialog}
						>
							<View style={styles.dialogHeaderRow}>
								<View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
									<View style={styles.dialogHeaderIcon}>
										<MaterialCommunityIcons name="calendar-clock" size={22} color={COLORS.primary} />
									</View>
									<Text style={styles.dialogTitleText}>
										{editOrlikBookingId !== null ? "Edytuj rezerwację" : "Rezerwacja boiska Orlik"}
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
									{/* Komunikat o błędzie */}
									{bookingError ? (
										<View style={styles.errorBanner}>
											<MaterialIcons name="error-outline" size={20} color="#dc2626" />
											<Text style={styles.errorBannerText}>{bookingError}</Text>
										</View>
									) : null}

									{/* ⚠️ OSTRZEŻENIE O KOLIZJI / ZAJĘTOŚCI TERMINU */}
									{activeConflict ? (
										<View style={styles.conflictBanner}>
											<MaterialCommunityIcons name="alert-octagon" size={24} color="#dc2626" />
											<View style={{ flex: 1 }}>
												<Text style={styles.conflictTitle}>KOLIZJA: Boisko jest już zajęte!</Text>
												<Text style={styles.conflictDescription}>
													W godz. {activeConflict.startTime} - {activeConflict.endTime} zaplanowano:
													{"\n"}• <Text style={{ fontFamily: FONTS.bold }}>{activeConflict.title}</Text> ({activeConflict.bookerName})
												</Text>
												<Text style={styles.conflictHint}>Wybierz inną godzinę lub drugie boisko.</Text>
											</View>
										</View>
									) : null}

									{/* 1. DROP MENU: Wybór boiska Orlik */}
									<View style={styles.dropdownContainer}>
										<Text style={styles.fieldSectionLabel}>Wybierz boisko Orlik:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setPitchDropdownOpen(!pitchDropdownOpen);
												setSlotsDropdownOpen(false);
												setPurposeDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, pitchDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="soccer-field" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText} numberOfLines={1}>
													{formPitchLocation.includes("Parkowa")
														? "Orlik Gminny (ul. Parkowa 2)"
														: "Orlik nr 1 przy SP (ul. Wojska Polskiego 1)"}
												</Text>
											</View>
											<MaterialIcons
												name={pitchDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{pitchDropdownOpen && (
											<View style={styles.dropdownBody}>
												{ORLIK_PITCHES.slice(1).map((pitch) => {
													const isSelected = formPitchLocation === pitch.address;
													return (
														<TouchableOpacity
															key={pitch.id}
															activeOpacity={0.8}
															onPress={() => {
																setFormPitchLocation(pitch.address);
																setPitchDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="soccer-field"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<View style={{ flex: 1 }}>
																<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive]}>
																	{pitch.name}
																</Text>
																<Text style={styles.dropdownOptionSubtitle}>{pitch.address}</Text>
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

									{/* 2. Wybór Daty */}
									<View>
										<Text style={styles.fieldSectionLabel}>Data rezerwacji:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											style={styles.dropdownHeader}
											onPress={() => setDatePickerVisible(true)}
										>
											<MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
											<Text style={styles.dropdownSelectedText}>{bookingDate || "Wybierz datę..."}</Text>
											<MaterialIcons name="edit-calendar" size={20} color={COLORS.textLight} />
										</TouchableOpacity>
									</View>

									{/* 3. DROP MENU: Przedziały godzinowe */}
									<View style={styles.dropdownContainer}>
										<Text style={styles.fieldSectionLabel}>Godziny rezerwacji:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setSlotsDropdownOpen(!slotsDropdownOpen);
												setPitchDropdownOpen(false);
												setPurposeDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, slotsDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="clock-time-four-outline" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText}>
													{startTime} - {endTime}
												</Text>
											</View>
											<MaterialIcons
												name={slotsDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{slotsDropdownOpen && (
											<View style={styles.dropdownBody}>
												{[
													{ label: "16:00 - 17:30 (Popołudnie)", start: "16:00", end: "17:30" },
													{ label: "17:00 - 18:30 (Standard)", start: "17:00", end: "18:30" },
													{ label: "18:30 - 20:00 (Wieczór)", start: "18:30", end: "20:00" },
													{ label: "20:00 - 21:30 (Późny wieczór)", start: "20:00", end: "21:30" },
												].map((slot) => {
													const isSelected = startTime === slot.start && endTime === slot.end;
													return (
														<TouchableOpacity
															key={slot.label}
															activeOpacity={0.8}
															onPress={() => {
																setStartTime(slot.start);
																setEndTime(slot.end);
																setSlotsDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="clock-outline"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive, { flex: 1 }]}>
																{slot.label}
															</Text>
															{isSelected && (
																<MaterialIcons name="check" size={18} color={COLORS.primary} />
															)}
														</TouchableOpacity>
													);
												})}

												{/* Ręczny wybór godziny */}
												<View style={styles.customTimeRow}>
													<TouchableOpacity
														style={styles.customTimeBtn}
														onPress={() => setStartTimePickerVisible(true)}
													>
														<Text style={styles.customTimeLabel}>Zmień Od:</Text>
														<Text style={styles.customTimeValue}>{startTime}</Text>
													</TouchableOpacity>

													<TouchableOpacity
														style={styles.customTimeBtn}
														onPress={() => setEndTimePickerVisible(true)}
													>
														<Text style={styles.customTimeLabel}>Zmień Do:</Text>
														<Text style={styles.customTimeValue}>{endTime}</Text>
													</TouchableOpacity>
												</View>
											</View>
										)}
									</View>

									{/* 4. DROP MENU: Szablon celu / drużyny */}
									<View style={styles.dropdownContainer}>
										<Text style={styles.fieldSectionLabel}>Cel rezerwacji / Drużyna:</Text>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => {
												setPurposeDropdownOpen(!purposeDropdownOpen);
												setPitchDropdownOpen(false);
												setSlotsDropdownOpen(false);
											}}
											style={[styles.dropdownHeader, purposeDropdownOpen && styles.dropdownHeaderActive]}
										>
											<MaterialCommunityIcons name="soccer" size={20} color={COLORS.primary} />
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownSelectedText} numberOfLines={1}>
													{bookingDesc || "Wybierz szablon lub wpisz poniżej..."}
												</Text>
											</View>
											<MaterialIcons
												name={purposeDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
												size={22}
												color={COLORS.textLight}
											/>
										</TouchableOpacity>

										{purposeDropdownOpen && (
											<View style={styles.dropdownBody}>
												{[
													"Gra rekreacyjna / Mecz towarzyski",
													"Trening indywidualny / bramkarski",
													"Zajęcia ogólnorozwojowe / rodzinne",
													"Trening drużyny klubowej",
													"Mecz sparingowy / Turniej",
													"Trening Seniorów",
													"Trening grup młodzieżowych",
													"Konserwacja / Prace techniczne",
												].map((purpose) => {
													const isSelected = bookingDesc === purpose;
													return (
														<TouchableOpacity
															key={purpose}
															activeOpacity={0.8}
															onPress={() => {
																setBookingDesc(purpose);
																setPurposeDropdownOpen(false);
															}}
															style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
														>
															<MaterialCommunityIcons
																name="shield-outline"
																size={18}
																color={isSelected ? COLORS.primary : COLORS.textLight}
															/>
															<Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleActive, { flex: 1 }]}>
																{purpose}
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

									{/* Pole tekstowe własnego opisu */}
									<TextInput
										label="Własny opis / notatka"
										value={bookingDesc}
										onChangeText={setBookingDesc}
										mode="outlined"
										placeholder="np. Trening Orlików U-10"
										style={styles.input}
										outlineColor="#e2e8f0"
										activeOutlineColor={COLORS.primary}
										left={<TextInput.Icon icon="lead-pencil" />}
									/>
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
									onPress={handleSaveOrlikBooking}
									disabled={bookingLoading || Boolean(activeConflict)}
									style={[
										styles.modalSubmitBtn,
										Boolean(activeConflict) && styles.modalSubmitBtnDisabled,
									]}
								>
									{bookingLoading ? (
										<ActivityIndicator size="small" color={COLORS.white} />
									) : (
										<View style={styles.modalSubmitContent}>
											<MaterialCommunityIcons
												name={activeConflict ? "alert-circle" : (editOrlikBookingId !== null ? "check-circle" : "soccer")}
												size={20}
												color={COLORS.white}
											/>
											<Text style={styles.modalSubmitBtnText}>
												{activeConflict
													? "Termin zajęty"
													: editOrlikBookingId !== null
													? "Zapisz zmiany"
													: "Zarezerwuj boisko"}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							</View>
						</Dialog>
					</Portal>

					{/* Custom Modal zachęty do logowania / rejestracji dla gości */}
					<Portal>
						<Dialog
							visible={authPromptModalVisible}
							onDismiss={() => setAuthPromptModalVisible(false)}
							style={styles.authModalDialog}
						>
							<View style={styles.authModalCard}>
								{/* Przycisk zamknięcia */}
								<TouchableOpacity
									activeOpacity={0.7}
									onPress={() => setAuthPromptModalVisible(false)}
									style={styles.authModalCloseBtn}
								>
									<MaterialIcons name="close" size={20} color={COLORS.textLight} />
								</TouchableOpacity>

								{/* Herb / Logo GKS z tarczą */}
								<View style={styles.authModalLogoContainer}>
									<View style={styles.authModalLogoWrapper}>
										<Image
											source={require("../assets/logo_gks.png")}
											style={styles.authModalLogo}
											resizeMode="contain"
										/>
									</View>
									<View style={styles.authModalBadge}>
										<MaterialCommunityIcons name="soccer" size={13} color={COLORS.white} />
										<Text style={styles.authModalBadgeText}>GKS STRZEGOWO</Text>
									</View>
								</View>

								{/* Tytuł i opis */}
								<Text style={styles.authModalTitle}>Rezerwacja boiska Orlik</Text>
								<Text style={styles.authModalSubtitle}>
									Rezerwacja wolnych godzin na Orliku jest dostępna po zalogowaniu dla wszystkich członków i sympatyków klubu.
								</Text>

								{/* Zalety konta */}
								<View style={styles.authModalPerksBox}>
									<View style={styles.authModalPerkItem}>
										<MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
										<Text style={styles.authModalPerkText}>Dla rodziców, kibiców i zawodników</Text>
									</View>
									<View style={styles.authModalPerkItem}>
										<MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
										<Text style={styles.authModalPerkText}>Wybór dogodnych godzin i drugiego boiska</Text>
									</View>
									<View style={styles.authModalPerkItem}>
										<MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
										<Text style={styles.authModalPerkText}>Zarządzanie swoimi terminami i powiadomienia</Text>
									</View>
								</View>

								{/* Przyciski CTA */}
								<TouchableOpacity
									activeOpacity={0.85}
									style={styles.authModalLoginBtn}
									onPress={() => {
										setAuthPromptModalVisible(false);
										router.push("/auth/login" as any);
									}}
								>
									<MaterialCommunityIcons name="login" size={20} color={COLORS.white} />
									<Text style={styles.authModalLoginBtnText}>Zaloguj się do aplikacji</Text>
								</TouchableOpacity>

								<TouchableOpacity
									activeOpacity={0.85}
									style={styles.authModalRegisterBtn}
									onPress={() => {
										setAuthPromptModalVisible(false);
										router.push("/auth/register" as any);
									}}
								>
									<MaterialCommunityIcons name="account-plus-outline" size={20} color={COLORS.primary} />
									<Text style={styles.authModalRegisterBtnText}>Załóż bezpłatne konto</Text>
								</TouchableOpacity>

								<TouchableOpacity
									activeOpacity={0.7}
									style={styles.authModalDismissBtn}
									onPress={() => setAuthPromptModalVisible(false)}
								>
									<Text style={styles.authModalDismissBtnText}>Przeglądaj grafik bez logowania</Text>
								</TouchableOpacity>
							</View>
						</Dialog>
					</Portal>

					{/* Date & Time Pickers */}
					<DateTimePickerModal
						isVisible={isDatePickerVisible}
						mode="date"
						onConfirm={(date) => {
							setDatePickerVisible(false);
							const y = date.getFullYear();
							const m = String(date.getMonth() + 1).padStart(2, "0");
							const d = String(date.getDate()).padStart(2, "0");
							setBookingDate(`${y}-${m}-${d}`);
						}}
						onCancel={() => setDatePickerVisible(false)}
						locale="pl_PL"
					/>

					<DateTimePickerModal
						isVisible={isStartTimePickerVisible}
						mode="time"
						onConfirm={(date) => {
							setStartTimePickerVisible(false);
							const h = String(date.getHours()).padStart(2, "0");
							const m = formatMinutes(date);
							setStartTime(`${h}:${m}`);
						}}
						onCancel={() => setStartTimePickerVisible(false)}
						locale="pl_PL"
					/>

					<DateTimePickerModal
						isVisible={isEndTimePickerVisible}
						mode="time"
						onConfirm={(date) => {
							setEndTimePickerVisible(false);
							const h = String(date.getHours()).padStart(2, "0");
							const m = formatMinutes(date);
							setEndTime(`${h}:${m}`);
						}}
						onCancel={() => setEndTimePickerVisible(false)}
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
	eventDot: {
		width: 4.5,
		height: 4.5,
		borderRadius: 2.25,
		marginTop: 3,
	},
	eventDotActive: {
		backgroundColor: COLORS.white,
	},
	eventDotInactive: {
		backgroundColor: COLORS.primary,
	},
	pitchSelectorContainer: {
		backgroundColor: COLORS.white,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	quickPitchesRow: {
		flexDirection: "row",
		gap: 8,
	},
	quickPitchBtn: {
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
	quickPitchBtnActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primaryDark,
	},
	quickPitchBtnText: {
		fontFamily: FONTS.semiBold,
		fontSize: 12.5,
		color: COLORS.textDark,
	},
	quickPitchBtnTextActive: {
		color: COLORS.white,
		fontFamily: FONTS.bold,
	},
	scrollContainer: {
		padding: 16,
		paddingTop: 12,
		paddingBottom: 40,
	},
	heroBookingButton: {
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
	heroBookingButtonText: {
		fontFamily: FONTS.bold,
		fontSize: 15.5,
		color: COLORS.white,
	},
	dayHeaderRow: {
		marginBottom: 12,
	},
	dayTitleText: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		color: COLORS.textDark,
	},
	dayStatusText: {
		fontFamily: FONTS.regular,
		fontSize: 12.5,
		color: COLORS.textLight,
		marginTop: 1,
	},
	freePitchCard: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		paddingVertical: 24,
		borderWidth: 1,
		borderColor: "#dcfce7",
		elevation: 1,
	},
	freePitchContent: {
		alignItems: "center",
		paddingHorizontal: 20,
	},
	freeIconCircle: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#f0fdf4",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12,
	},
	freeTitle: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		color: "#16a34a",
		marginBottom: 4,
	},
	freeSubtext: {
		fontFamily: FONTS.regular,
		fontSize: 13,
		color: COLORS.textLight,
		textAlign: "center",
		lineHeight: 18,
		marginBottom: 16,
	},
	freeAddBtn: {
		borderRadius: 10,
	},
	slotCard: {
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
	trainingSlotCard: {
		borderColor: "#fca5a5",
		borderLeftWidth: 4,
		borderLeftColor: "#ef4444",
	},
	bookingSlotCard: {
		borderColor: "#fed7aa",
		borderLeftWidth: 4,
		borderLeftColor: "#f97316",
	},
	slotContent: {
		padding: 12,
	},
	slotTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	timePill: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#eff6ff",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	timePillText: {
		fontFamily: FONTS.bold,
		fontSize: 13,
		color: COLORS.primary,
	},
	typeBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	occupiedBadge: {
		backgroundColor: "#fee2e2",
		borderWidth: 1,
		borderColor: "#fca5a5",
	},
	occupiedBadgeText: {
		color: "#dc2626",
	},
	bookingBadge: {
		backgroundColor: "#fff7ed",
		borderWidth: 1,
		borderColor: "#ffedd5",
	},
	typeBadgeText: {
		fontFamily: FONTS.bold,
		fontSize: 10.5,
		letterSpacing: 0.5,
	},
	bookingBadgeText: {
		color: "#c2410c",
	},
	slotTitle: {
		fontFamily: FONTS.bold,
		fontSize: 15.5,
		color: COLORS.textDark,
		marginBottom: 6,
	},
	slotMetaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: "#f8fafc",
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		flex: 1,
	},
	metaText: {
		fontFamily: FONTS.regular,
		fontSize: 12,
		color: COLORS.textLight,
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
	guestContainer: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
	},
	guestCard: {
		backgroundColor: COLORS.white,
		borderRadius: 20,
		elevation: 4,
	},
	guestContent: {
		alignItems: "center",
		padding: 24,
	},
	guestIcon: {
		backgroundColor: "#eff6ff",
		marginBottom: 16,
	},
	guestTitle: {
		fontFamily: FONTS.bold,
		fontSize: 20,
		color: COLORS.textDark,
		textAlign: "center",
		marginBottom: 8,
	},
	guestDescription: {
		fontFamily: FONTS.regular,
		fontSize: 14,
		color: COLORS.textLight,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 20,
	},
	guestButton: {
		borderRadius: 12,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 16,
	},
	guestButtonLabel: {
		fontFamily: FONTS.semiBold,
		fontSize: 15,
		color: COLORS.white,
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
	pitchOptionItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		marginBottom: 10,
		backgroundColor: "#f8fafc",
	},
	pitchOptionItemActive: {
		borderColor: COLORS.primary,
		backgroundColor: "#eff6ff",
	},
	pitchOptionIconBox: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: "#eff6ff",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	pitchOptionIconBoxActive: {
		backgroundColor: COLORS.primary,
	},
	pitchOptionName: {
		fontFamily: FONTS.bold,
		fontSize: 14.5,
		color: COLORS.textDark,
	},
	pitchOptionNameActive: {
		color: COLORS.primary,
	},
	pitchOptionAddress: {
		fontFamily: FONTS.regular,
		fontSize: 12,
		color: COLORS.textLight,
		marginTop: 2,
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
	conflictBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: "#fef2f2",
		borderWidth: 1.5,
		borderColor: "#ef4444",
	},
	conflictTitle: {
		fontFamily: FONTS.bold,
		fontSize: 13,
		color: "#991b1b",
	},
	conflictDescription: {
		fontFamily: FONTS.regular,
		fontSize: 12,
		color: "#7f1d1d",
		marginTop: 3,
		lineHeight: 16,
	},
	conflictHint: {
		fontFamily: FONTS.semiBold,
		fontSize: 11,
		color: "#dc2626",
		marginTop: 4,
	},
	fieldSectionLabel: {
		fontFamily: FONTS.semiBold,
		fontSize: 12.5,
		color: COLORS.textDark,
		marginBottom: 6,
		marginTop: 6,
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
	customTimeRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 6,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
	},
	customTimeBtn: {
		flex: 1,
		padding: 8,
		borderRadius: 8,
		backgroundColor: "#f8fafc",
		borderWidth: 1,
		borderColor: "#cbd5e1",
		alignItems: "center",
	},
	customTimeLabel: {
		fontFamily: FONTS.regular,
		fontSize: 10,
		color: COLORS.textLight,
	},
	customTimeValue: {
		fontFamily: FONTS.bold,
		fontSize: 13,
		color: COLORS.primary,
		marginTop: 2,
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
	modalSubmitBtnDisabled: {
		backgroundColor: "#ef4444",
		shadowColor: "#ef4444",
		opacity: 0.85,
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
	errorText: {
		fontFamily: FONTS.medium,
		fontSize: 12,
		color: "#dc2626",
		marginBottom: 8,
	},
	/* Auth Prompt Custom Modal */
	authModalDialog: {
		backgroundColor: COLORS.white,
		borderRadius: 24,
		marginHorizontal: 16,
		overflow: "hidden",
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.22,
		shadowRadius: 16,
		padding: 0,
	},
	authModalCard: {
		padding: 22,
		alignItems: "center",
		position: "relative",
	},
	authModalCloseBtn: {
		position: "absolute",
		top: 14,
		right: 14,
		zIndex: 10,
		padding: 6,
		borderRadius: 20,
		backgroundColor: "#f1f5f9",
	},
	authModalLogoContainer: {
		alignItems: "center",
		marginTop: 4,
		marginBottom: 14,
	},
	authModalLogoWrapper: {
		width: 78,
		height: 78,
		borderRadius: 39,
		backgroundColor: "#eff6ff",
		borderWidth: 2,
		borderColor: "#dbeafe",
		justifyContent: "center",
		alignItems: "center",
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		marginBottom: 8,
	},
	authModalLogo: {
		width: 56,
		height: 56,
	},
	authModalBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 20,
	},
	authModalBadgeText: {
		fontFamily: FONTS.bold,
		fontSize: 11,
		color: COLORS.white,
		letterSpacing: 0.6,
	},
	authModalTitle: {
		fontFamily: FONTS.bold,
		fontSize: 19,
		color: COLORS.textDark,
		textAlign: "center",
		marginBottom: 6,
	},
	authModalSubtitle: {
		fontFamily: FONTS.regular,
		fontSize: 13,
		color: COLORS.textLight,
		textAlign: "center",
		lineHeight: 18,
		marginBottom: 14,
		paddingHorizontal: 6,
	},
	authModalPerksBox: {
		width: "100%",
		backgroundColor: "#f8fafc",
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		gap: 8,
		marginBottom: 18,
	},
	authModalPerkItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	authModalPerkText: {
		fontFamily: FONTS.medium,
		fontSize: 12.5,
		color: COLORS.textDark,
		flex: 1,
	},
	authModalLoginBtn: {
		width: "100%",
		height: 48,
		backgroundColor: COLORS.primary,
		borderRadius: 14,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
		marginBottom: 10,
	},
	authModalLoginBtnText: {
		fontFamily: FONTS.bold,
		fontSize: 14.5,
		color: COLORS.white,
	},
	authModalRegisterBtn: {
		width: "100%",
		height: 46,
		backgroundColor: "#eff6ff",
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: "#bfdbfe",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		marginBottom: 8,
	},
	authModalRegisterBtnText: {
		fontFamily: FONTS.semiBold,
		fontSize: 13.5,
		color: COLORS.primary,
	},
	authModalDismissBtn: {
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	authModalDismissBtnText: {
		fontFamily: FONTS.regular,
		fontSize: 12.5,
		color: COLORS.textLight,
		textDecorationLine: "underline",
	},
});
