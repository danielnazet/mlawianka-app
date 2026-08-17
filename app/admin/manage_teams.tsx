import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from "react-native";
import { Card, Title, Button, Text, IconButton, Portal, Dialog, TextInput, RadioButton, Avatar } from "react-native-paper";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Coach {
	id: string;
	first_name: string;
	last_name: string;
	avatar_url?: string | null;
}

interface Team {
	id: number;
	name: string;
	coach_id: string | null;
	coach_name?: string;
	coach_avatar?: string | null;
	player_count?: number;
	is_active: boolean;
}

export default function ManageTeamsScreen() {
	const { profile } = useAuth();
	const insets = useSafeAreaInsets();
	const [teams, setTeams] = useState<Team[]>([]);
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [loading, setLoading] = useState(true);
	const [showArchived, setShowArchived] = useState(false);

	// Stan dodawania zespołu
	const [addDialogVisible, setAddDialogVisible] = useState(false);
	const [newTeamName, setNewTeamName] = useState("");
	const [actionLoading, setActionLoading] = useState(false);

	// Stan przypisywania trenera
	const [coachDialogVisible, setCoachDialogVisible] = useState(false);
	const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
	const [selectedCoachId, setSelectedCoachId] = useState<string>("none");

	const loadData = async () => {
		try {
			// Pobierz zespoły (aktywne i nieaktywne)
			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("*")
				.order("id", { ascending: true });

			if (teamsError) throw teamsError;

			// Pobierz profile z rolą 'coach'
			const { data: coachesData, error: coachesError } = await supabase
				.from("profiles")
				.select("id, first_name, last_name, avatar_url")
				.eq("role", "coach");

			if (coachesError) throw coachesError;
			setCoaches(coachesData || []);

			// Pobierz wszystkich członków w celach zliczenia zawodników
			const { data: allProfiles } = await supabase
				.from("profiles")
				.select("id, first_name, last_name, role, team_id");

			const membersList = allProfiles || [];
			const coachMap = new Map(
				coachesData?.map((c) => [
					c.id,
					{
						name: `${c.first_name} ${c.last_name}`,
						avatar: c.avatar_url || null,
					},
				]) || []
			);

			const enrichedTeams = (teamsData || []).map((t) => {
				const playersInTeam = membersList.filter((m) => m.role === "player" && m.team_id === t.id).length;
				const coachInfo = t.coach_id ? coachMap.get(t.coach_id) : null;
				return {
					...t,
					coach_name: coachInfo ? coachInfo.name : "Brak trenera",
					coach_avatar: coachInfo ? coachInfo.avatar : null,
					player_count: playersInTeam,
				};
			});

			setTeams(enrichedTeams);
		} catch (err) {
			console.error("Error loading admin teams data:", err);
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

	const handleAddTeam = async () => {
		if (!newTeamName.trim()) return;
		setActionLoading(true);

		try {
			const { error } = await supabase.from("teams").insert([
				{
					name: newTeamName.trim(),
					is_active: true,
				},
			]);

			if (error) throw error;

			setAddDialogVisible(false);
			setNewTeamName("");
			loadData();
		} catch (err) {
			console.error("Error creating team:", err);
			Alert.alert("Błąd", "Nie udało się stworzyć zespołu");
		} finally {
			setActionLoading(false);
		}
	};

	const openCoachDialog = (team: Team) => {
		setSelectedTeam(team);
		setSelectedCoachId(team.coach_id || "none");
		setCoachDialogVisible(true);
	};

	const handleAssignCoach = async () => {
		if (!selectedTeam) return;
		setActionLoading(true);

		try {
			const { error } = await supabase
				.from("teams")
				.update({
					coach_id: selectedCoachId === "none" ? null : selectedCoachId,
				})
				.eq("id", selectedTeam.id);

			if (error) throw error;

			setCoachDialogVisible(false);
			loadData();
		} catch (err) {
			console.error("Error assigning coach to team:", err);
			Alert.alert("Błąd", "Nie udało się przypisać trenera");
		} finally {
			setActionLoading(false);
		}
	};

	const handleArchiveTeam = async (teamId: number) => {
		Alert.alert(
			"Archiwizuj zespół",
			"Czy chcesz przenieść ten zespół do archiwum? Wszystkie powiązane treningi i wiadomości zostaną zachowane.",
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Archiwizuj",
					onPress: async () => {
						try {
							const { error } = await supabase
								.from("teams")
								.update({ is_active: false })
								.eq("id", teamId);
							if (error) throw error;
							loadData();
						} catch (err) {
							console.error("Error archiving team:", err);
							Alert.alert("Błąd", "Nie udało się zarchiwizować zespołu");
						}
					}
				}
			]
		);
	};

	const handleRestoreTeam = async (teamId: number) => {
		try {
			const { error } = await supabase
				.from("teams")
				.update({ is_active: true })
				.eq("id", teamId);
			if (error) throw error;
			loadData();
			Alert.alert("Sukces", "Zespół został przywrócony do aktywnych.");
		} catch (err) {
			console.error("Error restoring team:", err);
			Alert.alert("Błąd", "Nie udało się przywrócić zespołu");
		}
	};

	const handleDeleteTeamPermanently = async (teamId: number) => {
		Alert.alert(
			"Usuwanie trwałe",
			"Czy na pewno chcesz DEFINITYWNIE USUNĄĆ ten zespół? Operacja może się nie udać, jeśli w bazie istnieją powiązane rekordy.",
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń trwale",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase.from("teams").delete().eq("id", teamId);
							if (error) throw error;
							loadData();
						} catch (err) {
							console.error("Error deleting team permanently:", err);
							Alert.alert("Błąd", "Nie można trwale usunąć zespołu. Możliwe, że ma przypisanych zawodników lub dane w terminarzu.");
						}
					}
				}
			]
		);
	};

	const getInitials = (first: string, last: string) => {
		return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
	};

	const filteredTeams = teams.filter((t) => showArchived ? !t.is_active : t.is_active);

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
				<Title style={styles.headerTitle}>Zarządzanie Zespołami</Title>
			</LinearGradient>

			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				<View style={styles.actionRow}>
					<Button
						mode="contained"
						icon="plus"
						onPress={() => setAddDialogVisible(true)}
						buttonColor={COLORS.primary}
						textColor={COLORS.white}
						style={styles.addBtn}
						labelStyle={styles.addBtnLabel}
					>
						Stwórz nowy zespół
					</Button>

					<Pressable
						onPress={() => setShowArchived(!showArchived)}
						style={styles.archiveFilterToggle}
					>
						<MaterialCommunityIcons
							name={showArchived ? "eye-outline" : "eye-off-outline"}
							size={20}
							color={COLORS.primary}
						/>
						<Text style={styles.archiveFilterText}>
							{showArchived ? "Pokaż aktywne" : "Pokaż zarchiwizowane"}
						</Text>
					</Pressable>
				</View>

				{filteredTeams.length === 0 ? (
					<View style={styles.emptyContainer}>
						<MaterialCommunityIcons name="shield-outline" size={48} color={COLORS.textLight} />
						<Text style={styles.emptyText}>Brak zespołów w tej kategorii.</Text>
					</View>
				) : (
					filteredTeams.map((t) => (
						<Card key={t.id} style={[styles.card, !t.is_active && styles.archivedCard]}>
							<Card.Content>
								<View style={styles.cardHeader}>
									<Title style={styles.teamTitle}>{t.name}</Title>
									<Text style={styles.playerCountBadge}>{t.player_count} zawodników</Text>
								</View>

								<View style={styles.detailsContainer}>
									<View style={styles.coachRow}>
										{t.coach_avatar ? (
											<Avatar.Image size={24} source={{ uri: t.coach_avatar }} style={styles.coachAvatar} />
										) : (
											<Avatar.Icon size={24} icon="whistle-outline" color={COLORS.primary} style={styles.coachAvatarIcon} />
										)}
										<Text style={styles.detailsText}>
											Trener: <Text style={styles.boldText}>{t.coach_name}</Text>
										</Text>
									</View>
								</View>

								<View style={styles.cardActions}>
									{t.is_active ? (
										<>
											<Button mode="contained" onPress={() => openCoachDialog(t)} style={styles.actionButton} labelStyle={styles.btnLabel}>
												Przypisz trenera
											</Button>
											<Button
												mode="outlined"
												textColor={COLORS.textLight}
												style={styles.archiveButton}
												onPress={() => handleArchiveTeam(t.id)}
												labelStyle={styles.btnLabel}
											>
												Archiwizuj
											</Button>
										</>
									) : (
										<>
											<Button mode="contained" onPress={() => handleRestoreTeam(t.id)} style={styles.restoreButton} labelStyle={styles.btnLabel}>
												Przywróć
											</Button>
											<Button
												mode="outlined"
												textColor={COLORS.error}
												style={styles.deleteButton}
												onPress={() => handleDeleteTeamPermanently(t.id)}
												labelStyle={styles.btnLabel}
											>
												Usuń trwale
											</Button>
										</>
									)}
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			{/* Dialog tworzenia nowego zespołu */}
			<Portal>
				<Dialog visible={addDialogVisible} onDismiss={() => !actionLoading && setAddDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>Dodaj zespół</Dialog.Title>
					<Dialog.Content>
						<TextInput
							label="Nazwa zespołu"
							value={newTeamName}
							onChangeText={setNewTeamName}
							mode="outlined"
							disabled={actionLoading}
							activeOutlineColor={COLORS.primary}
							style={styles.input}
						/>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setAddDialogVisible(false)} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleAddTeam} loading={actionLoading} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Stwórz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Dialog przypisywania trenera */}
			<Portal>
				<Dialog visible={coachDialogVisible} onDismiss={() => !actionLoading && setCoachDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>Przypisz trenera</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							<RadioButton.Group
								onValueChange={setSelectedCoachId}
								value={selectedCoachId}
							>
								<View style={styles.radioItem}>
									<RadioButton value="none" color={COLORS.primary} />
									<Text style={styles.radioText}>Brak trenera</Text>
								</View>
								{coaches.map((c) => (
									<View key={c.id} style={styles.radioItem}>
										<RadioButton value={c.id} color={COLORS.primary} />
										<View style={styles.coachOptionInfo}>
											{c.avatar_url ? (
												<Avatar.Image size={24} source={{ uri: c.avatar_url }} style={styles.radioAvatar} />
											) : (
												<Avatar.Text size={24} label={getInitials(c.first_name, c.last_name)} style={styles.radioAvatar} labelStyle={styles.radioAvatarLabel} />
											)}
											<Text style={styles.radioText}>{`${c.first_name} ${c.last_name}`}</Text>
										</View>
									</View>
								))}
							</RadioButton.Group>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setCoachDialogVisible(false)} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleAssignCoach} loading={actionLoading} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Zapisz
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
	actionRow: {
		flexDirection: "column",
		gap: 12,
		marginBottom: 16,
	},
	addBtn: {
		borderRadius: 12,
		width: "100%",
	},
	addBtnLabel: {
		fontFamily: FONTS.bold,
		fontSize: 15,
		paddingVertical: 4,
	},
	archiveFilterToggle: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		paddingVertical: 10,
		gap: 8,
	},
	archiveFilterText: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 40,
		gap: 12,
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 14,
		fontFamily: FONTS.regular,
	},
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
		elevation: 1,
	},
	archivedCard: {
		backgroundColor: "#f1f5f9",
		borderColor: "#cbd5e1",
		opacity: 0.85,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	teamTitle: {
		fontFamily: FONTS.extraBold,
		fontSize: 18,
		color: COLORS.textDark,
	},
	playerCountBadge: {
		fontSize: 11,
		fontFamily: FONTS.bold,
		color: COLORS.white,
		backgroundColor: COLORS.primaryDark,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		overflow: "hidden",
	},
	detailsContainer: {
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		marginBottom: 12,
	},
	coachRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	coachAvatar: {
		backgroundColor: COLORS.primaryLight,
	},
	coachAvatarIcon: {
		backgroundColor: COLORS.primaryLight,
	},
	detailsText: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
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
		flex: 1.2,
		backgroundColor: COLORS.primary,
		borderRadius: 10,
	},
	archiveButton: {
		flex: 1,
		borderColor: COLORS.border,
		borderWidth: 1,
		borderRadius: 10,
	},
	restoreButton: {
		flex: 1.2,
		backgroundColor: "#10b981", // Green for restore
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
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 6,
		width: "100%",
	},
	coachOptionInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	radioAvatar: {
		backgroundColor: COLORS.primary,
	},
	radioAvatarLabel: {
		color: COLORS.white,
		fontFamily: FONTS.bold,
		fontSize: 10,
	},
	radioText: {
		fontSize: 14,
		fontFamily: FONTS.medium,
		color: COLORS.textDark,
		marginLeft: 4,
	},
	input: {
		backgroundColor: COLORS.white,
	},
	dialogBtnLabel: {
		fontFamily: FONTS.bold,
	},
});
