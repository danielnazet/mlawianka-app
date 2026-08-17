import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from "react-native";
import { Card, Title, Button, Text, Avatar, Portal, Dialog, RadioButton, IconButton } from "react-native-paper";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Team {
	id: number;
	name: string;
}

interface MemberProfile {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	role: "player" | "parent" | "coach";
	team_id: number | null;
	age?: number | null;
	child_first_name?: string | null;
	child_last_name?: string | null;
	child_age?: number | null;
	created_at: string;
}

export default function ManageMembersScreen() {
	const { profile } = useAuth();
	const insets = useSafeAreaInsets();
	const [activeTab, setActiveTab] = useState<"players" | "parents">("players");
	const [members, setMembers] = useState<MemberProfile[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Stan przenoszenia członka do innej grupy
	const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
	const [teamDialogVisible, setTeamDialogVisible] = useState(false);
	const [selectedTeamId, setSelectedTeamId] = useState<string>("none");
	const [actionLoading, setActionLoading] = useState(false);

	const loadData = async () => {
		try {
			// Pobierz profilów (graczy i rodziców)
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("*")
				.in("role", ["player", "parent"])
				.order("last_name", { ascending: true });

			// Pobierz aktywne zespoły
			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("id, name")
				.eq("is_active", true)
				.order("id", { ascending: true });

			if (profilesError) throw profilesError;
			if (teamsError) throw teamsError;

			setMembers((profilesData || []) as MemberProfile[]);
			setTeams(teamsData || []);
		} catch (err) {
			console.error("Error loading members data:", err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		if (profile?.role !== "admin") {
			router.replace("/profile");
			return;
		}
		loadData();
	}, [profile]);

	const handleOpenTeamDialog = (member: MemberProfile) => {
		setSelectedMember(member);
		setSelectedTeamId(member.team_id ? member.team_id.toString() : "none");
		setTeamDialogVisible(true);
	};

	const handleSaveTeamChange = async () => {
		if (!selectedMember) return;
		setActionLoading(true);

		try {
			const updatedTeamId = selectedTeamId === "none" ? null : parseInt(selectedTeamId);

			const { error } = await supabase
				.from("profiles")
				.update({ team_id: updatedTeamId })
				.eq("id", selectedMember.id);

			if (error) throw error;

			setTeamDialogVisible(false);
			Alert.alert("Sukces", "Grupa treningowa została pomyślnie zmieniona.");
			loadData();
		} catch (err) {
			console.error("Error changing member team:", err);
			Alert.alert("Błąd", "Nie udało się zapisać zmian.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteMember = (member: MemberProfile) => {
		Alert.alert(
			"Usuwanie członka",
			`Czy na pewno chcesz usunąć profil użytkownika: ${member.first_name} ${member.last_name}? Tej operacji nie można cofnąć.`,
			[
				{ text: "Anuluj", style: "cancel" },
				{
					text: "Usuń",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase
								.from("profiles")
								.delete()
								.eq("id", member.id);

							if (error) throw error;
							loadData();
							Alert.alert("Sukces", "Użytkownik został usunięty.");
						} catch (err) {
							console.error("Error deleting member profile:", err);
							Alert.alert("Błąd", "Nie udało się usunąć użytkownika.");
						}
					}
				}
			]
		);
	};

	const getTeamName = (teamId: number | null) => {
		if (!teamId) return "Brak przypisania";
		const team = teams.find((t) => t.id === teamId);
		return team ? team.name : `Grupa #${teamId}`;
	};

	const getInitials = (first: string, last: string) => {
		return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
	};

	const filteredMembers = members.filter((m) =>
		activeTab === "players" ? m.role === "player" : m.role === "parent"
	);

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
				<Title style={styles.headerTitle}>Zarządzanie Członkami</Title>
			</LinearGradient>

			{/* Zakładki wyboru: Zawodnicy / Rodzice */}
			<View style={styles.tabContainer}>
				<Button
					mode={activeTab === "players" ? "contained" : "outlined"}
					onPress={() => setActiveTab("players")}
					style={styles.tabButton}
					textColor={activeTab === "players" ? COLORS.white : COLORS.primary}
					buttonColor={activeTab === "players" ? COLORS.primary : "transparent"}
				>
					Zawodnicy
				</Button>
				<Button
					mode={activeTab === "parents" ? "contained" : "outlined"}
					onPress={() => setActiveTab("parents")}
					style={styles.tabButton}
					textColor={activeTab === "parents" ? COLORS.white : COLORS.primary}
					buttonColor={activeTab === "parents" ? COLORS.primary : "transparent"}
				>
					Rodzice
				</Button>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				{filteredMembers.length === 0 ? (
					<View style={styles.emptyContainer}>
						<MaterialCommunityIcons name="account-search-outline" size={48} color={COLORS.textLight} />
						<Text style={styles.emptyText}>Brak zarejestrowanych członków w tej kategorii.</Text>
					</View>
				) : (
					filteredMembers.map((m) => (
						<Card key={m.id} style={styles.card}>
							<Card.Content>
								<View style={styles.memberHeader}>
									<Avatar.Text
										size={44}
										label={getInitials(m.first_name, m.last_name)}
										style={styles.avatar}
										labelStyle={styles.avatarLabel}
									/>
									<View style={styles.memberInfo}>
										<Text style={styles.memberName}>{`${m.first_name} ${m.last_name}`}</Text>
										<Text style={styles.memberEmail}>{m.email}</Text>
									</View>
								</View>

								<View style={styles.detailsContainer}>
									{m.role === "player" ? (
										<>
											<Text style={styles.detailsText}>
												Wiek zawodnika: <Text style={styles.boldText}>{m.age ? `${m.age} lat` : "Nie podano"}</Text>
											</Text>
											<Text style={styles.detailsText}>
												Grupa treningowa: <Text style={styles.boldText}>{getTeamName(m.team_id)}</Text>
											</Text>
										</>
									) : (
										<>
											<Text style={styles.detailsText}>
												Dziecko: <Text style={styles.boldText}>{m.child_first_name || m.child_last_name ? `${m.child_first_name} ${m.child_last_name}` : "Nie podano"}</Text>
											</Text>
											<Text style={styles.detailsText}>
												Wiek dziecka: <Text style={styles.boldText}>{m.child_age ? `${m.child_age} lat` : "Nie podano"}</Text>
											</Text>
											<Text style={styles.detailsText}>
												Grupa treningowa dziecka: <Text style={styles.boldText}>{getTeamName(m.team_id)}</Text>
											</Text>
										</>
									)}
								</View>

								<View style={styles.cardActions}>
									<Button
										mode="contained"
										icon="swap-horizontal"
										onPress={() => handleOpenTeamDialog(m)}
										style={styles.actionButton}
										labelStyle={styles.btnLabel}
									>
										Przenieś do grupy
									</Button>
									<Button
										mode="outlined"
										icon="delete-outline"
										textColor={COLORS.error}
										style={styles.deleteButton}
										onPress={() => handleDeleteMember(m)}
										labelStyle={styles.btnLabel}
									>
										Usuń
									</Button>
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			{/* Dialog przenoszenia do innej grupy */}
			<Portal>
				<Dialog visible={teamDialogVisible} onDismiss={() => !actionLoading && setTeamDialogVisible(false)} style={styles.dialog}>
					<Dialog.Title style={styles.dialogTitle}>Przenieś do innej grupy</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
							<RadioButton.Group
								onValueChange={setSelectedTeamId}
								value={selectedTeamId}
							>
								<View style={styles.radioItem}>
									<RadioButton value="none" color={COLORS.primary} />
									<Text style={styles.radioText}>Brak przypisania (odpięty)</Text>
								</View>
								{teams.map((t) => (
									<View key={t.id} style={styles.radioItem}>
										<RadioButton value={t.id.toString()} color={COLORS.primary} />
										<Text style={styles.radioText}>{t.name}</Text>
									</View>
								))}
							</RadioButton.Group>
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setTeamDialogVisible(false)} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
							Anuluj
						</Button>
						<Button onPress={handleSaveTeamChange} loading={actionLoading} disabled={actionLoading} labelStyle={styles.dialogBtnLabel}>
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
	tabContainer: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		gap: 12,
	},
	tabButton: {
		flex: 1,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.primary,
	},
	scrollContainer: {
		padding: 16,
		paddingBottom: 40,
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
		textAlign: "center",
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
		marginVertical: 3,
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
		flex: 1.5,
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
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 6,
		width: "100%",
	},
	radioText: {
		fontSize: 14,
		fontFamily: FONTS.medium,
		color: COLORS.textDark,
		marginLeft: 8,
	},
	dialogBtnLabel: {
		fontFamily: FONTS.bold,
	},
});
