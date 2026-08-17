import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, Animated, View, StyleSheet, Text, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { COLORS } from "../css/colors";
import { FONTS } from "../css/fonts";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

interface NotificationContextProps {
	showLocalToast: (title: string, body: string, icon: string, targetScreen: string) => void;
	unreadChatsCount: number;
	unreadAnnouncementsCount: number;
	unreadChatsMap: Record<string, number>;
	markChatAsRead: (chatKey: string) => void;
	setActiveChatId: (chatId: string | null) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error("useNotifications must be used within a NotificationProvider");
	}
	return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, profile } = useAuth();
	const insets = useSafeAreaInsets();

	// Stan banneru powiadomienia w pierwszym planie
	const [toastTitle, setToastTitle] = useState("");
	const [toastBody, setToastBody] = useState("");
	const [toastIcon, setToastIcon] = useState("bell");
	const [toastRoute, setToastRoute] = useState("");
	const [toastVisible, setToastVisible] = useState(false);

	const slideAnim = useRef(new Animated.Value(-120)).current;
	const toastTimeout = useRef<NodeJS.Timeout | null>(null);

	const [appState, setAppState] = useState(AppState.currentState);

	// Liczniki nieprzeczytanych powiadomień wewnątrz aplikacji
	const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
	const [unreadChatsMap, setUnreadChatsMap] = useState<Record<string, number>>({});
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const [staffConversationId, setStaffConversationId] = useState<string | null>(null);
	const pathname = usePathname();

	// Obliczanie sumy nieprzeczytanych czatów
	const unreadChatsCount = Object.values(unreadChatsMap).reduce((a, b) => a + b, 0);

	// Odczyt liczników z pamięci lokalnej
	useEffect(() => {
		if (user) {
			AsyncStorage.getItem(`unread_chats_map_${user.id}`).then((val) => {
				if (val) {
					try {
						setUnreadChatsMap(JSON.parse(val));
					} catch (e) {}
				}
			});
		} else {
			setUnreadChatsMap({});
		}
	}, [user]);

	// Zapis liczników do pamięci lokalnej
	useEffect(() => {
		if (user) {
			void AsyncStorage.setItem(`unread_chats_map_${user.id}`, JSON.stringify(unreadChatsMap));
		}
	}, [unreadChatsMap, user]);

	// Inicjalne pobieranie ID pokoju sztabu
	useEffect(() => {
		const fetchStaffConv = async () => {
			if (!user || !profile) return;
			if (profile.role === "admin" || profile.role === "coach") {
				try {
					const { data: staffData } = await supabase
						.from("chat_conversations")
						.select("id")
						.eq("conversation_key", "staff:gks-strzegowo")
						.single();

					if (staffData) {
						setStaffConversationId(staffData.id);
					}
				} catch (e) {}
			}
		};
		void fetchStaffConv();
	}, [user, profile]);

	const markChatAsRead = (chatKey: string) => {
		setUnreadChatsMap((prev) => ({
			...prev,
			[chatKey]: 0,
		}));
	};

	// Zerowanie liczników ogłoszeń w zależności od aktywnego ekranu
	useEffect(() => {
		if (pathname === "/news") {
			setUnreadAnnouncementsCount(0);
		}
	}, [pathname]);

	// Rejestracja powiadomień Push i tokenu w Supabase
	useEffect(() => {
		const registerPushNotifications = async () => {
			if (Platform.OS === "web" || !user) return;

			try {
				const { status: existingStatus } = await Notifications.getPermissionsAsync();
				let finalStatus = existingStatus;
				if (existingStatus !== "granted") {
					const { status } = await Notifications.requestPermissionsAsync();
					finalStatus = status;
				}

				if (finalStatus !== "granted") {
					console.log("Notification permission not granted");
					return;
				}

				const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
				const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
				const token = tokenData.data;

				// Zapisujemy token push w profilu użytkownika
				await supabase
					.from("profiles")
					.update({ push_token: token })
					.eq("id", user.id);

				console.log("Registered Expo Push Token for user:", user.id);
			} catch (err) {
				console.warn("Failed to register push token:", err);
			}
		};

		void registerPushNotifications();
	}, [user]);



	// Obsługa odznak ikony aplikacji (Badge count) przy przechodzeniu w tło
	useEffect(() => {
		const handleAppStateChange = async (nextAppState: AppStateStatus) => {
			if (appState.match(/inactive|background/) && nextAppState === "active") {
				// Wyczyszczenie odznaki przy powrocie do aplikacji
				if (Platform.OS !== "web") {
					await Notifications.setBadgeCountAsync(0);
				}
			}
			setAppState(nextAppState);
		};

		const subscription = AppState.addEventListener("change", handleAppStateChange);
		return () => subscription.remove();
	}, [appState]);

	// Wyświetlanie ładnego in-app toastu w kolorystyce GKS Strzegowo
	const showLocalToast = (title: string, body: string, icon: string, targetScreen: string) => {
		// Przerwij poprzednie odliczanie czasu zniknięcia
		if (toastTimeout.current) clearTimeout(toastTimeout.current);

		setToastTitle(title);
		setToastBody(body);
		setToastIcon(icon);
		setToastRoute(targetScreen);
		setToastVisible(true);

		// Dźwięk wibracji haptycznej przy powiadomieniu
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

		// Wsuwanie z góry
		Animated.spring(slideAnim, {
			toValue: insets.top + 10,
			useNativeDriver: true,
			bounciness: 8,
			speed: 12,
		}).start();

		// Ukryj powiadomienie automatycznie po 4.5 sekundy
		toastTimeout.current = setTimeout(() => {
			hideLocalToast();
		}, 4500);
	};

	const hideLocalToast = () => {
		Animated.timing(slideAnim, {
			toValue: -120,
			duration: 200,
			useNativeDriver: true,
		}).start(() => setToastVisible(false));
	};

	const handleToastPress = () => {
		hideLocalToast();
		if (toastRoute) {
			router.push(toastRoute as any);
		}
	};

	// Supabase Realtime nasłuchiwanie w tle zmian w bazie danych
	useEffect(() => {
		if (!user) return;

		const channel = supabase.channel("realtime-notifications-channel");

		// 1. Uruchomienie nasłuchu nowych aktualności (News)
		channel.on(
			"postgres_changes",
			{ event: "INSERT", schema: "public", table: "news" },
			(payload) => {
				const newPost = payload.new as any;
				if (newPost.is_important || newPost.is_first_team) {
					const title = newPost.is_important ? "Ważna Wiadomość!" : "GKS Strzegowo - Aktualności";
					showLocalToast(
						title,
						newPost.title,
						"newspaper",
						"/news"
					);
				}
			}
		);

		// 2. Uruchomienie nasłuchu nowych ogłoszeń (Announcements)
		channel.on(
			"postgres_changes",
			{ event: "INSERT", schema: "public", table: "announcements" },
			(payload) => {
				const newAnn = payload.new as any;
				const userTeamId = profile?.team_id;

				// Wyświetl tylko jeśli ogłoszenie jest dla wszystkich (team_id is null)
				// LUB dotyczy grupy zalogowanego użytkownika (zawodnika/rodzica)
				if (newAnn.team_id === null || (userTeamId && newAnn.team_id === userTeamId)) {
					showLocalToast(
						"Nowy komunikat klubowy!",
						newAnn.title,
						"bullhorn-variant-outline",
						"/news"
					);
					if (pathname !== "/news") {
						setUnreadAnnouncementsCount((prev) => prev + 1);
					}
				}
			}
		);

		// 3. Uruchomienie nasłuchu terminarza (Trainings & Matches)
		channel.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "trainings" },
			(payload) => {
				const userTeamId = profile?.team_id;

				const newTraining = payload.new as any;
				// Wyzwalaj tylko dla treningów przypisanych do grupy użytkownika
				if (newTraining && (newTraining.team_id === null || (userTeamId && newTraining.team_id === userTeamId))) {
					const training = newTraining;
					if (payload.eventType === "INSERT") {
						showLocalToast(
							"Dodano nowy mecz / trening",
							`${training.title} - ${training.time}`,
							"calendar-plus",
							"/training"
						);
					} else if (payload.eventType === "UPDATE") {
						showLocalToast(
							"Zaktualizowano wydarzenie w terminarzu",
							`${training.title} - ${training.time}`,
							"calendar-edit",
							"/training"
						);
					}
				}
			}
		);

		// 4. Uruchomienie nasłuchu czatu (Chat Messages)
		channel.on(
			"postgres_changes",
			{ event: "INSERT", schema: "public", table: "chat_messages" },
			(payload) => {
				const message = payload.new as any;

				// Ignorujemy wiadomości wysłane przez nas samych
				if (message.sender_id === user.id) return;

				// Sprawdzamy czy ten czat jest aktualnie otwarty w aplikacji
				if (activeChatId !== message.conversation_id) {
					setUnreadChatsMap((prev) => {
						const key = message.conversation_id === staffConversationId ? "staff" : message.sender_id;
						return {
							...prev,
							[key]: (prev[key] || 0) + 1,
						};
					});
				}

				showLocalToast(
					`Nowa wiadomość od: ${message.sender_name || "Czat"}`,
					message.content,
					"message-text-outline",
					"/chat"
				);

				// Zwiększenie badge na ikonie gdy aplikacja jest w tle
				if (Platform.OS !== "web" && AppState.currentState !== "active") {
					void Notifications.getBadgeCountAsync().then((count) => {
						void Notifications.setBadgeCountAsync(count + 1);
					});
				}
			}
		);

		// Aktywacja subskrypcji realtime
		channel.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [user, profile, pathname, activeChatId, staffConversationId]);

	return (
		<NotificationContext.Provider value={{ showLocalToast, unreadChatsCount, unreadAnnouncementsCount, unreadChatsMap, markChatAsRead, setActiveChatId }}>
			{children}

			{/* Graficzny baner powiadomień w pierwszym planie */}
			{toastVisible && (
				<Animated.View
					style={[
						styles.toastContainer,
						{
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<TouchableOpacity
						activeOpacity={0.92}
						onPress={handleToastPress}
						style={styles.toastPressable}
					>
						<View style={styles.toastIconWrapper}>
							<MaterialCommunityIcons
								name={toastIcon as any}
								size={22}
								color={COLORS.white}
							/>
						</View>
						<View style={styles.toastContent}>
							<Text style={styles.toastTitle} numberOfLines={1}>
								{toastTitle}
							</Text>
							<Text style={styles.toastBody} numberOfLines={2}>
								{toastBody}
							</Text>
						</View>
						<TouchableOpacity
							onPress={(e) => {
								e.stopPropagation();
								hideLocalToast();
							}}
							style={styles.toastCloseBtn}
						>
							<MaterialCommunityIcons
								name="close"
								size={18}
								color={COLORS.textLight}
							/>
						</TouchableOpacity>
					</TouchableOpacity>
				</Animated.View>
			)}
		</NotificationContext.Provider>
	);
};

const styles = StyleSheet.create({
	toastContainer: {
		position: "absolute",
		left: 12,
		right: 12,
		zIndex: 99999,
		backgroundColor: COLORS.white,
		borderRadius: 16,
		// Premium cień (iOS)
		shadowColor: "#0f172a",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		// Premium cień (Android)
		elevation: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
		overflow: "hidden",
	},
	toastPressable: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	toastIconWrapper: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: COLORS.primary,
		alignItems: "center",
		justifyContent: "center",
	},
	toastContent: {
		flex: 1,
		marginLeft: 12,
		marginRight: 8,
	},
	toastTitle: {
		fontSize: 14,
		fontFamily: FONTS.extraBold,
		color: COLORS.textDark,
		marginBottom: 1,
	},
	toastBody: {
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		lineHeight: 17,
	},
	toastCloseBtn: {
		padding: 4,
		alignSelf: "flex-start",
	},
});
