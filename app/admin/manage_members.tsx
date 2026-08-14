import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Card, Title, Button, Text, Avatar, RadioButton, Portal, Dialog, TextInput, IconButton } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

interface Team {
	id: number;
	name: string;
}

interface MemberProfile {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	role: "admin" | "coach" | "player" | "parent";
	team_id: number | null;
	child_first_name?: string;
	child_last_name?: string;
	created_at: string;
}

export default function ManageMembersScreen() {
	const { user, profile } = useAuth();
	const [members, setMembers] = useState<MemberProfile[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);

	// Stan edycji roli i zespołu
	const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editRole, setEditRole] = useState<"admin" | "coach" | "player" | "parent">("player");
	const [editTeamId, setEditTeamId] = useState<string>("");
	const [actionLoading, setActionLoading] = useState(false);

	// Stan łączenia rodzica z dzieckiem
	const [relationDialogVisible, setRelationDialogVisible] = useState(false);
	const [selectedChildId, setSelectedChildId] = useState<string>("");
	const [playersList, setPlayersList] = useState<MemberProfile[]>([]);

	const fetchMembersAndTeams = async () => {
		try {
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("*")
				.order("last_name", { ascending: true });

			const { data: teamsData, error: teamsError } = await supabase
				.from("teams")
				.select("*")
				.order("id", { ascending: true });

			if (profilesError) throw profilesError;
			if (teamsError) throw teamsError;

			setMembers(profilesData || []);
			setTeams(teamsData || []);
			
			// Wyodrębnij zawodników na potrzeby parowania rodzic-dziecko
			const players = (profilesData || []).filter((p) => p.role === "player") as MemberProfile[];
			setPlayersList(players);
		} catch (err) {
			console.error("Error loading admin members data:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (profile?.role !== "admin") {
			router.replace("/profile");
			return;
		}
		fetchMembersAndTeams();
	}, [profile]);

	const openEditDialog = (member: MemberProfile) => {
		setSelectedMember(member);
		setEditRole(member.role);
		setEditTeamId(member.team_id ? member.team_id.toString() : "none");
		setDialogVisible(true);
	};

	const handleSaveMemberChanges = async () => {
		if (!selectedMember) return;
		setActionLoading(true);

		try {
			const updateData: any = {
				role: editRole,
				team_id: editTeamId === "none" ? null : parseInt(editTeamId),
			};

			const { error } = await supabase
				.from("profiles")
				.update(updateData)
				.eq("id", selectedMember.id);

			if (error) throw error;

			setDialogVisible(false);
			fetchMembersAndTeams();
		} catch (err) {
			console.error("Error updating member:", err);
		} finally {
			setActionLoading(false);
		}
	};

	const openRelationDialog = (parent: MemberProfile) => {
		setSelectedMember(parent);
		setSelectedChildId("");
		setRelationDialogVisible(true);
	};

	const handleSaveRelation = async () => {
		if (!selectedMember || !selectedChildId) return;
		setActionLoading(true);

		try {
			// Wstaw powiązanie rodzic-dziecko
			const { error } = await supabase.from("parent_children").insert([
				{
					parent_id: selectedMember.id,
					child_id: selectedChildId,
				},
			]);

			if (error) throw error;

			setRelationDialogVisible(false);
			fetchMembersAndTeams();
		} catch (err) {
			console.error("Error saving parent-child relation:", err);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteMember = async (memberId: string) => {
		// W rzeczywistym środowisku usuwanie konta wymaga Admin API
		// Tutaj po prostu odepniemy użytkownika usuwając jego profil z bazy
		try {
			const { error } = await supabase.from("profiles").delete().eq("id", memberId);
			if (error) throw error;
			fetchMembersAndTeams();
		} catch (err) {
			console.error("Error deleting member profile:", err);
		}
	};

	const getTeamName = (teamId: number | null) => {
		if (!teamId) return "Brak przypisania";
		const team = teams.find((t) => t.id === teamId);
		return team ? team.name : `Grupa #${teamId}`;
	};

	const getRoleText = (role: string) => {
		switch (role) {
			case "admin": return "Admin";
			case "coach": return "Trener";
			case "player": return "Zawodnik";
			case "parent": return "Rodzic";
			default: return role;
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
				<Title style={styles.headerTitle}>Zarządzanie Członkami</Title>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContainer}>
				{members.map((m) => (
					<Card key={m.id} style={styles.card}>
						<Card.Content>
							<View style={styles.memberHeader}>
								<Avatar.Text
									size={40}
									label={`${m.first_name[0]}${m.last_name[0]}`}
									style={styles.avatar}
									labelStyle={styles.avatarLabel}
								/>
								<View style={styles.memberInfo}>
									<Text style={styles.memberName}>{`${m.first_name} ${m.last_name}`}</Text>
									<Text style={styles.memberEmail}>{m.email}</Text>
								</View>
								<Text style={styles.roleBadge}>{getRoleText(m.role)}</Text>
							</View>

							<View style={styles.detailsContainer}>
								<Text style={styles.detailsText}>
									Zespół: <Text style={styles.boldText}>{getTeamName(m.team_id)}</Text>
								</Text>

								{m.role === "parent" && (
									<View style={styles.parentBox}>
										<Text style={styles.detailsText}>
											Deklarowane dziecko: <Text style={styles.boldText}>{m.child_first_name} {m.child_last_name}</Text>
										</Text>
										<Button
											mode="outlined"
											compact
											style={styles.actionSubButton}
											onPress={() => openRelationDialog(m)}
										>
											Połącz z profilem dziecka
										</Button>
									</View>
								)}
							</View>

							<View style={styles.cardActions}>
								<Button mode="contained" onPress={() => openEditDialog(m)} style={styles.actionButton}>
									Edytuj grupę / rolę
								</Button>
								<Button
									mode="outlined"
									textColor={COLORS.error}
									style={styles.deleteButton}
									onPress={() => handleDeleteMember(m.id)}
								>
									Usuń profil
								</Button>
							</View>
						</Card.Content>
					</Card>
				))}
			</ScrollView>

			{/* Dialog edycji grupy/roli */}
			<Portal>
				<Dialog visible={dialogVisible} onDismiss={() => !actionLoading && setDialogVisible(false)}>
					<Dialog.Title>Edytuj członka</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll}>
							<Text style={styles.dialogLabel}>Rola w klubie:</Text>
							<RadioButton.Group
								onValueChange={(val) => setEditRole(val as any)}
								value={editRole}
							>
								<View style={styles.radioRow}>
									<View style={styles.radioItem}>
										<RadioButton value="player" color={COLORS.primary} />
										<Text style={styles.radioText}>Zawodnik</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton value="parent" color={COLORS.primary} />
										<Text style={styles.radioText}>Rodzic</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton value="coach" color={COLORS.primary} />
										<Text style={styles.radioText}>Trener</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton value="admin" color={COLORS.primary} />
										<Text style={styles.radioText}>Admin</Text>
									</View>
								</View>
							</RadioButton.Group>

							<Text style={styles.dialogLabel}>Grupa / Zespół:</Text>
							<RadioButton.Group
								onValueChange={setEditTeamId}
								value={editTeamId}
							>
								<View style={styles.radioItem}>
									<RadioButton value="none" color={COLORS.primary} />
									<Text style={styles.radioText}>Brak przypisania</Text>
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
						<Button onPress={() => setDialogVisible(false)} disabled={actionLoading}>
							Anuluj
						</Button>
						<Button onPress={handleSaveMemberChanges} loading={actionLoading} disabled={actionLoading}>
							Zapisz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Dialog parowania rodzica z dzieckiem */}
			<Portal>
				<Dialog visible={relationDialogVisible} onDismiss={() => !actionLoading && setRelationDialogVisible(false)}>
					<Dialog.Title>Połącz rodzica z zawodnikiem</Dialog.Title>
					<Dialog.Content>
						<ScrollView style={styles.dialogScroll}>
							<Text style={styles.dialogLabel}>Wybierz profil dziecka z listy zarejestrowanych zawodników:</Text>
							<RadioButton.Group
								onValueChange={setSelectedChildId}
								value={selectedChildId}
							>
								{playersList.map((p) => (
									<View key={p.id} style={styles.radioItem}>
										<RadioButton value={p.id} color={COLORS.primary} />
										<Text style={styles.radioText}>{`${p.first_name} ${p.last_name} (${getTeamName(p.team_id)})`}</Text>
									</View>
								))}
							</RadioButton.Group>

							{playersList.length === 0 && (
								<Text style={styles.formError}>Brak zarejestrowanych zawodników w systemie.</Text>
							)}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setRelationDialogVisible(false)} disabled={actionLoading}>
							Anuluj
						</Button>
						<Button onPress={handleSaveRelation} loading={actionLoading} disabled={actionLoading || !selectedChildId}>
							Połącz
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</View>
	);
}

// Zrzuty stylów
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
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		elevation: 2,
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
		fontWeight: "bold",
	},
	memberInfo: {
		marginLeft: 12,
		flex: 1,
	},
	memberName: {
		fontWeight: "bold",
		fontSize: 16,
		color: COLORS.textDark,
	},
	memberEmail: {
		fontSize: 13,
		color: COLORS.textLight,
	},
	roleBadge: {
		fontSize: 11,
		fontWeight: "bold",
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
	detailsText: {
		fontSize: 14,
		color: COLORS.textDark,
		marginVertical: 2,
	},
	boldText: {
		fontWeight: "bold",
		color: COLORS.primary,
	},
	parentBox: {
		marginTop: 8,
		backgroundColor: COLORS.primaryLight,
		padding: 10,
		borderRadius: 8,
	},
	actionSubButton: {
		marginTop: 6,
		borderColor: COLORS.primary,
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
	dialogScroll: {
		maxHeight: 350,
	},
	dialogLabel: {
		fontSize: 15,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginTop: 12,
		marginBottom: 6,
	},
	radioRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 12,
	},
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 4,
		width: "50%",
	},
	radioText: {
		fontSize: 14,
		color: COLORS.textDark,
		marginLeft: 4,
	},
	formError: {
		color: COLORS.error,
		marginTop: 12,
		fontSize: 14,
		textAlign: "center",
	},
});
