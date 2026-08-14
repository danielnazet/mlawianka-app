import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ImageBackground } from "react-native";
import { Card, Title, Text, TextInput, Button, Avatar, IconButton } from "react-native-paper";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

interface Message {
	id: number;
	sender_id: string;
	recipient_id: string | null;
	channel: string | null;
	content: string;
	created_at: string;
	sender_name?: string; // Dołączane po stronie klienta
}

interface ChatUser {
	id: string;
	first_name: string;
	last_name: string;
	role: string;
}

export default function ChatScreen() {
	const { user, profile } = useAuth();
	const [activeChat, setActiveChat] = useState<{ channel?: string; recipient?: ChatUser } | null>(null);
	const [usersList, setUsersList] = useState<ChatUser[]>([]);
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessageText, setNewMessageText] = useState("");
	const [loading, setLoading] = useState(true);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [sending, setSending] = useState(false);

	const flatListRef = useRef<FlatList>(null);

	// Pobieranie listy osób do rozmowy dla trenerów i administratorów
	useEffect(() => {
		if (!user || !profile) return;

		const fetchUsersList = async () => {
			if (profile.role === "admin" || profile.role === "coach") {
				try {
					// Pobierz wszystkich rodziców i zawodników
					const { data, error } = await supabase
						.from("profiles")
						.select("id, first_name, last_name, role")
						.in("role", ["parent", "player"])
						.order("last_name", { ascending: true });

					if (error) throw error;
					setUsersList(data || []);
				} catch (err) {
					console.error("Error fetching users for chat list:", err);
				} finally {
					setLoading(false);
				}
			} else {
				// Dla rodziców i zawodników: automatycznie znajdź trenera drużyny
				try {
					let userTeamId = profile.team_id;

					if (profile.role === "parent") {
						// Znajdź dziecko rodzica
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
						// Pobierz trenera przypisanego do tej drużyny
						const { data: teamData, error: teamErr } = await supabase
							.from("teams")
							.select("coach_id")
							.eq("id", userTeamId)
							.single();

						if (teamErr) throw teamErr;

						if (teamData?.coach_id) {
							const { data: coachProfile, error: coachErr } = await supabase
								.from("profiles")
								.select("id, first_name, last_name, role")
								.eq("id", teamData.coach_id)
								.single();

							if (coachErr) throw coachErr;

							if (coachProfile) {
								setActiveChat({ recipient: coachProfile });
							}
						}
					}
				} catch (err) {
					console.error("Error finding team coach for chat:", err);
				} finally {
					setLoading(false);
				}
			}
		};

		fetchUsersList();
	}, [user, profile]);

	// Pobieranie wiadomości dla wybranej konwersacji
	const fetchMessages = async () => {
		if (!user || !activeChat) return;
		setMessagesLoading(true);

		try {
			let query = supabase.from("chat_messages").select("*");

			if (activeChat.channel) {
				// Czat grupowy
				query = query.eq("channel", activeChat.channel);
			} else if (activeChat.recipient) {
				// Czat 1-na-1
				const otherId = activeChat.recipient.id;
				query = query.or(
					`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
				);
			}

			const { data, error } = await query.order("created_at", { ascending: true });
			if (error) throw error;

			// Pobierz nazwy nadawców do wyświetlenia
			const msgs = data || [];
			const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)));

			if (senderIds.length > 0) {
				const { data: profilesData } = await supabase
					.from("profiles")
					.select("id, first_name, last_name")
					.in("id", senderIds);

				const profileMap = new Map(profilesData?.map((p) => [p.id, `${p.first_name} ${p.last_name}`]) || []);
				const enrichedMsgs = msgs.map((m) => ({
					...m,
					sender_name: profileMap.get(m.sender_id) || "Użytkownik",
				}));
				setMessages(enrichedMsgs);
			} else {
				setMessages(msgs);
			}
		} catch (err) {
			console.error("Error fetching chat messages:", err);
		} finally {
			setMessagesLoading(false);
		}
	};

	useEffect(() => {
		if (activeChat) {
			fetchMessages();

			// Subskrypcja Supabase Realtime
			const channelName = activeChat.channel ? activeChat.channel : `room-${activeChat.recipient?.id}`;
			const chatChannel = supabase
				.channel(channelName)
				.on(
					"postgres_changes",
					{ event: "INSERT", schema: "public", table: "chat_messages" },
					async (payload) => {
						const newMsg = payload.new as Message;

						// Sprawdź czy nowa wiadomość pasuje do wybranego czatu
						let isRelevant = false;
						if (activeChat.channel && newMsg.channel === activeChat.channel) {
							isRelevant = true;
						} else if (activeChat.recipient) {
							const otherId = activeChat.recipient.id;
							if (
								user &&
								((newMsg.sender_id === user.id && newMsg.recipient_id === otherId) ||
								(newMsg.sender_id === otherId && newMsg.recipient_id === user.id))
							) {
								isRelevant = true;
							}
						}

						if (isRelevant) {
							// Pobierz profil nadawcy dla nowej wiadomości
							const { data: senderProf } = await supabase
								.from("profiles")
								.select("first_name, last_name")
								.eq("id", newMsg.sender_id)
								.single();

							const senderName = senderProf ? `${senderProf.first_name} ${senderProf.last_name}` : "Użytkownik";
							setMessages((prev) => [...prev, { ...newMsg, sender_name: senderName }]);
						}
					}
				)
				.subscribe();

			return () => {
				supabase.removeChannel(chatChannel);
			};
		}
	}, [activeChat]);

	// Auto-scroll do dołu listy po załadowaniu nowych wiadomości
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages]);

	const handleSendMessage = async () => {
		if (!user || !activeChat || !newMessageText.trim()) return;

		setSending(true);
		const text = newMessageText.trim();
		setNewMessageText("");

		try {
			const insertData: any = {
				sender_id: user.id,
				content: text,
			};

			if (activeChat.channel) {
				insertData.channel = activeChat.channel;
			} else if (activeChat.recipient) {
				insertData.recipient_id = activeChat.recipient.id;
			}

			const { error } = await supabase.from("chat_messages").insert([insertData]);
			if (error) throw error;
		} catch (err) {
			console.error("Error sending message:", err);
		} finally {
			setSending(false);
		}
	};

	const renderMessageItem = ({ item }: { item: Message }) => {
		const isOwnMessage = item.sender_id === user?.id;

		return (
			<View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
				{!isOwnMessage && <Text style={styles.messageSender}>{item.sender_name}</Text>}
				<Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
					{item.content}
				</Text>
				<Text style={[styles.messageTime, isOwnMessage ? styles.ownTime : styles.otherTime]}>
					{new Date(item.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
				</Text>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	// Widok czatu 1-na-1 lub grupowego
	if (activeChat) {
		const chatTitle = activeChat.channel
			? "Czat Trenerzy & Admini"
			: activeChat.recipient
			? `${activeChat.recipient.first_name} ${activeChat.recipient.last_name}`
			: "Konwersacja";

		return (
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.container}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				{/* Górny Pasek Czatu */}
				<View style={styles.chatHeader}>
					{(profile?.role === "admin" || profile?.role === "coach") && (
						<IconButton
							icon="arrow-left"
							iconColor={COLORS.white}
							onPress={() => setActiveChat(null)}
						/>
					)}
					<Title style={styles.chatHeaderTitle}>{chatTitle}</Title>
				</View>

				{messagesLoading && messages.length === 0 ? (
					<View style={styles.centerContainer}>
						<ActivityIndicator size="small" color={COLORS.primary} />
					</View>
				) : (
					<FlatList
						ref={flatListRef}
						data={messages}
						renderItem={renderMessageItem}
						keyExtractor={(item) => item.id.toString()}
						contentContainerStyle={styles.messagesList}
						ListEmptyComponent={
							<View style={styles.centerContainer}>
								<Text style={styles.emptyText}>Brak wiadomości. Wyślij pierwszą!</Text>
							</View>
						}
					/>
				)}

				{/* Pasek wprowadzania tekstu */}
				<View style={styles.inputBar}>
					<TextInput
						value={newMessageText}
						onChangeText={setNewMessageText}
						placeholder="Napisz wiadomość..."
						style={styles.textInput}
						dense
						mode="outlined"
						outlineColor={COLORS.border}
						activeOutlineColor={COLORS.primary}
						textColor={COLORS.textDark}
					/>
					<Button
						mode="contained"
						onPress={handleSendMessage}
						style={styles.sendBtn}
						loading={sending}
						disabled={!newMessageText.trim() || sending}
					>
						Wyślij
					</Button>
				</View>
			</KeyboardAvoidingView>
		);
	}

	// Widok listy konwersacji (tylko dla trenerów / adminów)
	return (
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<Title style={styles.listTitle}>Wybierz rozmowę</Title>

				{/* Czat Grupowy Trenerów/Adminów */}
				<Card
					style={[styles.userCard, styles.groupCard]}
					onPress={() => setActiveChat({ channel: "coaches_admins" })}
				>
					<Card.Content style={styles.userCardContent}>
						<Avatar.Icon size={44} icon="forum" style={styles.groupAvatar} />
						<View style={styles.userCardInfo}>
							<Text style={styles.groupName}>Czat Trenerzy & Administratorzy</Text>
							<Text style={styles.groupDesc}>Wspólny kanał wiadomości</Text>
						</View>
					</Card.Content>
				</Card>

				<Text style={styles.sectionTitle}>Czaty z zawodnikami i rodzicami</Text>

				{usersList.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>Brak zarejestrowanych zawodników i rodziców.</Text>
					</View>
				) : (
					usersList.map((u) => (
						<Card
							key={u.id}
							style={styles.userCard}
							onPress={() => setActiveChat({ recipient: u })}
						>
							<Card.Content style={styles.userCardContent}>
								<Avatar.Text
									size={44}
									label={`${u.first_name[0]}${u.last_name[0]}`}
									style={styles.avatar}
									labelStyle={styles.avatarLabel}
								/>
								<View style={styles.userCardInfo}>
									<Text style={styles.userName}>{`${u.first_name} ${u.last_name}`}</Text>
									<Text style={styles.userRole}>
										{u.role === "parent" ? "Rodzic" : "Zawodnik"}
									</Text>
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>
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
	},
	centerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
	},
	scrollContainer: {
		padding: 16,
	},
	listTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: COLORS.primary,
		marginBottom: 16,
		textAlign: "center",
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginTop: 24,
		marginBottom: 12,
	},
	userCard: {
		marginBottom: 10,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		elevation: 1,
	},
	groupCard: {
		backgroundColor: COLORS.primaryLight,
		borderColor: COLORS.primary,
		borderWidth: 1,
	},
	userCardContent: {
		flexDirection: "row",
		alignItems: "center",
	},
	avatar: {
		backgroundColor: COLORS.primary,
	},
	avatarLabel: {
		color: COLORS.white,
		fontWeight: "bold",
	},
	groupAvatar: {
		backgroundColor: COLORS.primary,
	},
	userCardInfo: {
		marginLeft: 16,
		flex: 1,
	},
	userName: {
		fontWeight: "bold",
		fontSize: 16,
		color: COLORS.textDark,
	},
	userRole: {
		color: COLORS.textLight,
		fontSize: 13,
	},
	groupName: {
		fontWeight: "bold",
		fontSize: 16,
		color: COLORS.primary,
	},
	groupDesc: {
		color: COLORS.textLight,
		fontSize: 13,
	},
	emptyContainer: {
		padding: 24,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 14,
	},
	chatHeader: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.primary,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	chatHeaderTitle: {
		color: COLORS.white,
		fontSize: 18,
		fontWeight: "bold",
		marginLeft: 8,
	},
	messagesList: {
		padding: 16,
		flexGrow: 1,
	},
	messageBubble: {
		padding: 12,
		borderRadius: 12,
		marginVertical: 4,
		maxWidth: "75%",
	},
	ownMessage: {
		backgroundColor: COLORS.primary,
		alignSelf: "flex-end",
		borderBottomRightRadius: 2,
	},
	otherMessage: {
		backgroundColor: COLORS.white,
		alignSelf: "flex-start",
		borderBottomLeftRadius: 2,
		borderColor: COLORS.border,
		borderWidth: 1,
	},
	messageSender: {
		fontSize: 11,
		color: COLORS.primary,
		fontWeight: "bold",
		marginBottom: 4,
	},
	messageText: {
		fontSize: 14,
	},
	ownMessageText: {
		color: COLORS.white,
	},
	otherMessageText: {
		color: COLORS.textDark,
	},
	messageTime: {
		fontSize: 10,
		alignSelf: "flex-end",
		marginTop: 4,
	},
	ownTime: {
		color: "#93c5fd",
	},
	otherTime: {
		color: COLORS.textLight,
	},
	inputBar: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		backgroundColor: COLORS.white,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
	},
	textInput: {
		flex: 1,
		backgroundColor: COLORS.white,
		marginRight: 10,
	},
	sendBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 8,
	},
});
