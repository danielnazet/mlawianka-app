import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Card, Title, Button, Text, IconButton, Portal, Dialog, TextInput, RadioButton } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

interface Coach {
	id: string;
	first_name: string;
	last_name: string;
}

interface Team {
	id: number;
	name: string;
	coach_id: string | null;
	coach_name?: string;
	player_count?: number;
}

export default function ManageTeamsScreen() {
	const { user, profile } = useAuth();
	const [teams, setTeams] = useState<Team[]>([]);
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [loading, setLoading] = useState(true);

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
			// Pobierz zespoły
			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("*")
				.order("id", { ascending: true });

			if (teamsError) throw teamsError;

			// Pobierz profile z rolą 'coach'
			const { data: coachesData, error: coachesError } = await supabase
				.from("profiles")
				.select("id, first_name, last_name")
				.eq("role", "coach");

			if (coachesError) throw coachesError;
			setCoaches(coachesData || []);

			// Pobierz wszystkich członków w celach zliczenia zawodników i przypisania nazwisk trenerów
			const { data: allProfiles } = await supabase.from("profiles").select("id, first_name, last_name, role, team_id");

			const membersList = allProfiles || [];
			const coachMap = new Map(coachesData?.map((c) => [c.id, `${c.first_name} ${c.last_name}`]) || []);

			const enrichedTeams = (teamsData || []).map((t) => {
				const playersInTeam = membersList.filter((m) => m.role === "player" && m.team_id === t.id).length;
				return {
					...t,
					coach_name: t.coach_id ? coachMap.get(t.coach_id) || "Nieznany trener" : "Brak trenera",
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
				},
			]);

			if (error) throw error;

			setAddDialogVisible(false);
			setNewTeamName("");
			loadData();
		} catch (err) {
			console.error("Error creating team:", err);
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
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteTeam = async (teamId: number) => {
		try {
			const { error } = await supabase.from("teams").delete().eq("id", teamId);
			if (error) throw error;
			loadData();
		} catch (err) {
			console.error("Error deleting team:", err);
		}
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
			<View style={styles.headerBar}>
				<IconButton icon="arrow-left" iconColor={COLORS.white} onPress={() => router.back()} />
				<Title style={styles.headerTitle}>Zarządzanie Zespołami</Title>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<Button
					mode="contained"
					icon="plus"
					onPress={() => setAddDialogVisible(true)}
					style={styles.addBtn}
					labelStyle={styles.addBtnLabel}
				>
					Stwórz nowy zespół
				</Button>

				{teams.map((t) => (
					<Card key={t.id} style={styles.card}>
						<Card.Content>
							<View style={styles.cardHeader}>
								<Title style={styles.teamTitle}>{t.name}</Title>
								<Text style={styles.playerCountBadge}>{t.player_count} zawodników</Text>
							</View>

							<View style={styles.detailsContainer}>
								<Text style={styles.detailsText}>
									Trener: <Text style={styles.boldText}>{t.coach_name}</Text>
								</Text>
							</View>

							<View style={styles.cardActions}>
								<Button mode="contained" onPress={() => openCoachDialog(t)} style={styles.actionButton}>
									Przypisz trenera
								</Button>
								<Button
									mode="outlined"
									textColor={COLORS.error}
									style={styles.deleteButton}
									onPress={() => handleDeleteTeam(t.id)}
								>
									Usuń zespół
								</Button>
							</View>
						</Card.Content>
					</Card>
				))}
			</ScrollView>

			{/* Dialog tworzenia nowego zespołu */}
			<Portal>
				<Dialog visible={addDialogVisible} onDismiss={() => !actionLoading && setAddDialogVisible(false)}>
					<Dialog.Title>Nowy Zespół</Dialog.Title>
					<Dialog.Content>
						<TextInput
							label="Nazwa zespołu (np. Juniorzy U-15)"
							value={newTeamName}
							onChangeText={setNewTeamName}
							mode="outlined"
							style={styles.formInput}
							activeOutlineColor={COLORS.primary}
						/>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setAddDialogVisible(false)} disabled={actionLoading}>
							Anuluj
						</Button>
						<Button onPress={handleAddTeam} loading={actionLoading} disabled={actionLoading || !newTeamName.trim()}>
							Stwórz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Dialog wyboru trenera dla zespołu */}
			<Portal>
				<Dialog visible={coachDialogVisible} onDismiss={() => !actionLoading && setCoachDialogVisible(false)}>
					<Dialog.Title>Przypisz trenera do zespołu</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll}>
							<RadioButton.Group
								onValueChange={setSelectedCoachId}
								value={selectedCoachId}
							>
								<View style={styles.radioItem}>
									<RadioButton value="none" color={COLORS.primary} />
									<Text style={styles.radioText}>Brak przypisania (odwołaj trenera)</Text>
								</View>
								{coaches.map((c) => (
									<View key={c.id} style={styles.radioItem}>
										<RadioButton value={c.id} color={COLORS.primary} />
										<Text style={styles.radioText}>{`${c.first_name} ${c.last_name}`}</Text>
									</View>
								))}
							</RadioButton.Group>

							{coaches.length === 0 && (
								<Text style={styles.formError}>Brak trenerów w bazie. Nadaj rolę trenera użytkownikom najpierw.</Text>
							)}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setCoachDialogVisible(false)} disabled={actionLoading}>
							Anuluj
						</Button>
						<Button onPress={handleAssignCoach} loading={actionLoading} disabled={actionLoading}>
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
		backgroundColor: COLORS.primary,
		paddingVertical: 8,
		paddingHorizontal: 8,
	},
	headerTitle: {
		color: COLORS.white,
		fontSize: 18,
		fontWeight: "bold",
		marginLeft: 8,
	},
	scrollContainer: {
		padding: 16,
		paddingBottom: 32,
	},
	addBtn: {
		backgroundColor: COLORS.primary,
		marginBottom: 16,
		borderRadius: 8,
	},
	addBtnLabel: {
		color: COLORS.white,
		fontWeight: "bold",
	},
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	teamTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.textDark,
		flex: 1,
	},
	playerCountBadge: {
		fontSize: 11,
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		fontWeight: "bold",
	},
	detailsContainer: {
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		marginBottom: 12,
	},
	detailsText: {
		fontSize: 14,
		color: COLORS.textDark,
	},
	boldText: {
		fontWeight: "bold",
		color: COLORS.primary,
	},
	cardActions: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	actionButton: {
		flex: 1,
		marginRight: 8,
		backgroundColor: COLORS.primary,
		borderRadius: 8,
	},
	deleteButton: {
		borderColor: COLORS.error,
		borderWidth: 1,
		borderRadius: 8,
	},
	formInput: {
		backgroundColor: COLORS.white,
	},
	dialogScroll: {
		maxHeight: 350,
	},
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 6,
	},
	radioText: {
		fontSize: 15,
		color: COLORS.textDark,
		marginLeft: 8,
	},
	formError: {
		color: COLORS.error,
		marginTop: 12,
		fontSize: 14,
		textAlign: "center",
	},
});
