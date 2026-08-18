import React, { useState, useEffect } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl, Dimensions, ImageBackground, ScrollView, TouchableOpacity, Image, Alert, Animated, Platform } from "react-native";
import { styles } from "../../css/news";
import { Card, Title, Paragraph, Text, Button, Portal, Dialog, FAB, TextInput, Switch } from "react-native-paper";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { useAuth } from "../../contexts/AuthContext";
import { router, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const EMOJI_LIST = ["⚽", "📢", "🏆", "🚨", "📌", "🗓️", "🥇", "🥈", "🥉", "💪", "🔥", "🧤", "🎯", "👍", "⭐", "❓", "❗", "💬", "❤️", "🙌"];

export default function NewsScreen() {
	const insets = useSafeAreaInsets();
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
	const [imageUris, setImageUris] = useState<string[]>([]);
	const [carouselIndex, setCarouselIndex] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [newsIsFirstTeam, setNewsIsFirstTeam] = useState(false);
	const [newsIsImportant, setNewsIsImportant] = useState(false);
	const [editNewsId, setEditNewsId] = useState<number | null>(null);
	const [announcementTitle, setAnnouncementTitle] = useState("");
	const [announcementContent, setAnnouncementContent] = useState("");
	const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
	const [teamMenuVisible, setTeamMenuVisible] = useState(false);
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
		if (imageUris.length >= 3) {
			alert("Możesz dodać maksymalnie 3 zdjęcia.");
			return;
		}
		const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (permissionResult.granted === false) {
			alert("Wymagane jest zezwolenie na dostęp do galerii!");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: false,
			quality: 0.8,
			allowsMultipleSelection: true,
			selectionLimit: 3 - imageUris.length,
		});

		if (!result.canceled && result.assets.length > 0) {
			const picked = result.assets.map((a) => a.uri);
			setImageUris((prev) => [...prev, ...picked].slice(0, 3));
		}
	};

	const takePhoto = async () => {
		if (imageUris.length >= 3) {
			alert("Możesz dodać maksymalnie 3 zdjęcia.");
			return;
		}
		const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
		if (permissionResult.granted === false) {
			alert("Wymagane jest zezwolenie na dostęp do aparatu!");
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: false,
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]?.uri) {
			setImageUris((prev) => [...prev, result.assets[0].uri].slice(0, 3));
		}
	};

	const removeImage = (index: number) => {
		setImageUris((prev) => prev.filter((_, i) => i !== index));
	};

	const uploadImage = async (uri: string): Promise<string> => {
		let arrayBuffer: ArrayBuffer;

		if (Platform.OS === "web") {
			const response = await fetch(uri);
			const blob = await response.blob();
			arrayBuffer = await blob.arrayBuffer();
		} else {
			const base64 = await FileSystem.readAsStringAsync(uri, {
				encoding: "base64",
			});
			arrayBuffer = decode(base64);
		}
		
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
		const itemImages = item.images && item.images.length > 0
			? item.images
			: (item.image_url ? [item.image_url] : []);
		setImageUris(itemImages);
		setNewsIsFirstTeam(item.is_first_team || false);
		setNewsIsImportant(item.is_important || false);
		setIsAddNewsVisible(true);
	};

	const handleCancelNewsForm = () => {
		setEditNewsId(null);
		setNewsTitle("");
		setNewsContent("");
		setImageUris([]);
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
			const uploadedUrls: string[] = [];

			for (const uri of imageUris) {
				if (uri && (uri.startsWith("file://") || uri.startsWith("ph://") || uri.startsWith("content://") || uri.startsWith("blob:"))) {
					const url = await uploadImage(uri);
					uploadedUrls.push(url);
				} else {
					uploadedUrls.push(uri);
				}
			}

			const primaryUrl = uploadedUrls[0] || null;

			if (editNewsId !== null) {
				const { error } = await supabase
					.from("news")
					.update({
						title: newsTitle.trim(),
						content: newsContent.trim(),
						image_url: primaryUrl,
						images: uploadedUrls,
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
						image_url: primaryUrl,
						images: uploadedUrls,
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
			const targetIds = selectedTeamIds.map((id) => parseInt(id)).filter((id) => !isNaN(id));
			const primaryTeamId = targetIds.length > 0 ? targetIds[0] : null;

			const { error } = await supabase.from("announcements").insert([
				{
					sender_id: user?.id,
					team_id: primaryTeamId,
					target_team_ids: targetIds.length > 0 ? targetIds : null,
					title: announcementTitle.trim(),
					content: announcementContent.trim(),
				},
			]);

			if (error) throw error;

			setAnnouncementTitle("");
			setAnnouncementContent("");
			setSelectedTeamIds([]);
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
			
			// 1. Pobierz aktualności (najważniejsze pierwsze, potem według daty)
			const { data: newsData, error: newsError } = await supabase
				.from("news")
				.select("*")
				.order("is_important", { ascending: false, nullsFirst: false })
				.order("created_at", { ascending: false });

			if (newsError) throw newsError;
			setNews(newsData || []);

			// 2. Pobierz zespoły (do wysyłki komunikatów do grup)
			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("id, name, coach_id")
				.eq("is_active", true);

			if (teamsError) throw teamsError;
			setTeams(teamsData || []);

			// 3. Pobierz ogłoszenia (tylko dla zalogowanych)
			if (user) {
				let query = supabase
					.from("announcements")
					.select("*, sender:profiles!announcements_sender_id_fkey(first_name, last_name)");

				// Filtruj ogłoszenia w zależności od roli i zespołu zawodnika/rodzica
				if (profile && profile.role !== "admin" && profile.role !== "coach") {
					const userTeamId = profile.team_id;
					if (userTeamId) {
						query = query.or(`team_id.is.null,team_id.eq.${userTeamId},target_team_ids.cs.{${userTeamId}}`);
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

	const sortTeamsOrdered = (teamsList: Team[]) => {
		return [...teamsList].sort((a, b) => {
			const nameA = a.name.toLowerCase();
			const nameB = b.name.toLowerCase();

			// 1. Pierwszy Zespół / Seniorzy zawsze na samej górze
			const isSeniorA = nameA.includes("senior") || nameA.includes("pierwszy") || nameA.includes("i zespół");
			const isSeniorB = nameB.includes("senior") || nameB.includes("pierwszy") || nameB.includes("i zespół");
			if (isSeniorA && !isSeniorB) return -1;
			if (!isSeniorA && isSeniorB) return 1;

			// 2. Wyciąganie wieku z roczników U-XX (np. U-19 przed U-15 przed U-10 -> starszaki przed najmłodszymi)
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

	const getVisibleTeamsForAnnouncement = () => {
		if (profile?.role === "admin") {
			return sortTeamsOrdered(teams);
		}
		if (profile?.role === "coach") {
			return sortTeamsOrdered(teams.filter(t => t.coach_id === user?.id));
		}
		return [];
	};

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

	const renderLeagueTable = () => {
		const standings = [
			{ pos: 1, name: "Rzekunianka Rzekuń", m: 2, b: "12-0", pkt: 6, isMe: false },
			{ pos: 2, name: "Kurpik Kadzidło", m: 2, b: "5-3", pkt: 6, isMe: false },
			{ pos: 3, name: "Żbik Nasielsk", m: 2, b: "9-3", pkt: 4, isMe: false },
			{ pos: 4, name: "Kryształ Glinojeck", m: 2, b: "6-5", pkt: 4, isMe: false },
			{ pos: 5, name: "Narew II Ostrołęka", m: 2, b: "5-3", pkt: 4, isMe: false },
			{ pos: 6, name: "Mazowsze Jednorożec", m: 2, b: "5-8", pkt: 3, isMe: false },
			{ pos: 7, name: "Korona Szydłowo", m: 2, b: "1-6", pkt: 3, isMe: false },
			{ pos: 8, name: "Mławianka II Mława", m: 2, b: "6-4", pkt: 3, isMe: false },
			{ pos: 9, name: "ULKS Ołdaki", m: 2, b: "5-7", pkt: 3, isMe: false },
			{ pos: 10, name: "Wkra Żuromin", m: 2, b: "4-4", pkt: 3, isMe: false },
			{ pos: 11, name: "GKS Strzegowo", m: 2, b: "6-6", pkt: 3, isMe: true },
			{ pos: 12, name: "Konopianka Konopki", m: 2, b: "4-5", pkt: 1, isMe: false },
			{ pos: 13, name: "Opia Opinogóra", m: 2, b: "3-6", pkt: 1, isMe: false },
			{ pos: 14, name: "Ostrovia Ostrów Maz.", m: 2, b: "3-4", pkt: 1, isMe: false },
			{ pos: 15, name: "MKS Ciechanów", m: 2, b: "4-7", pkt: 0, isMe: false },
			{ pos: 16, name: "Orzeł Sypniewo", m: 2, b: "2-9", pkt: 0, isMe: false },
		];

		return (
			<ScrollView contentContainerStyle={styles.tableScrollContent} showsVerticalScrollIndicator={false}>
				<Card style={styles.tableCard}>
					<Card.Content style={{ paddingHorizontal: 0, paddingVertical: 12 }}>
						<Title style={styles.tableTitle}>Liga Okręgowa - Ciechanów-Ostrołęka</Title>
						<Text style={styles.tableSubtitle}>Sezon 2026/2027 (Źródło: RegioWyniki)</Text>
						
						{/* Nagłówek Tabeli */}
						<View style={styles.tableHeaderRow}>
							<Text style={[styles.tableCol, styles.colPos, styles.headerText]}>#</Text>
							<Text style={[styles.tableCol, styles.colName, styles.headerText, { textAlign: "left" }]}>Drużyna</Text>
							<Text style={[styles.tableCol, styles.colM, styles.headerText]}>M</Text>
							<Text style={[styles.tableCol, styles.colB, styles.headerText]}>Bramki</Text>
							<Text style={[styles.tableCol, styles.colPkt, styles.headerText]}>Pkt</Text>
						</View>

						{/* Wiersze tabeli */}
						{standings.map((row) => (
							<View
								key={row.pos}
								style={[
									styles.tableBodyRow,
									row.isMe && styles.tableRowHighlight,
								]}
							>
								<Text style={[
									styles.tableCol,
									styles.colPos,
									row.isMe ? styles.textHighlightBold : styles.bodyText,
									row.pos <= 2 && !row.isMe && { color: "#22c55e", fontFamily: FONTS.bold }
								]}>
									{row.pos}
								</Text>
								<Text style={[
									styles.tableCol,
									styles.colName,
									row.isMe ? styles.textHighlightBold : styles.bodyText,
									{ textAlign: "left" }
								]} numberOfLines={1}>
									{row.name}
								</Text>
								<Text style={[styles.tableCol, styles.colM, row.isMe ? styles.textHighlight : styles.bodyText]}>
									{row.m}
								</Text>
								<Text style={[styles.tableCol, styles.colB, row.isMe ? styles.textHighlight : styles.bodyText]}>
									{row.b}
								</Text>
								<Text style={[styles.tableCol, styles.colPkt, row.isMe ? styles.textHighlightBold : styles.bodyTextBold]}>
									{row.pkt}
								</Text>
							</View>
						))}
					</Card.Content>
				</Card>
			</ScrollView>
		);
	};
	const renderTabSwitcher = () => {
		const tabs = [
			{ id: "news", label: "News", icon: "newspaper-variant-outline" },
			...(user ? [{ id: "announcements", label: "Ogłoszenia", icon: "bullhorn-outline" }] : []),
			{ id: "table", label: "Tabela", icon: "trophy-outline" },
		];

		return (
			<View style={styles.customTabContainer}>
				<View style={styles.customTabWrapper}>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<TouchableOpacity
								key={tab.id}
								activeOpacity={0.85}
								onPress={() => handleTabChange(tab.id as any)}
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
		);
	};

	const renderEmojiSelector = (onSelectEmoji: (emoji: string) => void) => (
		<View style={styles.emojiBarContainer}>
			<Text style={styles.emojiBarLabel}>Szybkie emotki:</Text>
			<View style={styles.emojiGridWrapper}>
				{EMOJI_LIST.map((emoji, idx) => (
					<TouchableOpacity
						key={idx}
						activeOpacity={0.7}
						style={styles.emojiGridChip}
						onPress={() => onSelectEmoji(emoji)}
					>
						<Text style={styles.emojiText}>{emoji}</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
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
			{/* Custom Pill Tab Switcher */}
			{renderTabSwitcher()}

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
				) : activeTab === "announcements" ? (
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
				) : (
					renderLeagueTable()
				)}
			</Animated.View>

			{/* Modal szczegółów aktualności */}
			<Portal>
				<Dialog
					visible={!!selectedNews}
					onDismiss={() => {
						setSelectedNews(null);
						setCarouselIndex(0);
					}}
					style={styles.dialogContainer}
				>
					{selectedNews && (() => {
						const detailImages = selectedNews.images && selectedNews.images.length > 0
							? selectedNews.images
							: (selectedNews.image_url ? [selectedNews.image_url] : [getNewsImage(selectedNews, news.findIndex(n => n.id === selectedNews.id))]);

						return (
							<View style={{ paddingBottom: 8 }}>
								<Dialog.Content style={{ paddingTop: 16, paddingHorizontal: 16 }}>
									<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
										{/* Karuzela zdjęć (do 3 zdjęć) */}
										<View style={styles.detailCarouselContainer}>
											<ScrollView
												horizontal
												pagingEnabled
												showsHorizontalScrollIndicator={false}
												onScroll={(e) => {
													const slide = Math.round(e.nativeEvent.contentOffset.x / (Dimensions.get("window").width * 0.92 - 32));
													setCarouselIndex(slide);
												}}
												scrollEventThrottle={16}
											>
												{detailImages.map((imgUri, idx) => (
													<Image
														key={idx}
														source={{ uri: imgUri }}
														style={styles.detailCarouselImage}
														resizeMode="cover"
													/>
												))}
											</ScrollView>
											{detailImages.length > 1 && (
												<View style={styles.detailPagination}>
													{detailImages.map((_, idx) => (
														<View
															key={idx}
															style={[
																styles.detailPaginationDot,
																idx === carouselIndex && styles.detailPaginationDotActive,
															]}
														/>
													))}
												</View>
											)}
										</View>

										{/* Tytuł PO ZDJĘCIACH */}
										<Text style={styles.detailTitleUnderImage}>{selectedNews.title}</Text>
										<Text style={styles.dialogDate}>{formatDate(selectedNews.created_at)}</Text>
										<Paragraph style={styles.dialogText}>{selectedNews.content}</Paragraph>
									</ScrollView>
								</Dialog.Content>
								<Dialog.Actions style={{ paddingHorizontal: 16, paddingTop: 8 }}>
									<Button
										onPress={() => {
											setSelectedNews(null);
											setCarouselIndex(0);
										}}
										labelStyle={{ fontFamily: FONTS.bold }}
										textColor={COLORS.primary}
									>
										Zamknij
									</Button>
								</Dialog.Actions>
							</View>
						);
					})()}
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
								left={<TextInput.Icon icon="format-title" color={COLORS.textLight} />}
							/>
							{renderEmojiSelector((emoji) => setNewsContent((prev) => prev + emoji))}
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
								left={<TextInput.Icon icon="text-subject" color={COLORS.textLight} />}
							/>
							<Text style={styles.settingLabel}>Zdjęcia (maksymalnie 3):</Text>
							{imageUris.length > 0 && (
								<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.multiImageRow}>
									{imageUris.map((uri, idx) => (
										<View key={idx} style={styles.multiImageThumbWrapper}>
											<Image source={{ uri }} style={styles.multiImageThumb} />
											<TouchableOpacity style={styles.multiImageRemoveBadge} onPress={() => removeImage(idx)}>
												<Text style={styles.multiImageBadgeText}>✕</Text>
											</TouchableOpacity>
										</View>
									))}
								</ScrollView>
							)}
							{imageUris.length < 3 && (
								<View style={styles.uploadZone}>
									<Text style={styles.uploadZoneTitle}>Dodaj zdjęcie do aktualności ({imageUris.length}/3)</Text>
									<Text style={styles.uploadZoneSubtitle}>Sugerowane wymiary 3:2 (JPG, PNG)</Text>
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
							labelStyle={{ fontFamily: FONTS.bold }}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleAddNews}
							style={styles.submitBtn}
							labelStyle={{ fontFamily: FONTS.bold, color: COLORS.white }}
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
								left={<TextInput.Icon icon="format-title" color={COLORS.textLight} />}
							/>
							{renderEmojiSelector((emoji) => setAnnouncementContent((prev) => prev + emoji))}
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
								left={<TextInput.Icon icon="text-subject" color={COLORS.textLight} />}
							/>
							
							{(profile?.role === "admin" || profile?.role === "coach") && (
								<View style={styles.pickerContainer}>
									<Text style={styles.pickerLabel}>Odbiorcy (Możesz zaznaczyć wiele grup):</Text>
									{profile?.role === "coach" && getVisibleTeamsForAnnouncement().length === 0 ? (
										<Text style={{ color: COLORS.error, fontSize: 13, fontFamily: FONTS.bold, marginTop: 4 }}>
											Brak przypisanych grup. Skontaktuj się z administratorem.
										</Text>
									) : (
										<View>
											<TouchableOpacity
												style={styles.dropdownSelector}
												activeOpacity={0.8}
												onPress={() => setTeamMenuVisible(true)}
											>
												<MaterialIcons name="groups" size={22} color={COLORS.primary} />
												<Text style={styles.dropdownSelectorText}>
													{selectedTeamIds.length === 0
														? "Wszyscy (Ogłoszenie Ogólne)"
														: selectedTeamIds.length === 1
														? (teams.find(t => t.id.toString() === selectedTeamIds[0])?.name || "Wybrana grupa")
														: `${selectedTeamIds.length} wybrane grupy`}
												</Text>
												<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
											</TouchableOpacity>

											{/* Modal wyboru grupy odbiorców z możliwością wyboru wielu */}
											<Portal>
												<Dialog
													visible={teamMenuVisible}
													onDismiss={() => setTeamMenuVisible(false)}
													style={styles.dialogContainer}
												>
													<Dialog.Title style={styles.dialogTitle}>Wybierz grupy odbiorców</Dialog.Title>
													<Dialog.Content style={{ paddingHorizontal: 16 }}>
														<ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
															{profile?.role === "admin" && (
																<TouchableOpacity
																	style={[
																		styles.dropdownOption,
																		selectedTeamIds.length === 0 && styles.dropdownOptionActive
																	]}
																	onPress={() => setSelectedTeamIds([])}
																>
																	<MaterialIcons name="public" size={20} color={selectedTeamIds.length === 0 ? COLORS.primary : COLORS.textLight} />
																	<Text style={[
																		styles.dropdownOptionText,
																		selectedTeamIds.length === 0 && styles.dropdownOptionTextActive
																	]}>
																		Wszyscy (Ogłoszenie Ogólne)
																	</Text>
																	{selectedTeamIds.length === 0 && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
																</TouchableOpacity>
															)}

															{getVisibleTeamsForAnnouncement().map((t) => {
																const teamIdStr = t.id.toString();
																const isSelected = selectedTeamIds.includes(teamIdStr);
																return (
																	<TouchableOpacity
																		key={t.id}
																		style={[
																			styles.dropdownOption,
																			isSelected && styles.dropdownOptionActive
																		]}
																		onPress={() => {
																			setSelectedTeamIds((prev) =>
																				prev.includes(teamIdStr)
																					? prev.filter((id) => id !== teamIdStr)
																					: [...prev, teamIdStr]
																			);
																		}}
																	>
																		<MaterialIcons
																			name={isSelected ? "check-box" : "check-box-outline-blank"}
																			size={20}
																			color={isSelected ? COLORS.primary : COLORS.textLight}
																		/>
																		<Text style={[
																			styles.dropdownOptionText,
																			isSelected && styles.dropdownOptionTextActive
																		]}>
																			{t.name}
																		</Text>
																	</TouchableOpacity>
																);
															})}
														</ScrollView>
													</Dialog.Content>
													<Dialog.Actions>
														<Button
															mode="contained"
															onPress={() => setTeamMenuVisible(false)}
															labelStyle={{ fontFamily: FONTS.bold, color: COLORS.white }}
															style={{ backgroundColor: COLORS.primary }}
														>
															Zatwierdź wybór
														</Button>
													</Dialog.Actions>
												</Dialog>
											</Portal>
										</View>
									)}
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
							labelStyle={{ fontFamily: FONTS.bold }}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleAddAnnouncement}
							style={styles.submitBtn}
							labelStyle={{ fontFamily: FONTS.bold, color: COLORS.white }}
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
					style={[styles.fab, { bottom: 18 }]}
					color={COLORS.white}
					onPress={() => {
						if (activeTab === "news") {
							setIsAddNewsVisible(true);
						} else {
							// Jeśli coach, przypisz automatycznie jego pierwszy prowadzony team_id
							if (profile?.role === "coach") {
								const coachTeamsList = teams.filter(t => t.coach_id === user?.id);
								if (coachTeamsList.length > 0) {
									setSelectedTeamIds([coachTeamsList[0].id.toString()]);
								} else {
									setSelectedTeamIds([]);
								}
							}
							setIsAddAnnouncementVisible(true);
						}
					}}
				/>
			)}
		</ImageBackground>
	);
}


