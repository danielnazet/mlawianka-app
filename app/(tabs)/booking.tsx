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
} from "react-native";
import {
	Card,
	Title,
	Button,
	Text,
	Paragraph,
	Portal,
	Dialog,
	TextInput,
	Avatar,
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
import { OrlikBooking, Training } from "../../types";

const DAY_ITEM_WIDTH = 62;

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
	const [pitchPickerModalVisible, setPitchPickerModalVisible] = useState(false);

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

	const currentPitch = useMemo(() => {
		return ORLIK_PITCHES.find((p) => p.id === selectedPitchId) || ORLIK_PITCHES[0];
	}, [selectedPitchId]);

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
				: "Sztab Klubu";

			const canManage =
				profile?.role === "admin" ||
				(profile?.role === "coach" && ob.booked_by === user?.id);

			slots.push({
				id: `booking-${ob.id}`,
				sourceId: ob.id,
				sourceType: "booking",
				bookingDate: ob.booking_date,
				startTime: ob.start_time ? ob.start_time.substring(0, 5) : "17:00",
				endTime: ob.end_time ? ob.end_time.substring(0, 5) : "18:30",
				title: ob.description || "Rezerwacja boiska",
				bookerName: booker || "Trener GKS Strzegowo",
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

	const openOrlikDialog = () => {
		setEditOrlikBookingId(null);
		setBookingDate(selectedDateKey);
		setFormPitchLocation(selectedPitchId === "orlik_2" ? ORLIK_PITCHES[2].address : ORLIK_PITCHES[1].address);
		setStartTime("17:00");
		setEndTime("18:30");
		setBookingDesc("");
		setBookingError("");
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
		setDialogVisible(true);
	};

	const handleSaveOrlikBooking = async () => {
		if (!bookingDate || !startTime || !endTime) {
			setBookingError("Proszę podać datę oraz godziny rezerwacji.");
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
			setBookingError(err.message || "Błąd zapisu rezerwacji");
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
			{!user ? (
				<View style={styles.guestContainer}>
					<Card style={styles.guestCard}>
						<Card.Content style={styles.guestContent}>
							<Avatar.Icon size={56} icon="stadium" color={COLORS.primary} style={styles.guestIcon} />
							<Title style={styles.guestTitle}>Grafik Boisk Orlik</Title>
							<Paragraph style={styles.guestDescription}>
								Grafik rezerwacji boisk Orlik oraz plan treningów jest dostępny dla trenerów i administratorów klubu GKS Strzegowo.
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
								length: DAY_ITEM_WIDTH + 8,
								offset: (DAY_ITEM_WIDTH + 8) * index,
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

					{/* DUŻY, CZYTELNY WYBÓR BOISKA ORLIK (DROPDOWN + DUŻE KAFELKI) */}
					<View style={styles.pitchSelectorContainer}>
						<TouchableOpacity
							activeOpacity={0.85}
							style={styles.pitchDropdownBtn}
							onPress={() => setPitchPickerModalVisible(true)}
						>
							<View style={styles.pitchDropdownLeft}>
								<MaterialCommunityIcons name="soccer-field" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
								<View>
									<Text style={styles.pitchDropdownLabel}>Aktywne boisko:</Text>
									<Text style={styles.pitchDropdownValue}>{currentPitch.name}</Text>
								</View>
							</View>

							<View style={styles.pitchDropdownRight}>
								<Text style={styles.pitchChangeText}>Zmień</Text>
								<MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.primary} />
							</View>
						</TouchableOpacity>

						{/* 3 Duże Przyciski Szybkiego Wyboru Boiska */}
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
						{/* DUŻY, WYGODNY PRZYCISK REZERWACJI BOISKA DLA TRENERA / ADMINA */}
						{isCoachOrAdmin && (
							<TouchableOpacity
								activeOpacity={0.85}
								onPress={openOrlikDialog}
								style={styles.heroBookingButton}
							>
								<MaterialIcons name="add-circle" size={24} color={COLORS.white} style={{ marginRight: 8 }} />
								<Text style={styles.heroBookingButtonText}>Zarezerwuj godziny na Orliku</Text>
							</TouchableOpacity>
						)}

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
										W tym dniu nie zaplanowano żadnych treningów ani rezerwacji. Możesz bez przeszkód zarezerwować termin dla swojej grupy.
									</Text>
									{isCoachOrAdmin && (
										<Button
											mode="contained"
											icon="calendar-plus"
											onPress={openOrlikDialog}
											style={styles.freeAddBtn}
											buttonColor={COLORS.primary}
											textColor={COLORS.white}
										>
											Zarezerwuj godziny dla drużyny
										</Button>
									)}
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
									<Card style={[styles.slotCard, isTraining && styles.trainingSlotCard]}>
										<Card.Content style={styles.slotContent}>
											<View style={styles.slotTopRow}>
												<View style={styles.timePill}>
													<MaterialCommunityIcons name="clock-time-four-outline" size={15} color={COLORS.primary} />
													<Text style={styles.timePillText}>
														{slot.startTime} {slot.endTime ? `- ${slot.endTime}` : ""}
													</Text>
												</View>

												<View style={[styles.typeBadge, isTraining ? styles.trainingBadge : styles.bookingBadge]}>
													<MaterialCommunityIcons
														name={isTraining ? "soccer" : "calendar-check"}
														size={14}
														color={isTraining ? COLORS.primary : "#d97706"}
														style={{ marginRight: 4 }}
													/>
													<Text style={[styles.typeBadgeText, isTraining ? styles.trainingBadgeText : styles.bookingBadgeText]}>
														{isTraining ? "TRENING DRUŻYNY" : "REZERWACJA SZTABU"}
													</Text>
												</View>
											</View>

											<Text style={styles.slotTitle}>{slot.title}</Text>

											<View style={styles.slotMetaRow}>
												<View style={styles.metaItem}>
													<MaterialCommunityIcons name="account-tie" size={15} color={COLORS.textLight} />
													<Text style={styles.metaText}>{slot.bookerName}</Text>
												</View>

												<View style={styles.metaItem}>
													<MaterialCommunityIcons name="map-marker-outline" size={15} color={COLORS.textLight} />
													<Text style={styles.metaText} numberOfLines={1}>
														{slot.pitchLocation.includes("Parkowa") ? "Orlik Parkowa" : "Orlik nr 1 przy SP"}
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

					{/* Modal Wyboru Boiska Orlik */}
					<Portal>
						<Dialog
							visible={pitchPickerModalVisible}
							onDismiss={() => setPitchPickerModalVisible(false)}
							style={styles.dialog}
						>
							<Dialog.Title style={styles.dialogTitle}>Wybierz boisko Orlik</Dialog.Title>
							<Dialog.ScrollArea style={styles.dialogScrollArea}>
								<ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
									{ORLIK_PITCHES.map((pitch) => {
										const isSelected = selectedPitchId === pitch.id;
										return (
											<TouchableOpacity
												key={pitch.id}
												activeOpacity={0.8}
												onPress={() => {
													setSelectedPitchId(pitch.id);
													setPitchPickerModalVisible(false);
												}}
												style={[styles.pitchOptionItem, isSelected && styles.pitchOptionItemActive]}
											>
												<View style={[styles.pitchOptionIconBox, isSelected && styles.pitchOptionIconBoxActive]}>
													<MaterialCommunityIcons
														name="soccer-field"
														size={24}
														color={isSelected ? COLORS.white : COLORS.primary}
													/>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={[styles.pitchOptionName, isSelected && styles.pitchOptionNameActive]}>
														{pitch.name}
													</Text>
													<Text style={styles.pitchOptionAddress}>{pitch.address}</Text>
												</View>
												{isSelected && (
													<MaterialIcons name="check-circle" size={22} color={COLORS.primary} />
												)}
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</Dialog.ScrollArea>
							<Dialog.Actions>
								<Button onPress={() => setPitchPickerModalVisible(false)}>Zamknij</Button>
							</Dialog.Actions>
						</Dialog>
					</Portal>

					{/* Dialog Rezerwacji Orlika */}
					<Portal>
						<Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
							<Dialog.Title style={styles.dialogTitle}>
								{editOrlikBookingId !== null ? "Edytuj rezerwację Orlika" : "Zarezerwuj boisko Orlik"}
							</Dialog.Title>

							<Dialog.ScrollArea style={styles.dialogScrollArea}>
								<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 10 }}>
									{bookingError ? <Text style={styles.errorText}>{bookingError}</Text> : null}

									{/* Wybór Boiska */}
									<TouchableOpacity style={styles.selectButton} onPress={() => setFormPitchModalVisible(true)}>
										<Text style={styles.selectButtonLabel}>Wybierz boisko Orlik:</Text>
										<Text style={styles.selectButtonValue}>
											{formPitchLocation.includes("Parkowa") ? "Orlik Gminny (ul. Parkowa 2)" : "Orlik nr 1 przy SP (ul. Wojska Polskiego 1)"}
										</Text>
									</TouchableOpacity>

									{/* Wybór Daty */}
									<TouchableOpacity style={styles.selectButton} onPress={() => setDatePickerVisible(true)}>
										<Text style={styles.selectButtonLabel}>Data rezerwacji:</Text>
										<Text style={styles.selectButtonValue}>{bookingDate || "Wybierz datę..."}</Text>
									</TouchableOpacity>

									{/* Godziny Od - Do */}
									<View style={styles.timeInputsRow}>
										<TouchableOpacity
											style={[styles.selectButton, { flex: 1, marginRight: 6 }]}
											onPress={() => setStartTimePickerVisible(true)}
										>
											<Text style={styles.selectButtonLabel}>Godzina od:</Text>
											<Text style={styles.selectButtonValue}>{startTime}</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={[styles.selectButton, { flex: 1, marginLeft: 6 }]}
											onPress={() => setEndTimePickerVisible(true)}
										>
											<Text style={styles.selectButtonLabel}>Godzina do:</Text>
											<Text style={styles.selectButtonValue}>{endTime}</Text>
										</TouchableOpacity>
									</View>

									<TextInput
										label="Cel / Drużyna (np. Trening Żaków, Mecz)"
										value={bookingDesc}
										onChangeText={setBookingDesc}
										mode="outlined"
										placeholder="np. Trening Orlików U-10"
										style={styles.input}
										outlineColor="#e2e8f0"
										activeOutlineColor={COLORS.primary}
										left={<TextInput.Icon icon="soccer" />}
									/>
								</ScrollView>
							</Dialog.ScrollArea>

							<Dialog.Actions style={styles.dialogActions}>
								<Button onPress={() => setDialogVisible(false)} textColor={COLORS.textLight}>
									Anuluj
								</Button>
								<Button
									mode="contained"
									onPress={handleSaveOrlikBooking}
									loading={bookingLoading}
									disabled={bookingLoading}
									buttonColor={COLORS.primary}
									textColor={COLORS.white}
								>
									{editOrlikBookingId !== null ? "Zapisz" : "Zarezerwuj"}
								</Button>
							</Dialog.Actions>
						</Dialog>
					</Portal>

					{/* Modal wyboru boiska w formularzu */}
					<Portal>
						<Dialog visible={formPitchModalVisible} onDismiss={() => setFormPitchModalVisible(false)} style={styles.dialog}>
							<Dialog.Title style={styles.dialogTitle}>Wybierz boisko</Dialog.Title>
							<Dialog.ScrollArea style={styles.dialogScrollArea}>
								<ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
									<RadioButton.Group
										onValueChange={(val) => {
											setFormPitchLocation(val);
											setFormPitchModalVisible(false);
										}}
										value={formPitchLocation}
									>
										<RadioButton.Item
											label="Orlik nr 1 przy SP (ul. Wojska Polskiego 1)"
											value={ORLIK_PITCHES[1].address}
											color={COLORS.primary}
										/>
										<RadioButton.Item
											label="Orlik Gminny (ul. Parkowa 2)"
											value={ORLIK_PITCHES[2].address}
											color={COLORS.primary}
										/>
									</RadioButton.Group>
								</ScrollView>
							</Dialog.ScrollArea>
							<Dialog.Actions>
								<Button onPress={() => setFormPitchModalVisible(false)}>Zamknij</Button>
							</Dialog.Actions>
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
				</>
			)}
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
		paddingHorizontal: 12,
		gap: 8,
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
		marginRight: 8,
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
	pitchDropdownBtn: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		marginBottom: 10,
	},
	pitchDropdownLeft: {
		flexDirection: "row",
		alignItems: "center",
	},
	pitchDropdownLabel: {
		fontFamily: FONTS.regular,
		fontSize: 11,
		color: COLORS.textLight,
	},
	pitchDropdownValue: {
		fontFamily: FONTS.bold,
		fontSize: 14,
		color: COLORS.textDark,
	},
	pitchDropdownRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
	pitchChangeText: {
		fontFamily: FONTS.semiBold,
		fontSize: 13,
		color: COLORS.primary,
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
		borderColor: "#dbeafe",
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
	trainingBadge: {
		backgroundColor: "#eff6ff",
	},
	bookingBadge: {
		backgroundColor: "#fef3c7",
	},
	typeBadgeText: {
		fontFamily: FONTS.bold,
		fontSize: 10,
		letterSpacing: 0.5,
	},
	trainingBadgeText: {
		color: COLORS.primary,
	},
	bookingBadgeText: {
		color: "#d97706",
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
	timeInputsRow: {
		flexDirection: "row",
	},
	input: {
		backgroundColor: COLORS.white,
		marginBottom: 10,
		fontSize: 13.5,
		fontFamily: FONTS.regular,
	},
	dialogActions: {
		paddingHorizontal: 16,
		paddingBottom: 10,
	},
	errorText: {
		fontFamily: FONTS.medium,
		fontSize: 12,
		color: "#dc2626",
		marginBottom: 8,
	},
});
