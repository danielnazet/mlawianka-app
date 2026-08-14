import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	ImageBackground,
	KeyboardAvoidingView,
	Platform,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import {
	Avatar,
	Card,
	IconButton,
	Snackbar,
	Text,
	TextInput,
} from "react-native-paper";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

type ChatRole = "admin" | "coach" | "parent" | "player";

type ChatContact = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	role: ChatRole;
	team_name: string | null;
};

type ActiveChat = {
	id: string;
	kind: "direct" | "staff";
	title: string;
	subtitle?: string;
};

type ChatMessage = {
	id: string | number;
	conversation_id: string;
	sender_id: string;
	sender_name: string;
	content: string;
	created_at: string;
};

const roleLabels: Record<ChatRole, string> = {
	admin: "Administrator",
	coach: "Trener",
	parent: "Rodzic",
	player: "Zawodnik",
};

const getContactName = (contact: ChatContact) =>
	`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Użytkownik";

const getInitials = (contact: ChatContact) =>
	`${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase() || "U";

export default function ChatScreen() {
	const { user, profile } = useAuth();
	const [contacts, setContacts] = useState<ChatContact[]>([]);
	const [staffConversationId, setStaffConversationId] = useState<string | null>(null);
	const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [newMessageText, setNewMessageText] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [openingChatId, setOpeningChatId] = useState<string | null>(null);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");

	const flatListRef = useRef<FlatList<ChatMessage>>(null);
	const isStaff = profile?.role === "admin" || profile?.role === "coach";

	const loadChatHome = useCallback(async (asRefresh = false) => {
		if (!user || !profile) {
			setLoading(false);
			return;
		}

		asRefresh ? setRefreshing(true) : setLoading(true);
		setError("");

		try {
			const contactsRequest = supabase.rpc("list_chat_contacts");
			const staffRequest = isStaff
				? supabase.rpc("get_staff_conversation")
				: Promise.resolve({ data: null, error: null });

			const [contactsResult, staffResult] = await Promise.all([
				contactsRequest,
				staffRequest,
			]);

			if (contactsResult.error) throw contactsResult.error;
			if (staffResult.error) throw staffResult.error;

			setContacts((contactsResult.data ?? []) as ChatContact[]);
			setStaffConversationId((staffResult.data as string | null) ?? null);
		} catch (err) {
			console.error("Error loading chat home:", err);
			setError("Nie udało się pobrać dostępnych rozmów.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [isStaff, profile, user]);

	useEffect(() => {
		loadChatHome();
	}, [loadChatHome]);

	const openDirectChat = async (contact: ChatContact) => {
		setOpeningChatId(contact.id);
		setError("");

		try {
			const { data, error: rpcError } = await supabase.rpc(
				"get_or_create_direct_chat",
				{ p_other_user_id: contact.id },
			);

			if (rpcError) throw rpcError;
			if (!data) throw new Error("Brak identyfikatora rozmowy");

			setActiveChat({
				id: data as string,
				kind: "direct",
				title: getContactName(contact),
				subtitle: [roleLabels[contact.role], contact.team_name]
					.filter(Boolean)
					.join(" • "),
			});
		} catch (err) {
			console.error("Error opening direct chat:", err);
			setError("Nie możesz rozpocząć tej rozmowy lub wystąpił błąd.");
		} finally {
			setOpeningChatId(null);
		}
	};

	const openStaffChat = () => {
		if (!staffConversationId) return;
		setActiveChat({
			id: staffConversationId,
			kind: "staff",
			title: "Sztab GKS Strzegowo",
			subtitle: "Administratorzy i trenerzy",
		});
	};

	const fetchMessages = useCallback(async () => {
		if (!activeChat) return;
		setMessagesLoading(true);
		setError("");

		try {
			const { data, error: fetchError } = await supabase
				.from("chat_messages")
				.select("id, conversation_id, sender_id, sender_name, content, created_at")
				.eq("conversation_id", activeChat.id)
				.order("created_at", { ascending: true });

			if (fetchError) throw fetchError;
			setMessages((data ?? []) as ChatMessage[]);
		} catch (err) {
			console.error("Error fetching messages:", err);
			setError("Nie udało się pobrać wiadomości.");
		} finally {
			setMessagesLoading(false);
		}
	}, [activeChat]);

	useEffect(() => {
		if (!activeChat) return;

		setMessages([]);
		fetchMessages();

		// Filtr jest po conversation_id, więc klient nie odbiera zdarzeń z innych rozmów.
		const realtimeChannel = supabase
			.channel(`chat:${activeChat.id}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "chat_messages",
					filter: `conversation_id=eq.${activeChat.id}`,
				},
				(payload) => {
					const incoming = payload.new as ChatMessage;
					setMessages((current) =>
						current.some((message) => String(message.id) === String(incoming.id))
							? current
							: [...current, incoming],
					);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(realtimeChannel);
		};
	}, [activeChat, fetchMessages]);

	const handleSendMessage = async () => {
		const content = newMessageText.trim();
		if (!user || !activeChat || !content || sending) return;

		setSending(true);
		setNewMessageText("");
		setError("");

		try {
			const { error: insertError } = await supabase.from("chat_messages").insert({
				conversation_id: activeChat.id,
				sender_id: user.id,
				content,
			});

			if (insertError) throw insertError;
		} catch (err) {
			console.error("Error sending message:", err);
			setNewMessageText(content);
			setError("Nie udało się wysłać wiadomości.");
		} finally {
			setSending(false);
		}
	};

	const renderMessage = ({ item }: { item: ChatMessage }) => {
		const isMine = item.sender_id === user?.id;

		return (
			<View style={[styles.messageBubble, isMine ? styles.ownMessage : styles.otherMessage]}>
				{!isMine && activeChat?.kind === "staff" ? (
					<Text style={styles.messageSender}>{item.sender_name || "Użytkownik"}</Text>
				) : null}
				<Text style={[styles.messageText, isMine && styles.ownMessageText]}>
					{item.content}
				</Text>
				<Text style={[styles.messageTime, isMine && styles.ownMessageTime]}>
					{new Date(item.created_at).toLocaleTimeString("pl-PL", {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</Text>
			</View>
		);
	};

	if (!user || !profile) {
		return (
			<View style={styles.centerContainer}>
				<Avatar.Icon size={64} icon="chat-lock" style={styles.emptyAvatar} />
				<Text variant="titleMedium" style={styles.emptyTitle}>Zaloguj się, aby korzystać z czatu</Text>
				<Text style={styles.emptyText}>Rozmowy klubowe są dostępne tylko dla członków klubu.</Text>
			</View>
		);
	}

	if (loading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	if (activeChat) {
		return (
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
				style={styles.container}
			>
				<View style={styles.chatHeader}>
					<IconButton icon="arrow-left" iconColor={COLORS.white} onPress={() => setActiveChat(null)} />
					<View style={styles.chatHeaderCopy}>
						<Text style={styles.chatHeaderTitle} numberOfLines={1}>{activeChat.title}</Text>
						{activeChat.subtitle ? <Text style={styles.chatHeaderSubtitle}>{activeChat.subtitle}</Text> : null}
					</View>
				</View>

				{messagesLoading && messages.length === 0 ? (
					<View style={styles.centerContainer}>
						<ActivityIndicator color={COLORS.primary} />
					</View>
				) : (
					<FlatList
						ref={flatListRef}
						data={messages}
						renderItem={renderMessage}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={styles.messagesList}
						onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							<View style={styles.emptyMessages}>
								<Avatar.Icon size={56} icon="message-outline" style={styles.emptyAvatar} />
								<Text style={styles.emptyTitle}>Zacznij rozmowę</Text>
								<Text style={styles.emptyText}>Napisz pierwszą wiadomość.</Text>
							</View>
						}
					/>
				)}

				<View style={styles.inputBar}>
					<TextInput
						value={newMessageText}
						onChangeText={setNewMessageText}
						placeholder="Napisz wiadomość…"
						style={styles.textInput}
						contentStyle={styles.textInputContent}
						mode="outlined"
						outlineColor={COLORS.border}
						activeOutlineColor={COLORS.primary}
						textColor={COLORS.textDark}
						multiline
						maxLength={2000}
					/>
					{sending ? (
						<View style={styles.sendingIndicator}>
							<ActivityIndicator size="small" color={COLORS.primary} />
						</View>
					) : (
						<IconButton
							icon="send"
							iconColor={COLORS.white}
							containerColor={COLORS.primary}
							size={22}
							onPress={handleSendMessage}
							disabled={!newMessageText.trim()}
							style={styles.sendButton}
						/>
					)}
				</View>

				<Snackbar visible={Boolean(error)} onDismiss={() => setError("")} duration={3500}>
					{error}
				</Snackbar>
			</KeyboardAvoidingView>
		);
	}

	return (
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={() => loadChatHome(true)} colors={[COLORS.primary]} />
				}
			>
				<View style={styles.intro}>
					<Text style={styles.listTitle}>Wiadomości klubowe</Text>
					<Text style={styles.listSubtitle}>Widzisz tylko osoby, z którymi możesz rozmawiać.</Text>
				</View>

				{isStaff && staffConversationId ? (
					<>
						<Text style={styles.sectionTitle}>Sztab</Text>
						<Card style={[styles.userCard, styles.staffCard]} onPress={openStaffChat}>
							<Card.Content style={styles.userCardContent}>
								<Avatar.Icon size={48} icon="account-group" style={styles.staffAvatar} />
								<View style={styles.userCardInfo}>
									<Text style={styles.staffName}>Sztab GKS Strzegowo</Text>
									<Text style={styles.staffDescription}>Wszyscy administratorzy i trenerzy</Text>
								</View>
								<IconButton icon="chevron-right" iconColor={COLORS.primary} />
							</Card.Content>
						</Card>
					</>
				) : null}

				<Text style={styles.sectionTitle}>
					{isStaff ? "Rozmowy indywidualne" : "Osoby kontaktowe"}
				</Text>

				{contacts.length === 0 ? (
					<View style={styles.emptyContacts}>
						<Avatar.Icon size={56} icon="account-search-outline" style={styles.emptyAvatar} />
						<Text style={styles.emptyTitle}>Brak dostępnych kontaktów</Text>
						<Text style={styles.emptyText}>
							Sprawdź przypisanie drużyny i trenera w panelu administratora.
						</Text>
					</View>
				) : (
					contacts.map((contact) => (
						<Card
							key={contact.id}
							style={styles.userCard}
							onPress={() => openDirectChat(contact)}
							disabled={openingChatId !== null}
						>
							<Card.Content style={styles.userCardContent}>
								<Avatar.Text
									size={48}
									label={getInitials(contact)}
									style={styles.avatar}
									labelStyle={styles.avatarLabel}
								/>
								<View style={styles.userCardInfo}>
									<Text style={styles.userName}>{getContactName(contact)}</Text>
									<Text style={styles.userRole}>
										{[roleLabels[contact.role], contact.team_name].filter(Boolean).join(" • ")}
									</Text>
								</View>
								{openingChatId === contact.id ? (
									<ActivityIndicator color={COLORS.primary} />
								) : (
									<IconButton icon="chevron-right" iconColor={COLORS.textLight} />
								)}
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			<Snackbar visible={Boolean(error)} onDismiss={() => setError("")} duration={3500}>
				{error}
			</Snackbar>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	backgroundImageStyle: { opacity: 0.045, resizeMode: "contain" },
	centerContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 32,
		backgroundColor: COLORS.background,
	},
	scrollContainer: { padding: 16, paddingBottom: 32 },
	intro: { marginBottom: 8 },
	listTitle: { color: COLORS.textDark, fontSize: 24, fontFamily: FONTS.extraBold },
	listSubtitle: { color: COLORS.textLight, fontSize: 14, marginTop: 4, fontFamily: FONTS.regular },
	sectionTitle: {
		color: COLORS.textDark,
		fontSize: 13,
		fontFamily: FONTS.extraBold,
		letterSpacing: 0.6,
		marginBottom: 10,
		marginTop: 22,
		textTransform: "uppercase",
	},
	userCard: {
		backgroundColor: COLORS.white,
		borderColor: COLORS.border,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 10,
		elevation: 1,
	},
	staffCard: { backgroundColor: COLORS.primaryLight, borderColor: "#bfdbfe" },
	userCardContent: { alignItems: "center", flexDirection: "row", paddingVertical: 10 },
	userCardInfo: { flex: 1, marginLeft: 14 },
	avatar: { backgroundColor: COLORS.primary },
	avatarLabel: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
	staffAvatar: { backgroundColor: COLORS.primary },
	userName: { color: COLORS.textDark, fontSize: 16, fontFamily: FONTS.bold },
	userRole: { color: COLORS.textLight, fontSize: 13, marginTop: 3, fontFamily: FONTS.regular },
	staffName: { color: COLORS.primaryDark, fontSize: 16, fontFamily: FONTS.extraBold },
	staffDescription: { color: COLORS.textLight, fontSize: 13, marginTop: 3, fontFamily: FONTS.regular },
	emptyContacts: {
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderColor: COLORS.border,
		borderRadius: 16,
		borderWidth: 1,
		padding: 28,
	},
	emptyMessages: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
	emptyAvatar: { backgroundColor: COLORS.primaryLight },
	emptyTitle: { color: COLORS.textDark, fontSize: 17, fontFamily: FONTS.bold, marginTop: 12, textAlign: "center" },
	emptyText: { color: COLORS.textLight, fontSize: 14, lineHeight: 20, marginTop: 5, fontFamily: FONTS.regular, textAlign: "center" },
	chatHeader: {
		alignItems: "center",
		backgroundColor: COLORS.primary,
		flexDirection: "row",
		minHeight: 64,
		paddingRight: 16,
	},
	chatHeaderCopy: { flex: 1 },
	chatHeaderTitle: { color: COLORS.white, fontSize: 17, fontFamily: FONTS.extraBold },
	chatHeaderSubtitle: { color: "#dbeafe", fontSize: 12, marginTop: 2, fontFamily: FONTS.regular },
	messagesList: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 18 },
	messageBubble: {
		alignSelf: "flex-start",
		backgroundColor: COLORS.white,
		borderColor: COLORS.border,
		borderRadius: 18,
		borderBottomLeftRadius: 5,
		borderWidth: 1,
		marginVertical: 4,
		maxWidth: "82%",
		paddingHorizontal: 13,
		paddingVertical: 9,
	},
	ownMessage: {
		alignSelf: "flex-end",
		backgroundColor: COLORS.primary,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 5,
		borderColor: COLORS.primary,
	},
	otherMessage: {},
	messageSender: { color: COLORS.primary, fontSize: 11, fontFamily: FONTS.bold, marginBottom: 3 },
	messageText: { color: COLORS.textDark, fontSize: 15, lineHeight: 20, fontFamily: FONTS.regular },
	ownMessageText: { color: COLORS.white },
	messageTime: { alignSelf: "flex-end", color: COLORS.textLight, fontSize: 10, marginTop: 4, fontFamily: FONTS.regular },
	ownMessageTime: { color: "#bfdbfe" },
	inputBar: {
		alignItems: "flex-end",
		backgroundColor: COLORS.white,
		borderTopColor: COLORS.border,
		borderTopWidth: 1,
		flexDirection: "row",
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	textInput: { backgroundColor: COLORS.white, flex: 1, maxHeight: 120 },
	textInputContent: { minHeight: 44 },
	sendButton: { marginBottom: 2, marginLeft: 7 },
	sendingIndicator: {
		alignItems: "center",
		height: 48,
		justifyContent: "center",
		marginLeft: 7,
		width: 48,
	},
});
