import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Dimensions, ImageBackground, ScrollView, TouchableOpacity, Image } from "react-native";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog, FAB, TextInput, Switch } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

import { NewsItem, AnnouncementItem, Team } from "../../types";
import { SAMPLE_IMAGES } from "../../constants";
import * as ImagePicker from "expo-image-picker";

const getNewsImage = (item: NewsItem, index: number) => {
	if (item.image_url && item.image_url.startsWith("http") && !item.image_url.includes("unsplash.com")) {
		// Czyści ewentualne dosłowne zapisy '\u0026' w URL powstałe przy wstrzykiwaniu SQL
		return item.image_url.replace(/\\u0026/g, "&");
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

	// Stan dla formularzy dodawania postów
	const [isAddNewsVisible, setIsAddNewsVisible] = useState(false);
	const [isAddAnnouncementVisible, setIsAddAnnouncementVisible] = useState(false);
	const [newsTitle, setNewsTitle] = useState("");
	const [newsContent, setNewsContent] = useState("");
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [newsIsFirstTeam, setNewsIsFirstTeam] = useState(false);
	const [announcementTitle, setAnnouncementTitle] = useState("");
	const [announcementContent, setAnnouncementContent] = useState("");
	const [announcementTeamId, setAnnouncementTeamId] = useState("");
	const [teams, setTeams] = useState<Team[]>([]);

	useEffect(() => {
		if (profile?.role === "admin") {
			const fetchTeams = async () => {
				const { data } = await supabase.from("teams").select("id, name");
				if (data) setTeams(data);
			};
			fetchTeams();
		}
	}, [profile]);

	const pickImage = async () => {
		const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (permissionResult.granted === false) {
			alert("Wymagane jest zezwolenie na dostęp do galerii!");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [3, 2],
			quality: 0.7,
		});

		if (!result.canceled) {
			setImageUri(result.assets[0].uri);
		}
	};

	const takePhoto = async () => {
		const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
		if (permissionResult.granted === false) {
			alert("Wymagane jest zezwolenie na dostęp do aparatu!");
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [3, 2],
			quality: 0.7,
		});

		if (!result.canceled) {
			setImageUri(result.assets[0].uri);
		}
	};

	const uploadImage = async (uri: string): Promise<string> => {
		const response = await fetch(uri);
		const blob = await response.blob();
		const fileExt = uri.split('.').pop() || 'jpg';
		const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
		const filePath = fileName;

		const { error } = await supabase.storage
			.from('news-images')
			.upload(filePath, blob, {
				contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
				upsert: true
			});

		if (error) throw error;

		const { data: publicUrlData } = supabase.storage
			.from('news-images')
			.getPublicUrl(filePath);

		return publicUrlData.publicUrl;
	};

	const handleAddNews = async () => {
		if (!newsTitle.trim() || !newsContent.trim()) {
			alert("Tytuł i treść są wymagane");
			return;
		}

		try {
			setUploading(true);
			let uploadedUrl = null;

			if (imageUri) {
				uploadedUrl = await uploadImage(imageUri);
			}

			const { error } = await supabase.from("news").insert([
				{
					title: newsTitle.trim(),
					content: newsContent.trim(),
					image_url: uploadedUrl,
					is_first_team: newsIsFirstTeam,
				},
			]);

			if (error) throw error;

			setNewsTitle("");
			setNewsContent("");
			setImageUri(null);
			setNewsIsFirstTeam(false);
			setIsAddNewsVisible(false);

			fetchData();
		} catch (err: any) {
			console.error("Error adding news:", err);
			alert("Błąd podczas dodawania aktualności: " + err.message);
		} finally {
			setUploading(false);
		}
	};

	const handleAddAnnouncement = async () => {
		if (!announcementTitle.trim() || !announcementContent.trim()) {
			alert("Tytuł i treść są wymagane");
			return;
		}

		try {
			const { error } = await supabase.from("announcements").insert([
				{
					sender_id: user?.id,
					team_id: announcementTeamId ? parseInt(announcementTeamId) : null,
					title: announcementTitle.trim(),
					content: announcementContent.trim(),
				},
			]);

			if (error) throw error;

			setAnnouncementTitle("");
			setAnnouncementContent("");
			setAnnouncementTeamId("");
			setIsAddAnnouncementVisible(false);

			fetchData();
		} catch (err: any) {
			console.error("Error adding announcement:", err);
			alert("Błąd podczas dodawania ogłoszenia: " + err.message);
		}
	};

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
						<Image
							source={{ uri: imageUrl }}
							style={styles.featuredCover}
							resizeMode="cover"
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
						<View>
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
						</View>
					)}
				</Dialog>
			</Portal>

			{/* Modal dodawania aktualności */}
			<Portal>
				<Dialog visible={isAddNewsVisible} onDismiss={() => setIsAddNewsVisible(false)}>
					<Dialog.Title style={styles.dialogTitle}>Dodaj nową aktualność</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScrollForm}>
							<TextInput
								label="Tytuł"
								value={newsTitle}
								onChangeText={setNewsTitle}
								mode="outlined"
								style={styles.formInput}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>
							<TextInput
								label="Treść"
								value={newsContent}
								onChangeText={setNewsContent}
								mode="outlined"
								multiline
								numberOfLines={5}
								style={styles.formInput}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>
							{imageUri ? (
								<View style={styles.imagePreviewContainer}>
									<Image source={{ uri: imageUri }} style={styles.imagePreview} />
									<TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
										<MaterialIcons name="close" size={18} color={COLORS.white} />
										<Text style={styles.removeImageText}>Usuń zdjęcie</Text>
									</TouchableOpacity>
								</View>
							) : (
								<View style={styles.imageButtonsRow}>
									<Button
										mode="outlined"
										icon="camera"
										onPress={takePhoto}
										style={[styles.imageButton, { borderColor: COLORS.primary }]}
										textColor={COLORS.primary}
									>
										Aparat
									</Button>
									<Button
										mode="outlined"
										icon="image"
										onPress={pickImage}
										style={[styles.imageButton, { borderColor: COLORS.primary }]}
										textColor={COLORS.primary}
									>
										Galeria
									</Button>
								</View>
							)}
							{uploading && (
								<View style={styles.uploadingContainer}>
									<ActivityIndicator size="small" color={COLORS.primary} />
									<Text style={styles.uploadingText}>Wgrywanie zdjęcia na serwer...</Text>
								</View>
							)}
							<View style={styles.switchRow}>
								<Text style={styles.switchLabel}>Dotyczy pierwszej drużyny (I Zespół)</Text>
								<Switch
									value={newsIsFirstTeam}
									onValueChange={setNewsIsFirstTeam}
									color={COLORS.primary}
								/>
							</View>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setIsAddNewsVisible(false)}>Anuluj</Button>
						<Button mode="contained" onPress={handleAddNews} style={styles.formButton} labelStyle={{ color: COLORS.white }}>Dodaj</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Modal dodawania ogłoszeń */}
			<Portal>
				<Dialog visible={isAddAnnouncementVisible} onDismiss={() => setIsAddAnnouncementVisible(false)}>
					<Dialog.Title style={styles.dialogTitle}>Dodaj nowe ogłoszenie</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScrollForm}>
							<TextInput
								label="Tytuł ogłoszenia"
								value={announcementTitle}
								onChangeText={setAnnouncementTitle}
								mode="outlined"
								style={styles.formInput}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>
							<TextInput
								label="Treść ogłoszenia"
								value={announcementContent}
								onChangeText={setAnnouncementContent}
								mode="outlined"
								multiline
								numberOfLines={5}
								style={styles.formInput}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>
							
							{profile?.role === "admin" && (
								<View style={styles.pickerContainer}>
									<Text style={styles.pickerLabel}>Odbiorcy (Zespół):</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamChipsScroll}>
										<TouchableOpacity
											style={[
												styles.teamChip,
												!announcementTeamId && styles.teamChipActive
											]}
											onPress={() => setAnnouncementTeamId("")}
										>
											<Text style={[
												styles.teamChipText,
												!announcementTeamId && styles.teamChipTextActive
											]}>Wszyscy</Text>
										</TouchableOpacity>
										{teams.map(t => (
											<TouchableOpacity
												key={t.id}
												style={[
													styles.teamChip,
													announcementTeamId === t.id.toString() && styles.teamChipActive
												]}
												onPress={() => setAnnouncementTeamId(t.id.toString())}
											>
												<Text style={[
													styles.teamChipText,
													announcementTeamId === t.id.toString() && styles.teamChipTextActive
												]}>{t.name}</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							)}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setIsAddAnnouncementVisible(false)}>Anuluj</Button>
						<Button mode="contained" onPress={handleAddAnnouncement} style={styles.formButton} labelStyle={{ color: COLORS.white }}>Dodaj</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Floating Action Button (FAB) dla Admina/Trenera */}
			{user && (profile?.role === "admin" || (profile?.role === "coach" && activeTab === "announcements")) && (
				<FAB
					icon="plus"
					style={styles.fab}
					color={COLORS.white}
					onPress={() => {
						if (activeTab === "news") {
							setIsAddNewsVisible(true);
						} else {
							// Jeśli coach, przypisz automatycznie jego team_id
							if (profile?.role === "coach") {
								setAnnouncementTeamId(profile.team_id?.toString() || "");
							}
							setIsAddAnnouncementVisible(true);
						}
					}}
				/>
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
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
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

	// Formularz dodawania postów
	fab: {
		position: "absolute",
		margin: 16,
		right: 16,
		bottom: 16,
		backgroundColor: COLORS.primary,
		borderRadius: 28,
		elevation: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.27,
		shadowRadius: 4.65,
	},
	dialogScrollForm: {
		maxHeight: 350,
	},
	formInput: {
		marginBottom: 12,
		backgroundColor: COLORS.white,
	},
	formButton: {
		backgroundColor: COLORS.primary,
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
	},
	pickerContainer: {
		marginTop: 12,
		marginBottom: 8,
	},
	pickerLabel: {
		fontSize: 14,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginBottom: 6,
	},
	teamChipsScroll: {
		flexDirection: "row",
		paddingVertical: 4,
	},
	teamChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: COLORS.background,
		marginRight: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	teamChipActive: {
		backgroundColor: COLORS.primaryLight,
		borderColor: COLORS.primary,
	},
	teamChipText: {
		fontSize: 12,
		color: COLORS.textDark,
	},
	teamChipTextActive: {
		color: COLORS.primary,
		fontWeight: "bold",
	},

	// Upload i podgląd zdjęć
	imagePreviewContainer: {
		alignItems: "center",
		marginVertical: 10,
		position: "relative",
	},
	imagePreview: {
		width: "100%",
		height: 150,
		borderRadius: 8,
		backgroundColor: COLORS.border,
	},
	removeImageButton: {
		position: "absolute",
		bottom: 8,
		backgroundColor: "rgba(224, 50, 50, 0.9)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	removeImageText: {
		color: COLORS.white,
		fontSize: 12,
		fontWeight: "bold",
		marginLeft: 4,
	},
	imageButtonsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 10,
	},
	imageButton: {
		flex: 0.48,
		borderRadius: 8,
	},
	uploadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginVertical: 10,
	},
	uploadingText: {
		fontSize: 13,
		color: COLORS.textDark,
		marginLeft: 8,
	},
});
