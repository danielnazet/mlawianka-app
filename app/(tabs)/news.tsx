import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Dimensions, ImageBackground, ScrollView, TouchableOpacity, Image } from "react-native";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

interface NewsItem {
	id: number;
	title: string;
	content: string;
	created_at: string;
	is_first_team: boolean;
	image_url?: string;
}

interface AnnouncementItem {
	id: number;
	title: string;
	content: string;
	created_at: string;
	sender: {
		first_name: string;
		last_name: string;
	} | null;
	team_id: number | null;
}

const SAMPLE_IMAGES = [
	"https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600", // Stadion
	"https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600", // Trening lekkoatletyczny
	"https://images.unsplash.com/photo-1579952362874-86e40020a3cb?q=80&w=600", // Piłka na murawie
	"https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600", // Zbliżenie na piłkę i korki
	"https://images.unsplash.com/photo-1526232761682-d26e4f9c6352?q=80&w=600", // Dziecięcy mecz piłki nożnej
];

const getNewsImage = (item: NewsItem, index: number) => {
	if (item.image_url && item.image_url.startsWith("http")) {
		return item.image_url;
	}
	const idx = index >= 0 ? index : 0;
	return SAMPLE_IMAGES[idx % SAMPLE_IMAGES.length];
};

export default function NewsScreen() {
	const { user, profile } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("news");
	const [news, setNews] = useState<NewsItem[]>([]);
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

	const fetchData = async () => {
		try {
			setLoading(true);
			// Pobierz aktualności
			const { data: newsData, error: newsError } = await supabase
				.from("news")
				.select("*")
				.order("created_at", { ascending: false });

			if (newsError) throw newsError;
			setNews(newsData || []);

			// Pobierz ogłoszenia (tylko dla zalogowanych)
			if (user) {
				let query = supabase
					.from("announcements")
					.select("*, sender:profiles!announcements_sender_id_fkey(first_name, last_name)");

				// Filtruj ogłoszenia w zależności od roli i zespołu zawodnika/rodzica
				if (profile && profile.role !== "admin" && profile.role !== "coach") {
					const userTeamId = profile.team_id;
					if (userTeamId) {
						query = query.or(`team_id.is.null,team_id.eq.${userTeamId}`);
					} else {
						query = query.is("team_id", null);
					}
				}

				const { data: annData, error: annError } = await query.order("created_at", { ascending: false });
				if (annError) throw annError;
				setAnnouncements(annData || []);
			}
		} catch (error) {
			console.error("Error fetching news/announcements data:", error);
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

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("pl-PL", {
			day: "2-digit",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const renderNewsItem = ({ item, index }: { item: NewsItem; index: number }) => {
		const imageUrl = getNewsImage(item, index);

		if (index === 0) {
			// Główny (pierwszy) news – duża karta wyróżniona
			return (
				<TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedNews(item)}>
					<Card style={styles.featuredCard}>
						<ImageBackground
							source={{ uri: imageUrl }}
							style={styles.featuredCover}
							imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
						/>
						<Card.Content style={styles.featuredContent}>
							<View style={styles.badgeRow}>
								<Text style={styles.featuredBadge}>NAJWAŻNIEJSZE</Text>
							</View>
							<Title style={styles.featuredTitle}>{item.title}</Title>
							<Text style={styles.date}>{formatDate(item.created_at)}</Text>
							<Paragraph numberOfLines={3} style={styles.featuredContentText}>
								{item.content}
							</Paragraph>
						</Card.Content>
					</Card>
				</TouchableOpacity>
			);
		}

		// Kolejne newsy – mniejsze karty w stylu Flashscore (poziomy układ z obrazkiem)
		return (
			<TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedNews(item)}>
				<Card style={styles.smallCard}>
					<View style={styles.horizontalRow}>
						<ImageBackground
							source={{ uri: imageUrl }}
							style={styles.smallCover}
							imageStyle={{ borderRadius: 8 }}
						/>
						<View style={styles.smallCardTextContent}>
							<View style={styles.smallBadgeRow}>
								<Text style={styles.smallNewsBadge}>Pierwszy Zespół</Text>
							</View>
							<Title numberOfLines={2} style={styles.smallCardTitle}>
								{item.title}
							</Title>
							<Text style={styles.smallCardDate}>{formatDate(item.created_at)}</Text>
						</View>
					</View>
				</Card>
			</TouchableOpacity>
		);
	};

	const renderAnnouncementItem = ({ item }: { item: AnnouncementItem }) => (
		<Card style={[styles.card, styles.announcementCard]}>
			<Card.Content>
				<View style={styles.badgeRow}>
					<Text style={styles.announcementBadge}>
						{item.team_id ? "Dla Twojej drużyny" : "Ogólne"}
					</Text>
				</View>
				<Title style={styles.cardTitle}>{item.title}</Title>
				<Text style={styles.sender}>
					Dodał: {item.sender ? `${item.sender.first_name} ${item.sender.last_name}` : "Trener"} • {formatDate(item.created_at)}
				</Text>
				<Paragraph style={styles.content}>{item.content}</Paragraph>
			</Card.Content>
		</Card>
	);

	if (loading && !refreshing) {
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
			{/* Segmented Buttons for tabs navigation */}
			<View style={styles.tabContainer}>
				<SegmentedButtons
					value={activeTab}
					onValueChange={setActiveTab}
					buttons={[
						{
							value: "news",
							label: "Pierwszy Zespół",
							icon: "newspaper",
							checkedColor: COLORS.white,
							style: activeTab === "news" ? styles.activeTabButton : styles.inactiveTabButton,
						},
						{
							value: "announcements",
							label: "Ogłoszenia",
							icon: "bullhorn",
							checkedColor: COLORS.white,
							style: activeTab === "announcements" ? styles.activeTabButton : styles.inactiveTabButton,
						},
					]}
					style={styles.segmentedButtons}
				/>
			</View>

			{activeTab === "news" ? (
				<FlatList
					data={news}
					renderItem={({ item, index }) => renderNewsItem({ item, index })}
					keyExtractor={(item) => item.id.toString()}
					contentContainerStyle={styles.list}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={[COLORS.primary]}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Text style={styles.emptyText}>Brak aktualności na ten moment.</Text>
						</View>
					}
				/>
			) : (
				// Sekcja Ogłoszeń
				!user ? (
					<View style={styles.guestContainer}>
						<Card style={styles.guestCard}>
							<Card.Content style={styles.guestContent}>
								<Title style={styles.guestTitle}>Ogłoszenia Trenerów</Title>
								<Paragraph style={styles.guestDescription}>
									Zaloguj się jako rodzic lub zawodnik, aby zobaczyć ważne ogłoszenia od trenerów GKS Strzegowo przeznaczone dla Twojej drużyny.
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
					<FlatList
						data={announcements}
						renderItem={renderAnnouncementItem}
						keyExtractor={(item) => item.id.toString()}
						contentContainerStyle={styles.list}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={onRefresh}
								colors={[COLORS.primary]}
							/>
						}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>Brak nowych ogłoszeń dla Twojej grupy.</Text>
							</View>
						}
					/>
				)
			)}

			{/* Modal szczegółów aktualności */}
			<Portal>
				<Dialog visible={!!selectedNews} onDismiss={() => setSelectedNews(null)}>
					{selectedNews && (
						<>
							<Dialog.Title style={styles.dialogTitle}>{selectedNews.title}</Dialog.Title>
							<Dialog.Content style={styles.dialogContent}>
								<ScrollView style={styles.dialogScroll}>
									<ImageBackground
										source={{ uri: getNewsImage(selectedNews, news.findIndex(n => n.id === selectedNews.id)) }}
										style={styles.dialogCover}
										imageStyle={{ borderRadius: 8 }}
									/>
									<Text style={styles.dialogDate}>{formatDate(selectedNews.created_at)}</Text>
									<Paragraph style={styles.dialogText}>{selectedNews.content}</Paragraph>
								</ScrollView>
							</Dialog.Content>
							<Dialog.Actions>
								<Button onPress={() => setSelectedNews(null)}>Zamknij</Button>
							</Dialog.Actions>
						</>
					)}
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
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 4,
	},
	segmentedButtons: {
		borderRadius: 8,
	},
	activeTabButton: {
		backgroundColor: COLORS.primary,
	},
	inactiveTabButton: {
		backgroundColor: COLORS.white,
	},
	list: {
		padding: 16,
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
	announcementCard: {
		borderLeftColor: COLORS.success,
	},
	badgeRow: {
		flexDirection: "row",
		marginBottom: 6,
	},
	newsBadge: {
		fontSize: 10,
		fontWeight: "bold",
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	announcementBadge: {
		fontSize: 10,
		fontWeight: "bold",
		color: COLORS.success,
		backgroundColor: "#e6fbf3",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginBottom: 4,
	},
	date: {
		color: COLORS.textLight,
		fontSize: 12,
		marginBottom: 12,
	},
	sender: {
		color: COLORS.textLight,
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 12,
	},
	content: {
		color: COLORS.textDark,
		lineHeight: 20,
		fontSize: 14,
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

	// Stylizacja dla wyróżnionego (featured) newsa
	featuredCard: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		overflow: "hidden",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
	},
	featuredCover: {
		width: "100%",
		height: 180,
		resizeMode: "cover",
	},
	featuredContent: {
		padding: 16,
	},
	featuredBadge: {
		fontSize: 10,
		fontWeight: "bold",
		color: COLORS.white,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	featuredTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginTop: 4,
		marginBottom: 2,
	},
	featuredContentText: {
		color: COLORS.textDark,
		lineHeight: 20,
		fontSize: 14,
	},

	// Stylizacja dla małych newsów w stylu Flashscore
	smallCard: {
		marginBottom: 10,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		elevation: 1,
		overflow: "hidden",
	},
	horizontalRow: {
		flexDirection: "row",
		padding: 10,
		alignItems: "center",
	},
	smallCover: {
		width: 80,
		height: 80,
		backgroundColor: COLORS.border,
	},
	smallCardTextContent: {
		flex: 1,
		marginLeft: 12,
		justifyContent: "center",
	},
	smallBadgeRow: {
		flexDirection: "row",
		marginBottom: 2,
	},
	smallNewsBadge: {
		fontSize: 9,
		fontWeight: "bold",
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 3,
	},
	smallCardTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: COLORS.textDark,
		lineHeight: 18,
		marginBottom: 2,
		marginTop: 2,
	},
	smallCardDate: {
		color: COLORS.textLight,
		fontSize: 11,
	},

	// Dialog dla szczegółów aktualności
	dialogTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.textDark,
	},
	dialogContent: {
		paddingTop: 0,
	},
	dialogScroll: {
		maxHeight: 400,
	},
	dialogCover: {
		height: 160,
		marginBottom: 12,
		width: "100%",
	},
	dialogDate: {
		color: COLORS.textLight,
		fontSize: 12,
		marginBottom: 8,
		fontWeight: "600",
	},
	dialogText: {
		color: COLORS.textDark,
		fontSize: 14,
		lineHeight: 22,
	},
});
