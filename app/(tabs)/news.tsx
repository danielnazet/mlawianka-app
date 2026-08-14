import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Dimensions, ImageBackground, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { Card, Title, Paragraph, Text, Button, SegmentedButtons, Portal, Dialog, FAB, TextInput, Switch } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

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
			) : null}

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
		maxHeight: Dimensions.get("window").height * 0.58,
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
	uploadZone: {
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderStyle: "dashed",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		backgroundColor: COLORS.background,
		marginBottom: 16,
		marginTop: 4,
	},
	uploadZoneTitle: {
		fontSize: 13,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginBottom: 2,
	},
	uploadZoneSubtitle: {
		fontSize: 11,
		color: COLORS.textLight,
		marginBottom: 12,
	},
	uploadZoneButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
	},
	uploadZoneBtn: {
		flex: 0.47,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		paddingVertical: 10,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 1,
	},
	uploadZoneBtnText: {
		fontSize: 12,
		fontWeight: "bold",
		color: COLORS.primary,
		marginLeft: 6,
	},
	imagePreviewContainer: {
		width: "100%",
		height: 160,
		borderRadius: 12,
		overflow: "hidden",
		marginBottom: 16,
		marginTop: 4,
		position: "relative",
	},
	imagePreview: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	removeImageButton: {
		position: "absolute",
		top: 10,
		right: 10,
		backgroundColor: "rgba(239, 68, 68, 0.9)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	removeImageText: {
		color: COLORS.white,
		fontSize: 12,
		fontWeight: "bold",
		marginLeft: 4,
	},
	uploadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	uploadingText: {
		fontSize: 13,
		color: COLORS.textDark,
		marginLeft: 8,
	},

	// Stylizacja opcji (switches)
	settingsGroup: {
		backgroundColor: COLORS.background,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		marginBottom: 16,
		overflow: "hidden",
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
	},
	settingTextContainer: {
		flex: 1,
		paddingRight: 10,
	},
	settingLabel: {
		fontSize: 13,
		fontWeight: "bold",
		color: COLORS.textDark,
	},
	settingDescription: {
		fontSize: 11,
		color: COLORS.textLight,
		marginTop: 1,
	},

	// Layouty modalów i przycisków
	dialogContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		width: "92%",
		alignSelf: "center",
		paddingVertical: 4,
	},
	formActionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingBottom: 16,
		paddingTop: 8,
	},
	cancelBtn: {
		flex: 0.47,
		borderRadius: 8,
		borderColor: COLORS.border,
	},
	submitBtn: {
		flex: 0.47,
		borderRadius: 8,
		backgroundColor: COLORS.primary,
	},

	// Kontenery gestów swipe do edycji/usuwania
	swipeActionsContainerFeatured: {
		flexDirection: "row",
		width: 140,
		height: "100%",
		overflow: "hidden",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionsContainerSmall: {
		flexDirection: "row",
		width: 140,
		height: "100%",
		overflow: "hidden",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionBtn: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		height: "100%",
	},
	editActionBtn: {
		backgroundColor: COLORS.primary,
	},
	deleteActionBtn: {
		backgroundColor: "#ef4444",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionText: {
		color: COLORS.white,
		fontSize: 11,
		fontWeight: "bold",
		marginTop: 4,
	},
});
