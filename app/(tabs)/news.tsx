import React, { useState, useEffect } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl, Dimensions, ImageBackground, ScrollView, TouchableOpacity, Image, Alert, Animated } from "react-native";
import { styles } from "../../css/news";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog, FAB, TextInput, Switch } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { router, useNavigation } from "expo-router";

import { NewsItem, AnnouncementItem, Team } from "../../types";
import { SAMPLE_IMAGES } from "../../constants";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import Swipeable from "react-native-gesture-handler/Swipeable";

const getNewsImage = (item: NewsItem, index: number) => {
	if (item.image_url && item.image_url.startsWith("http") && !item.image_url.includes("unsplash.com")) {
		let url = item.image_url.replace(/\\u0026/g, "&");
		// Jeśli adres zawiera localhost lub 127.0.0.1 (np. lokalne Supabase CLI), podmieniamy na adres hosta z EXPO_PUBLIC_SUPABASE_URL
		const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
		if (supabaseUrl && (url.includes("localhost") || url.includes("127.0.0.1"))) {
			try {
				const hostMatch = supabaseUrl.match(/^https?:\/\/([^/]+)/);
				if (hostMatch && hostMatch[1]) {
					url = url.replace(/(localhost|127\.0\.0\.1)(:\d+)?/, hostMatch[1]);
				}
			} catch (e) {
				console.warn("Błąd parsowania adresu URL Supabase:", e);
			}
		}
		return url;
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
	const [newsIsImportant, setNewsIsImportant] = useState(false);
	const [editNewsId, setEditNewsId] = useState<number | null>(null);
	const [announcementTitle, setAnnouncementTitle] = useState("");
	const [announcementContent, setAnnouncementContent] = useState("");
	const [announcementTeamId, setAnnouncementTeamId] = useState("");
	const [teams, setTeams] = useState<Team[]>([]);
	const fadeAnim = useState(new Animated.Value(1))[0];
	const slideAnim = useState(new Animated.Value(0))[0];

	const handleTabChange = (newTab: string) => {
		if (newTab === activeTab) return;

		// 1. Animacja zanikania dotychczasowej zakładki (Fade-out)
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 120,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: -8, // lekki ruch w górę
				duration: 120,
				useNativeDriver: true,
			})
		]).start(() => {
			// 2. Po zaniknięciu podmieniamy zakładkę w tle
			setActiveTab(newTab);
			
			// Pozycja startowa pojawiania się (wsuwanie z dołu)
			slideAnim.setValue(12);

			// 3. Animacja pojawiania się nowej zakładki (Fade-in)
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

	const navigation = useNavigation();

	useEffect(() => {
		// Animacja za każdym razem gdy ekran zyskuje focus (np. zmiana dolnej zakładki)
		const unsubscribe = navigation.addListener("focus", () => {
			fadeAnim.setValue(0);
			slideAnim.setValue(12);
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 250,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 250,
					useNativeDriver: true,
				})
			]).start();
		});
		return unsubscribe;
	}, [navigation, user]);

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
		// Wczytywanie pliku jako ciąg Base64 za pomocą expo-file-system (unikamy pustych blobów fetch w React Native)
		const base64 = await FileSystem.readAsStringAsync(uri, {
			encoding: "base64",
		});
		
		// Dekodowanie Base64 do ArrayBuffer
		const arrayBuffer = decode(base64);
		
		const fileExt = uri.split('.').pop() || 'jpg';
		const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
		const filePath = fileName;

		const { error } = await supabase.storage
			.from('news-images')
			.upload(filePath, arrayBuffer, {
				contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
				upsert: true
			});

		if (error) throw error;

		const { data: publicUrlData } = supabase.storage
			.from('news-images')
			.getPublicUrl(filePath);

		return publicUrlData.publicUrl;
	};

	const handleStartEdit = (item: NewsItem) => {
		setEditNewsId(item.id);
		setNewsTitle(item.title);
		setNewsContent(item.content);
		setImageUri(item.image_url && item.image_url.startsWith("http") && !item.image_url.includes("unsplash.com") ? getNewsImage(item, -1) : null);
		setNewsIsFirstTeam(item.is_first_team || false);
		setNewsIsImportant(item.is_important || false);
		setIsAddNewsVisible(true);
	};

	const handleCancelNewsForm = () => {
		setEditNewsId(null);
		setNewsTitle("");
		setNewsContent("");
		setImageUri(null);
		setNewsIsFirstTeam(false);
		setNewsIsImportant(false);
		setIsAddNewsVisible(false);
	};

	const confirmDelete = (id: number) => {
		Alert.alert(
			"Usuń aktualność",
			"Czy na pewno chcesz usunąć tę aktualność? Tej operacji nie można cofnąć.",
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: () => handleDeleteNews(id),
				},
			]
		);
	};

	const handleDeleteNews = async (id: number) => {
		try {
			setLoading(true);
			
			// Pobierz informację o newsie, żeby sprawdzić czy ma przypisany obrazek w Storage
			const { data: itemData } = await supabase
				.from("news")
				.select("image_url")
				.eq("id", id)
				.single();
				
			// Usuń rekord z bazy danych
			const { error } = await supabase
				.from("news")
				.delete()
				.eq("id", id);
				
			if (error) throw error;
			
			// Jeśli news miał obrazek i nie był to Picsum/Unsplash, usuń go również ze Storage
			if (itemData?.image_url && itemData.image_url.includes("news-images/")) {
				try {
					const fileName = itemData.image_url.split("/news-images/").pop();
					if (fileName) {
						await supabase.storage.from("news-images").remove([fileName]);
					}
				} catch (e) {
					console.warn("Błąd usuwania pliku ze storage:", e);
				}
			}
			
			fetchData();
		} catch (err: any) {
			console.error("Error deleting news:", err);
			alert("Błąd podczas usuwania aktualności: " + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleAddNews = async () => {
		if (!newsTitle.trim() || !newsContent.trim()) {
			alert("Tytuł i treść są wymagane");
			return;
		}

		try {
			setUploading(true);
			let uploadedUrl = imageUri;

			// Jeśli wybrano nowe zdjęcie lokalne (np. ph:// lub file://), wgrywamy je na serwer
			if (imageUri && (imageUri.startsWith("file://") || imageUri.startsWith("ph://") || imageUri.startsWith("content://"))) {
				uploadedUrl = await uploadImage(imageUri);
			}

			if (editNewsId !== null) {
				const { error } = await supabase
					.from("news")
					.update({
						title: newsTitle.trim(),
						content: newsContent.trim(),
						image_url: uploadedUrl,
						is_first_team: newsIsFirstTeam,
						is_important: newsIsImportant,
					})
					.eq("id", editNewsId);

				if (error) throw error;
			} else {
				const { error } = await supabase.from("news").insert([
					{
						title: newsTitle.trim(),
						content: newsContent.trim(),
						image_url: uploadedUrl,
						is_first_team: newsIsFirstTeam,
						is_important: newsIsImportant,
					},
				]);

				if (error) throw error;
			}

			handleCancelNewsForm();
			fetchData();
		} catch (err: any) {
			console.error("Error saving news:", err);
			alert("Błąd podczas zapisywania aktualności: " + err.message);
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
			// Pobierz aktualności (najważniejsze pierwsze, potem według daty)
			const { data: newsData, error: newsError } = await supabase
				.from("news")
				.select("*")
				.order("is_important", { ascending: false })
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
		if (!user) {
			setActiveTab("news");
		}
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
		let swipeableRef: Swipeable | null = null;
		
		const renderRightActions = (isFeatured: boolean) => (progress: any, dragX: any) => {
			return (
				<View style={isFeatured ? styles.swipeActionsContainerFeatured : styles.swipeActionsContainerSmall}>
					<TouchableOpacity
						style={[styles.swipeActionBtn, styles.editActionBtn]}
						onPress={() => {
							swipeableRef?.close();
							handleStartEdit(item);
						}}
					>
						<MaterialIcons name="edit" size={22} color={COLORS.white} />
						<Text style={styles.swipeActionText}>Edytuj</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.swipeActionBtn, styles.deleteActionBtn]}
						onPress={() => {
							swipeableRef?.close();
							confirmDelete(item.id);
						}}
					>
						<MaterialIcons name="delete" size={22} color={COLORS.white} />
						<Text style={styles.swipeActionText}>Usuń</Text>
					</TouchableOpacity>
				</View>
			);
		};

		if (index === 0) {
			// Główny (pierwszy) news – duża karta wyróżniona
			const content = (
				<TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedNews(item)}>
					<Card style={styles.featuredCard}>
						<Image
							source={{ uri: imageUrl }}
							style={styles.featuredCover}
							resizeMode="cover"
						/>
						<Card.Content style={styles.featuredContent}>
							<View style={styles.badgeRow}>
								<Text style={[
									styles.featuredBadge,
									!item.is_important && { backgroundColor: COLORS.primaryLight, color: COLORS.primary }
								]}>
									{item.is_important ? "NAJWAŻNIEJSZE" : "NAJNOWSZE"}
								</Text>
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

			if (user && profile?.role === "admin") {
				return (
					<View style={{ marginBottom: 16 }}>
						<Swipeable
							ref={ref => { swipeableRef = ref; }}
							renderRightActions={renderRightActions(true)}
							friction={2}
							rightThreshold={40}
						>
							{content}
						</Swipeable>
					</View>
				);
			}
			return <View style={{ marginBottom: 16 }}>{content}</View>;
		}

		// Kolejne newsy – mniejsze karty w stylu Flashscore (poziomy układ z obrazkiem)
		const content = (
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

		if (user && profile?.role === "admin") {
			return (
				<View style={{ marginBottom: 10 }}>
					<Swipeable
						ref={ref => { swipeableRef = ref; }}
						renderRightActions={renderRightActions(false)}
						friction={2}
						rightThreshold={40}
					>
						{content}
					</Swipeable>
				</View>
			);
		}
		return <View style={{ marginBottom: 10 }}>{content}</View>;
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
			{/* Segmented Buttons for tabs navigation - widoczne tylko gdy zalogowany */}
			{user ? (
				<View style={styles.tabContainer}>
					<SegmentedButtons
						value={activeTab}
						onValueChange={handleTabChange}
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
			) : null}

			<Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
			</Animated.View>

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

			{/* Modal dodawania/edycji aktualności */}
			<Portal>
				<Dialog
					visible={isAddNewsVisible}
					onDismiss={handleCancelNewsForm}
					style={styles.dialogContainer}
				>
					<Dialog.Title style={styles.dialogTitle}>
						{editNewsId !== null ? "Edytuj aktualność" : "Dodaj nową aktualność"}
					</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScrollForm} showsVerticalScrollIndicator={false}>
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
								numberOfLines={6}
								style={styles.formInput}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>
							{imageUri ? (
								<View style={styles.imagePreviewContainer}>
									<Image source={{ uri: imageUri }} style={styles.imagePreview} />
									<TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
										<MaterialIcons name="delete" size={16} color={COLORS.white} />
										<Text style={styles.removeImageText}>Usuń zdjęcie</Text>
									</TouchableOpacity>
								</View>
							) : (
								<View style={styles.uploadZone}>
									<Text style={styles.uploadZoneTitle}>Dodaj zdjęcie do aktualności</Text>
									<Text style={styles.uploadZoneSubtitle}>Wymiary sugerowane 3:2 (JPG, PNG)</Text>
									<View style={styles.uploadZoneButtons}>
										<TouchableOpacity style={styles.uploadZoneBtn} onPress={takePhoto}>
											<MaterialIcons name="photo-camera" size={20} color={COLORS.primary} />
											<Text style={styles.uploadZoneBtnText}>Aparat</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.uploadZoneBtn} onPress={pickImage}>
											<MaterialIcons name="photo-library" size={20} color={COLORS.primary} />
											<Text style={styles.uploadZoneBtnText}>Galeria</Text>
										</TouchableOpacity>
									</View>
								</View>
							)}
							{uploading && (
								<View style={styles.uploadingContainer}>
									<ActivityIndicator size="small" color={COLORS.primary} />
									<Text style={styles.uploadingText}>Wgrywanie zdjęcia na serwer...</Text>
								</View>
							)}
							<View style={styles.settingsGroup}>
								<View style={styles.settingRow}>
									<View style={styles.settingTextContainer}>
										<Text style={styles.settingLabel}>Główna drużyna (I Zespół)</Text>
										<Text style={styles.settingDescription}>Wyświetlaj oznaczenie o seniorach</Text>
									</View>
									<Switch
										value={newsIsFirstTeam}
										onValueChange={setNewsIsFirstTeam}
										color={COLORS.primary}
									/>
								</View>
								
								<View style={[styles.settingRow, { borderTopWidth: 1, borderColor: COLORS.border }]}>
									<View style={styles.settingTextContainer}>
										<Text style={styles.settingLabel}>Wiadomość najważniejsza</Text>
										<Text style={styles.settingDescription}>Przypnij ten news na samej górze</Text>
									</View>
									<Switch
										value={newsIsImportant}
										onValueChange={setNewsIsImportant}
										color={COLORS.primary}
									/>
								</View>
							</View>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions style={styles.formActionsRow}>
						<Button
							mode="outlined"
							onPress={handleCancelNewsForm}
							style={styles.cancelBtn}
							textColor={COLORS.textLight}
							disabled={uploading}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleAddNews}
							style={styles.submitBtn}
							labelStyle={{ fontWeight: "bold", color: COLORS.white }}
							disabled={uploading}
						>
							{uploading ? "Zapisywanie..." : editNewsId !== null ? "Zapisz" : "Opublikuj"}
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Modal dodawania ogłoszeń */}
			<Portal>
				<Dialog
					visible={isAddAnnouncementVisible}
					onDismiss={() => setIsAddAnnouncementVisible(false)}
					style={styles.dialogContainer}
				>
					<Dialog.Title style={styles.dialogTitle}>Dodaj nowe ogłoszenie</Dialog.Title>
					<Dialog.Content style={styles.dialogContent}>
						<ScrollView style={styles.dialogScrollForm} showsVerticalScrollIndicator={false}>
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
								numberOfLines={6}
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
					<Dialog.Actions style={styles.formActionsRow}>
						<Button
							mode="outlined"
							onPress={() => setIsAddAnnouncementVisible(false)}
							style={styles.cancelBtn}
							textColor={COLORS.textLight}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleAddAnnouncement}
							style={styles.submitBtn}
							labelStyle={{ fontWeight: "bold", color: COLORS.white }}
						>
							Dodaj
						</Button>
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


