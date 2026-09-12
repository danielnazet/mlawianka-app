import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Pressable,
	Alert,
	TouchableOpacity,
} from "react-native";
import {
	Card,
	Title,
	Button,
	Text,
	Avatar,
	Portal,
	Dialog,
	TextInput,
	IconButton,
	SegmentedButtons,
	Switch,
} from "react-native-paper";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Sponsor, SponsorCategory } from "../../types";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

export default function ManageSponsorsScreen() {
	const { profile } = useAuth();
	const insets = useSafeAreaInsets();
	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [loading, setLoading] = useState(true);

	// Dialog stany
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

	// Pola formularza
	const [formName, setFormName] = useState("");
	const [formCategory, setFormCategory] = useState<SponsorCategory>("partner");
	const [formDesc, setFormDesc] = useState("");
	const [formWebsite, setFormWebsite] = useState("");
	const [formPhone, setFormPhone] = useState("");
	const [formLogoUrl, setFormLogoUrl] = useState("");
	const [formOrder, setFormOrder] = useState("1");
	const [saving, setSaving] = useState(false);

	const loadSponsors = async () => {
		try {
			const { data, error } = await supabase
				.from("sponsors")
				.select("*")
				.order("display_order", { ascending: true });

			if (error) throw error;
			setSponsors(data || []);
		} catch (err) {
			console.error("Błąd podczas ładowania listy sponsorów:", err);
			Alert.alert("Błąd", "Nie udało się załadować sponsorów.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (profile?.role !== "admin") {
			router.replace("/profile");
			return;
		}
		loadSponsors();
	}, [profile]);

	const openAddDialog = () => {
		setEditingSponsor(null);
		setFormName("");
		setFormCategory("partner");
		setFormDesc("");
		setFormWebsite("");
		setFormPhone("");
		setFormLogoUrl("");
		setFormOrder(((sponsors.length + 1) * 10).toString());
		setDialogVisible(true);
	};

	const openEditDialog = (sponsor: Sponsor) => {
		setEditingSponsor(sponsor);
		setFormName(sponsor.name);
		setFormCategory(sponsor.category);
		setFormDesc(sponsor.description || "");
		setFormWebsite(sponsor.website_url || "");
		setFormPhone(sponsor.phone || "");
		setFormLogoUrl(sponsor.logo_url || "");
		setFormOrder(sponsor.display_order.toString());
		setDialogVisible(true);
	};

	const handleSave = async () => {
		if (!formName.trim()) {
			Alert.alert("Błąd walidacji", "Nazwa sponsora/partnera jest wymagana.");
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: formName.trim(),
				category: formCategory,
				description: formDesc.trim() || null,
				website_url: formWebsite.trim() || null,
				phone: formPhone.trim() || null,
				logo_url: formLogoUrl.trim() || null,
				display_order: parseInt(formOrder, 10) || 10,
			};

			if (editingSponsor) {
				const { error } = await supabase
					.from("sponsors")
					.update(payload)
					.eq("id", editingSponsor.id);

				if (error) throw error;
				Alert.alert("Sukces", "Zaktualizowano dane partnera.");
			} else {
				const { error } = await supabase
					.from("sponsors")
					.insert({
						...payload,
						is_active: true,
					});

				if (error) throw error;
				Alert.alert("Sukces", "Dodano nowego sponsora do klubu!");
			}

			setDialogVisible(false);
			loadSponsors();
		} catch (err: any) {
			console.error("Błąd zapisu sponsora:", err);
			Alert.alert("Błąd zapisu", err?.message || "Wystąpił problem podczas zapisywania.");
		} finally {
			setSaving(false);
		}
	};

	const handleToggleActive = async (sponsor: Sponsor) => {
		const newStatus = !sponsor.is_active;
		// Optimistic update
		setSponsors((prev) =>
			prev.map((s) => (s.id === sponsor.id ? { ...s, is_active: newStatus } : s))
		);

		try {
			const { error } = await supabase
				.from("sponsors")
				.update({ is_active: newStatus })
				.eq("id", sponsor.id);

			if (error) throw error;
		} catch (err) {
			console.error("Błąd aktualizacji statusu:", err);
			Alert.alert("Błąd", "Nie udało się zmienić widoczności sponsora.");
			loadSponsors();
		}
	};

	const handleDelete = (sponsor: Sponsor) => {
		Alert.alert(
			"Usuń sponsora",
			`Czy na pewno chcesz usunąć sponsora "${sponsor.name}"? Tej operacji nie można cofnąć.`,
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase
								.from("sponsors")
								.delete()
								.eq("id", sponsor.id);

							if (error) throw error;
							setSponsors((prev) => prev.filter((s) => s.id !== sponsor.id));
						} catch (err: any) {
							console.error("Błąd usuwania sponsora:", err);
							Alert.alert("Błąd", err?.message || "Nie udało się usunąć sponsora.");
						}
					},
				},
			]
		);
	};

	const getCategoryBadge = (category: SponsorCategory) => {
		switch (category) {
			case "main":
				return { label: "Sponsor Główny", bg: "#FEF3C7", text: "#B45309", icon: "crown" };
			case "strategic":
				return { label: "Strategiczny", bg: "#EFF6FF", text: "#1D4ED8", icon: "shield-star" };
			case "partner":
			default:
				return { label: "Partner / Darczyńca", bg: "#F1F5F9", text: "#475569", icon: "handshake" };
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
				<Text style={styles.loadingText}>Ładowanie bazy sponsorów...</Text>
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			{/* Header */}
			<LinearGradient
				colors={[COLORS.primaryDark, COLORS.primary]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.header}
			>
				<View style={styles.headerTop}>
					<IconButton
						icon="arrow-left"
						iconColor={COLORS.white}
						size={24}
						onPress={() => router.back()}
					/>
					<Text style={styles.headerTitle}>Sponsorzy i Partnerzy</Text>
					<IconButton
						icon="plus-circle"
						iconColor={COLORS.white}
						size={28}
						onPress={openAddDialog}
					/>
				</View>
				<Text style={styles.headerSubtitle}>
					Zarządzaj oficjalnymi sponsorami, logotypami oraz ofertami partnerskimi
				</Text>
			</LinearGradient>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Podsumowanie liczby sponsorów */}
				<View style={styles.statsRow}>
					<View style={styles.statCard}>
						<Text style={styles.statVal}>{sponsors.length}</Text>
						<Text style={styles.statLabel}>Wszystkich</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={[styles.statVal, { color: "#D97706" }]}>
							{sponsors.filter((s) => s.category === "main").length}
						</Text>
						<Text style={styles.statLabel}>Głównych</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={[styles.statVal, { color: COLORS.primary }]}>
							{sponsors.filter((s) => s.is_active).length}
						</Text>
						<Text style={styles.statLabel}>Aktywnych</Text>
					</View>
				</View>

				{/* Lista sponsorów */}
				<View style={styles.listSection}>
					<Text style={styles.sectionTitle}>Lista partnerów ({sponsors.length})</Text>

					{sponsors.length === 0 ? (
						<View style={styles.emptyState}>
							<MaterialCommunityIcons name="handshake-outline" size={48} color={COLORS.textLight} />
							<Text style={styles.emptyStateText}>Brak zarejestrowanych sponsorów.</Text>
							<Button mode="contained" onPress={openAddDialog} style={styles.emptyStateBtn}>
								Dodaj pierwszego partnera
							</Button>
						</View>
					) : (
						sponsors.map((item) => {
							const badge = getCategoryBadge(item.category);
							return (
								<Card key={item.id} style={[styles.card, !item.is_active && styles.cardInactive]}>
									<Card.Content style={styles.cardContent}>
										<View style={styles.cardTopRow}>
											<View style={[styles.badge, { backgroundColor: badge.bg }]}>
												<MaterialCommunityIcons name={badge.icon as any} size={14} color={badge.text} style={{ marginRight: 4 }} />
												<Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
											</View>

											<View style={styles.switchRow}>
												<Text style={styles.switchLabel}>{item.is_active ? "Widoczny" : "Ukryty"}</Text>
												<Switch
													value={item.is_active}
													onValueChange={() => handleToggleActive(item)}
													color={COLORS.primary}
												/>
											</View>
										</View>

										<View style={styles.sponsorInfoRow}>
											<Avatar.Icon
												size={44}
												icon={item.category === "main" ? "crown" : "domain"}
												color={item.category === "main" ? "#D97706" : COLORS.primary}
												style={{ backgroundColor: item.category === "main" ? "#FEF3C7" : "#EFF6FF" }}
											/>
											<View style={styles.sponsorInfoText}>
												<Text style={styles.sponsorName}>{item.name}</Text>
												{item.description ? (
													<Text style={styles.sponsorDesc} numberOfLines={2}>
														{item.description}
													</Text>
												) : null}
												{item.website_url ? (
													<Text style={styles.sponsorUrl} numberOfLines={1}>
														🌐 {item.website_url}
													</Text>
												) : null}
											</View>
										</View>

										<View style={styles.cardActionsRow}>
											<Text style={styles.orderLabel}>Kolejność: #{item.display_order}</Text>
											<View style={styles.actionBtnsGroup}>
												<TouchableOpacity
													style={styles.editBtn}
													onPress={() => openEditDialog(item)}
												>
													<MaterialCommunityIcons name="pencil" size={16} color={COLORS.primary} />
													<Text style={styles.editBtnText}>Edytuj</Text>
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.deleteBtn}
													onPress={() => handleDelete(item)}
												>
													<MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
												</TouchableOpacity>
											</View>
										</View>
									</Card.Content>
								</Card>
							);
						})
					)}
				</View>
			</ScrollView>

			{/* Modal Dodawania/Edycji */}
			<Portal>
				<Dialog
					visible={dialogVisible}
					onDismiss={() => !saving && setDialogVisible(false)}
					style={styles.dialogContainer}
				>
					<Dialog.Title style={styles.dialogTitle}>
						{editingSponsor ? "Edytuj partnera" : "Dodaj nowego partnera"}
					</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
							<TextInput
								label="Nazwa firmy / sponsora *"
								value={formName}
								onChangeText={setFormName}
								mode="outlined"
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
							/>

							<Text style={styles.formSectionLabel}>Kategoria / Ranga:</Text>
							<SegmentedButtons
								value={formCategory}
								onValueChange={(val) => setFormCategory(val as SponsorCategory)}
								buttons={[
									{ value: "main", label: "Główny", icon: "crown" },
									{ value: "strategic", label: "Strateg.", icon: "shield-star" },
									{ value: "partner", label: "Partner", icon: "handshake" },
								]}
								style={{ marginBottom: 12 }}
							/>

							<TextInput
								label="Opis / Hasło reklamowe"
								value={formDesc}
								onChangeText={setFormDesc}
								mode="outlined"
								multiline
								numberOfLines={2}
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
							/>

							<TextInput
								label="Adres strony WWW (np. www.firma.pl)"
								value={formWebsite}
								onChangeText={setFormWebsite}
								mode="outlined"
								keyboardType="url"
								autoCapitalize="none"
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								left={<TextInput.Icon icon="web" />}
							/>

							<TextInput
								label="Telefon kontaktowy (opcjonalnie)"
								value={formPhone}
								onChangeText={setFormPhone}
								mode="outlined"
								keyboardType="phone-pad"
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								left={<TextInput.Icon icon="phone" />}
							/>

							<TextInput
								label="Kolejność wyświetlania (np. 10, 20, 30)"
								value={formOrder}
								onChangeText={setFormOrder}
								mode="outlined"
								keyboardType="numeric"
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								left={<TextInput.Icon icon="sort-numeric-ascending" />}
							/>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button
							onPress={() => setDialogVisible(false)}
							disabled={saving}
							textColor={COLORS.textLight}
						>
							Anuluj
						</Button>
						<Button
							mode="contained"
							onPress={handleSave}
							loading={saving}
							disabled={saving}
							style={{ backgroundColor: COLORS.primary }}
						>
							{editingSponsor ? "Zapisz" : "Dodaj"}
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
		fontFamily: FONTS.medium,
		color: COLORS.textLight,
	},
	header: {
		paddingHorizontal: 16,
		paddingBottom: 20,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},
	headerTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	headerTitle: {
		fontSize: 19,
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},
	headerSubtitle: {
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: "rgba(255,255,255,0.85)",
		paddingHorizontal: 8,
		lineHeight: 18,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
		gap: 10,
	},
	statCard: {
		flex: 1,
		backgroundColor: COLORS.white,
		borderRadius: 14,
		padding: 12,
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
	},
	statVal: {
		fontSize: 20,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 11,
		fontFamily: FONTS.medium,
		color: COLORS.textLight,
	},
	listSection: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 12,
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 14,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		elevation: 2,
	},
	cardInactive: {
		opacity: 0.6,
		backgroundColor: "#F8FAFC",
	},
	cardContent: {
		padding: 14,
	},
	cardTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	badge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	badgeText: {
		fontSize: 11,
		fontFamily: FONTS.bold,
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	switchLabel: {
		fontSize: 11,
		fontFamily: FONTS.medium,
		color: COLORS.textLight,
		marginRight: 6,
	},
	sponsorInfoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	sponsorInfoText: {
		flex: 1,
		marginLeft: 12,
	},
	sponsorName: {
		fontSize: 15,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 2,
	},
	sponsorDesc: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		lineHeight: 16,
		marginBottom: 2,
	},
	sponsorUrl: {
		fontSize: 11,
		fontFamily: FONTS.medium,
		color: COLORS.primary,
	},
	cardActionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
	},
	orderLabel: {
		fontSize: 11,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
	},
	actionBtnsGroup: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	editBtn: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#EFF6FF",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8,
	},
	editBtnText: {
		fontSize: 12,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginLeft: 4,
	},
	deleteBtn: {
		padding: 5,
		backgroundColor: "#FEE2E2",
		borderRadius: 8,
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 36,
	},
	emptyStateText: {
		fontSize: 14,
		fontFamily: FONTS.medium,
		color: COLORS.textLight,
		marginVertical: 12,
	},
	emptyStateBtn: {
		backgroundColor: COLORS.primary,
	},
	dialogContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
	},
	dialogTitle: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},
	input: {
		marginBottom: 10,
		backgroundColor: COLORS.white,
	},
	formSectionLabel: {
		fontSize: 12,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 6,
		marginTop: 4,
	},
});
