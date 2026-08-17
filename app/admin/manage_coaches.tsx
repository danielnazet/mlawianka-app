import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, Platform } from "react-native";
import { Card, Title, Button, Text, Avatar, Portal, Dialog, TextInput, IconButton } from "react-native-paper";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Team {
	id: number;
	name: string;
	coach_id: string | null;
	is_active: boolean;
}

interface CoachProfile {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	role: "coach";
	created_at: string;
	avatar_url?: string | null;
}

export default function ManageCoachesScreen() {
	const { profile } = useAuth();
	const insets = useSafeAreaInsets();
	const [coaches, setCoaches] = useState<CoachProfile[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);

	// Stan edycji trenera
	const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);
	const [editDialogVisible, setEditDialogVisible] = useState(false);
	const [editFirstName, setEditFirstName] = useState("");
	const [editLastName, setEditLastName] = useState("");
	const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	// Stan dodawania nowego trenera
	const [addCoachVisible, setAddCoachVisible] = useState(false);
	const [coachFirstName, setCoachFirstName] = useState("");
	const [coachLastName, setCoachLastName] = useState("");
	const [coachEmail, setCoachEmail] = useState("");
	const [coachPassword, setCoachPassword] = useState("");
	const [coachAvatarUri, setCoachAvatarUri] = useState<string | null>(null);
	const [addCoachLoading, setAddCoachLoading] = useState(false);
	const [addCoachError, setAddCoachError] = useState("");

	const loadData = async () => {
		try {
			// Pobierz profilów z rolą 'coach'
			const { data: coachesData, error: coachesError } = await supabase
				.from("profiles")
				.select("*")
				.eq("role", "coach")
				.order("last_name", { ascending: true });

			// Pobierz aktywne zespoły
			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("id, name, coach_id, is_active")
				.eq("is_active", true)
				.order("id", { ascending: true });

			if (coachesError) throw coachesError;
			if (teamsError) throw teamsError;

			setCoaches((coachesData || []) as CoachProfile[]);
			setTeams(teamsData || []);
		} catch (err) {
			console.error("Error loading admin coaches data:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (profile?.role !== "admin") {
			router.replace("/profile");
			return;
		}
		loadData();
	}, [profile]);

	const pickAvatar = async (type: "add" | "edit") => {
		const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (permissionResult.granted === false) {
			Alert.alert("Brak uprawnień", "Wymagane jest zezwolenie na dostęp do galerii!");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.5,
		});

		if (!result.canceled) {
			if (type === "add") {
				setCoachAvatarUri(result.assets[0].uri);
			} else {
				setEditAvatarUri(result.assets[0].uri);
			}
		}
	};

	const uploadAvatar = async (uri: string): Promise<string> => {
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

		const { error } = await supabase.storage
			.from('avatars')
			.upload(fileName, arrayBuffer, {
				contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
				upsert: true
			});

		if (error) throw error;

		const { data: publicUrlData } = supabase.storage
			.from('avatars')
			.getPublicUrl(fileName);

		return publicUrlData.publicUrl;
	};

	const openEditDialog = (coach: CoachProfile) => {
		setSelectedCoach(coach);
		setEditFirstName(coach.first_name);
		setEditLastName(coach.last_name);
		setEditAvatarUri(coach.avatar_url || null);
		setEditDialogVisible(true);
	};

	const handleSaveCoachChanges = async () => {
		if (!selectedCoach) return;
		setActionLoading(true);

		try {
			let uploadedUrl = selectedCoach.avatar_url;

			if (editAvatarUri && editAvatarUri !== selectedCoach.avatar_url) {
				uploadedUrl = await uploadAvatar(editAvatarUri);
			}

			const { error } = await supabase
				.from("profiles")
				.update({
					first_name: editFirstName.trim(),
					last_name: editLastName.trim(),
					avatar_url: uploadedUrl,
				})
				.eq("id", selectedCoach.id);

			if (error) throw error;

			setEditDialogVisible(false);
			loadData();
		} catch (err) {
			console.error("Error updating coach profile:", err);
			Alert.alert("Błąd", "Nie udało się zapisać zmian");
		} finally {
			setActionLoading(false);
		}
	};

	const handleAddCoachSubmit = async () => {
		if (!coachFirstName.trim() || !coachLastName.trim() || !coachEmail.trim() || !coachPassword.trim()) {
			setAddCoachError("Wypełnij wszystkie pola");
			return;
		}
		if (coachPassword.length < 8) {
			setAddCoachError("Hasło powinno mieć co najmniej 8 znaków");
			return;
		}

		setAddCoachLoading(true);
		setAddCoachError("");

		try {
			let uploadedUrl = null;
			if (coachAvatarUri) {
				uploadedUrl = await uploadAvatar(coachAvatarUri);
			}

			const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
			const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
			const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
				auth: {
					persistSession: false,
					autoRefreshToken: false,
					detectSessionInUrl: false
				}
			});

			const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
				email: coachEmail.trim().toLowerCase(),
				password: coachPassword,
				options: {
					data: {
						first_name: coachFirstName.trim(),
						last_name: coachLastName.trim(),
						role: "coach",
						privacy_accepted: true,
					}
				}
			});

			if (signUpError) throw signUpError;
			if (!signUpData.user) throw new Error("Brak danych użytkownika po rejestracji");

			// Aktualizujemy avatar w profiles
			const { error: profileUpdateError } = await supabase
				.from("profiles")
				.update({
					avatar_url: uploadedUrl,
				})
				.eq("id", signUpData.user.id);

			if (profileUpdateError) throw profileUpdateError;

			setAddCoachVisible(false);
			setCoachFirstName("");
			setCoachLastName("");
			setCoachEmail("");
			setCoachPassword("");
			setCoachAvatarUri(null);
			
			Alert.alert("Sukces", "Trener został zarejestrowany. Na podany adres wysłano e-mail aktywacyjny.");
			loadData();
		} catch (err: any) {
			console.error("Error creating coach:", err);
			setAddCoachError(err.message || "Błąd podczas rejestracji trenera");
		} finally {
			setAddCoachLoading(false);
		}
	};

	const handleDeleteCoach = (coachId: string) => {
		// Sprawdź czy prowadzi aktywne drużyny
		const activeAssignedTeams = teams.filter((t) => t.coach_id === coachId);
		if (activeAssignedTeams.length > 0) {
			Alert.alert(
				"Błąd usuwania",
				`Ten trener jest przypisany do aktywnych drużyn: ${activeAssignedTeams.map((t) => t.name).join(", ")}. Przed usunięciem trenera musisz go odpiąć w sekcji Zarządzaj zespołami.`
			);
			return;
		}

		Alert.alert(
			"Usuwanie profilu trenera",
			"Czy na pewno chcesz usunąć profil tego trenera? Tej operacji nie można cofnąć.",
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase.from("profiles").delete().eq("id", coachId);
							if (error) throw error;
							loadData();
						} catch (err) {
							console.error("Error deleting coach profile:", err);
							Alert.alert("Błąd", "Nie udało się usunąć trenera");
						}
					}
				}
			]
		);
	};

	const getAssignedTeamsText = (coachId: string) => {
		const coachTeams = teams.filter((t) => t.coach_id === coachId);
		return coachTeams.length > 0
			? coachTeams.map((t) => t.name).join(", ")
			: "Brak przypisanych drużyn";
	};

	const getInitials = (first: string, last: string) => {
		return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Górny Pasek nawigacyjny */}
			<LinearGradient
				colors={[COLORS.primaryDark, COLORS.primary]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={[styles.headerBar, { paddingTop: insets.top + 10, paddingBottom: 10 }]}
			>
				<IconButton icon="arrow-left" iconColor={COLORS.white} onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace("/profile"); } }} />
				<Title style={styles.headerTitle}>Zarządzanie Trenerami</Title>
			</LinearGradient>

			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				<Button
					mode="contained"
					icon="account-plus-outline"
					onPress={() => {
						setAddCoachError("");
						setAddCoachVisible(true);
					}}
					buttonColor={COLORS.primary}
					textColor={COLORS.white}
					style={styles.addBtn}
					labelStyle={styles.addBtnLabel}
				>
					Dodaj nowego trenera
				</Button>

				{coaches.map((c) => (
					<Card key={c.id} style={styles.card}>
						<Card.Content>
							<View style={styles.memberHeader}>
								{c.avatar_url ? (
									<Avatar.Image
										size={48}
										source={{ uri: c.avatar_url }}
										style={styles.avatar}
									/>
								) : (
									<Avatar.Text
										size={48}
										label={getInitials(c.first_name, c.last_name)}
										style={styles.avatar}
										labelStyle={styles.avatarLabel}
									/>
								)}
								<View style={styles.memberInfo}>
									<Text style={styles.memberName}>{`${c.first_name} ${c.last_name}`}</Text>
									<Text style={styles.memberEmail}>{c.email}</Text>
								</View>
							</View>

							<View style={styles.detailsContainer}>
								<Text style={styles.detailsText}>
									Prowadzone zespoły: <Text style={styles.boldText}>{getAssignedTeamsText(c.id)}</Text>
								</Text>
							</View>

							<View style={styles.cardActions}>
								<Button mode="contained" onPress={() => openEditDialog(c)} style={styles.actionButton} labelStyle={styles.btnLabel}>
									Edytuj dane / zdjęcie
								</Button>
								<Button
									mode="outlined"
									textColor={COLORS.error}
									style={styles.deleteButton}
									onPress={() => handleDeleteCoach(c.id)}
									labelStyle={styles.btnLabel}
								>
									Usuń trenera
								</Button>
							</View>
						</Card.Content>
					</Card>
				))}
			</ScrollView>

			{/* Dialog edycji trenera */}
			<Portal>
				<Dialog visible={editDialogVisible} onDismiss={() => !actionLoading && setEditDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>Edytuj trenera</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							<Text style={styles.dialogLabel}>Zdjęcie profilowe:</Text>
							<Pressable onPress={() => pickAvatar("edit")} style={styles.imagePickerWrapper}>
								{editAvatarUri ? (
									<Avatar.Image size={80} source={{ uri: editAvatarUri }} />
								) : (
									<Avatar.Icon size={80} icon="camera-outline" color={COLORS.textLight} style={styles.cameraIconBg} />
								)}
								<Text style={styles.imagePickerText}>Zmień zdjęcie</Text>
							</Pressable>

							<TextInput
								label="Imię"
								value={editFirstName}
								onChangeText={setEditFirstName}
								mode="outlined"
								disabled={actionLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>

							<TextInput
								label="Nazwisko"
								value={editLastName}
								onChangeText={setEditLastName}
								mode="outlined"
								disabled={actionLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setEditDialogVisible(false)} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleSaveCoachChanges} loading={actionLoading} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Zapisz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Dialog dodawania nowego trenera */}
			<Portal>
				<Dialog visible={addCoachVisible} onDismiss={() => !addCoachLoading && setAddCoachVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>Dodaj nowego trenera</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							<Pressable onPress={() => pickAvatar("add")} style={styles.imagePickerWrapper}>
								{coachAvatarUri ? (
									<Avatar.Image size={80} source={{ uri: coachAvatarUri }} />
								) : (
									<Avatar.Icon size={80} icon="camera-outline" color={COLORS.textLight} style={styles.cameraIconBg} />
								)}
								<Text style={styles.imagePickerText}>Dodaj zdjęcie trenera</Text>
							</Pressable>

							<TextInput
								label="Imię"
								value={coachFirstName}
								onChangeText={setCoachFirstName}
								mode="outlined"
								disabled={addCoachLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>

							<TextInput
								label="Nazwisko"
								value={coachLastName}
								onChangeText={setCoachLastName}
								mode="outlined"
								disabled={addCoachLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>

							<TextInput
								label="E-mail"
								value={coachEmail}
								onChangeText={setCoachEmail}
								mode="outlined"
								keyboardType="email-address"
								autoCapitalize="none"
								disabled={addCoachLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>

							<TextInput
								label="Hasło tymczasowe"
								value={coachPassword}
								onChangeText={setCoachPassword}
								mode="outlined"
								secureTextEntry
								autoCapitalize="none"
								disabled={addCoachLoading}
								style={styles.input}
								activeOutlineColor={COLORS.primary}
							/>

							{addCoachError ? (
								<Text style={styles.formError}>{addCoachError}</Text>
							) : null}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setAddCoachVisible(false)} disabled={addCoachLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleAddCoachSubmit} loading={addCoachLoading} disabled={addCoachLoading} labelStyle={styles.dialogBtnLabel}>
							Utwórz
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
	},
	headerBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	headerTitle: {
		color: COLORS.white,
		fontSize: 20,
		fontFamily: FONTS.extraBold,
		marginLeft: 8,
	},
	scrollContainer: {
		padding: 16,
		paddingBottom: 40,
	},
	addBtn: {
		marginBottom: 16,
		borderRadius: 12,
	},
	addBtnLabel: {
		fontFamily: FONTS.bold,
		fontSize: 15,
		paddingVertical: 4,
	},
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
		elevation: 1,
	},
	memberHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	avatar: {
		backgroundColor: COLORS.primary,
	},
	avatarLabel: {
		color: COLORS.white,
		fontFamily: FONTS.bold,
	},
	memberInfo: {
		marginLeft: 12,
		flex: 1,
	},
	memberName: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		color: COLORS.textDark,
	},
	memberEmail: {
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
	},
	detailsContainer: {
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		marginBottom: 12,
	},
	detailsText: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		marginVertical: 2,
	},
	boldText: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
	},
	cardActions: {
		flexDirection: "row",
		gap: 12,
	},
	actionButton: {
		flex: 1.4,
		backgroundColor: COLORS.primary,
		borderRadius: 10,
	},
	deleteButton: {
		flex: 1,
		borderColor: COLORS.error,
		borderWidth: 1,
		borderRadius: 10,
	},
	btnLabel: {
		fontFamily: FONTS.bold,
		fontSize: 13,
	},
	dialog: {
		borderRadius: 22,
		backgroundColor: COLORS.white,
	},
	dialogTitle: {
		fontFamily: FONTS.extraBold,
		color: COLORS.primary,
		fontSize: 20,
	},
	dialogScroll: {
		maxHeight: 350,
	},
	dialogLabel: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginTop: 12,
		marginBottom: 8,
	},
	imagePickerWrapper: {
		alignItems: "center",
		marginVertical: 12,
		gap: 6,
	},
	imagePickerText: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
		fontSize: 13,
	},
	cameraIconBg: {
		backgroundColor: COLORS.primaryLight,
	},
	input: {
		marginBottom: 12,
		backgroundColor: COLORS.white,
	},
	formError: {
		color: COLORS.error,
		fontFamily: FONTS.bold,
		marginTop: 12,
		fontSize: 13,
		textAlign: "center",
	},
	dialogBtnLabel: {
		fontFamily: FONTS.bold,
	},
});
