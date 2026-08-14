import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, ImageBackground } from "react-native";
import { Card, Title, Button, Text, Avatar, Paragraph } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

export default function ProfileScreen() {
	const { user, profile, refreshProfile } = useAuth();
	const [teamName, setTeamName] = useState<string>("Brak przypisania");
	const [coachTeam, setCoachTeam] = useState<string | null>(null);
	const [logoutLoading, setLogoutLoading] = useState(false);
	const [loading, setLoading] = useState(true);

	const loadProfileDetails = async () => {
		if (!profile) {
			setLoading(false);
			return;
		}

		try {
			// Jeśli zawodnik: pobierz nazwę zespołu
			if (profile.role === "player" && profile.team_id) {
				const { data: team } = await supabase
					.from("teams")
					.select("name")
					.eq("id", profile.team_id)
					.single();
				if (team) setTeamName(team.name);
			}

			// Jeśli trener: pobierz zespoły, które prowadzi
			if (profile.role === "coach") {
				const { data: teams } = await supabase
					.from("teams")
					.select("name")
					.eq("coach_id", profile.id);
				
				if (teams && teams.length > 0) {
					setCoachTeam(teams.map((t) => t.name).join(", "));
				} else {
					setCoachTeam("Brak przypisanej drużyny");
				}
			}
		} catch (err) {
			console.error("Error loading additional profile info:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (profile) {
			loadProfileDetails();
		} else {
			setLoading(false);
		}
	}, [profile]);

	const handleLogout = async () => {
		setLogoutLoading(true);
		try {
			const { error } = await supabase.auth.signOut();
			if (error && error.message !== "Auth session missing!") {
				throw error;
			}
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setLogoutLoading(false);
			router.replace("/news");
		}
	};

	const getInitials = () => {
		if (!profile) return "U";
		const first = profile.first_name ? profile.first_name[0] : "";
		const last = profile.last_name ? profile.last_name[0] : "";
		return `${first}${last}`.toUpperCase();
	};

	const formatJoinDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("pl-PL");
	};

	const getRoleLabel = () => {
		if (!profile) return "Użytkownik";
		switch (profile.role) {
			case "admin":
				return "Administrator GKS";
			case "coach":
				return "Trener GKS Strzegowo";
			case "parent":
				return "Rodzic Zawodnika";
			case "player":
				return "Zawodnik GKS Strzegowo";
			default:
				return "Użytkownik";
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
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			{!user ? (
				<View style={styles.guestContainer}>
					<Card style={styles.guestCard}>
						<Card.Content style={styles.guestContent}>
							<Title style={styles.guestTitle}>Twój Profil</Title>
							<Paragraph style={styles.guestDescription}>
								Zaloguj się, aby wyświetlić szczegóły profilu, sprawdzić przypisaną grupę treningową oraz zarządzać kontem.
							</Paragraph>
							<Button
								mode="contained"
								onPress={() => router.push("/auth/login")}
								style={styles.guestButton}
								labelStyle={styles.guestButtonLabel}
							>
								Zaloguj się lub zarejestruj
							</Button>
						</Card.Content>
					</Card>
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<View style={styles.header}>
						<Avatar.Text
							size={84}
							label={getInitials()}
							style={styles.avatar}
							labelStyle={styles.avatarLabel}
						/>
						<Title style={styles.name}>
							{profile ? `${profile.first_name} ${profile.last_name}` : "Użytkownik"}
						</Title>
						<Text style={styles.roleText}>{getRoleLabel()}</Text>
					</View>

					<Card style={styles.card}>
						<Card.Content>
							<View style={styles.infoRow}>
								<Text style={styles.label}>Adres E-mail:</Text>
								<Text style={styles.value}>{profile?.email || user?.email}</Text>
							</View>

							{/* Dane dla Zawodnika */}
							{profile?.role === "player" && (
								<View style={styles.infoRow}>
									<Text style={styles.label}>Grupa Treningowa:</Text>
									<Text style={styles.value}>{teamName}</Text>
								</View>
							)}

							{/* Dane dla Trenera */}
							{profile?.role === "coach" && (
								<View style={styles.infoRow}>
									<Text style={styles.label}>Prowadzona drużyna:</Text>
									<Text style={styles.value}>{coachTeam}</Text>
								</View>
							)}

							{/* Dane dla Rodzica */}
							{profile?.role === "parent" && (
								<View style={styles.parentSection}>
									<View style={styles.infoRow}>
										<Text style={styles.label}>Dziecko (imię):</Text>
										<Text style={styles.value}>{profile.child_first_name || "Nie podano"}</Text>
									</View>
									<View style={styles.infoRow}>
										<Text style={styles.label}>Dziecko (nazwisko):</Text>
										<Text style={styles.value}>{profile.child_last_name || "Nie podano"}</Text>
									</View>
								</View>
							)}

							<View style={styles.infoRow}>
								<Text style={styles.label}>Data dołączenia:</Text>
								<Text style={styles.value}>
									{profile?.created_at ? formatJoinDate(profile.created_at) : "Brak danych"}
								</Text>
							</View>
						</Card.Content>
					</Card>

					{/* Opcje Administratora */}
					{profile?.role === "admin" && (
						<Card style={[styles.card, styles.adminCard]}>
							<Card.Content>
								<Title style={styles.adminTitle}>Zarządzanie Klubem (Admin)</Title>
								<Button
									mode="contained"
									icon="account-group"
									onPress={() => router.push("/admin/manage_members")}
									style={styles.adminButton}
									buttonColor={COLORS.primary}
								>
									Zarządzaj Członkami
								</Button>
								<Button
									mode="contained"
									icon="shield-home"
									onPress={() => router.push("/admin/manage_teams")}
									style={styles.adminButton}
									buttonColor={COLORS.primary}
								>
									Zarządzaj Zespołami
								</Button>
							</Card.Content>
						</Card>
					)}

					<Button
						mode="contained"
						onPress={handleLogout}
						style={styles.logoutButton}
						labelStyle={styles.logoutButtonLabel}
						loading={logoutLoading}
						disabled={logoutLoading}
					>
						Wyloguj się
					</Button>
				</ScrollView>
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
	scrollContainer: {
		padding: 16,
	},
	header: {
		alignItems: "center",
		marginVertical: 24,
	},
	avatar: {
		backgroundColor: COLORS.primary,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	avatarLabel: {
		color: COLORS.white,
		fontSize: 32,
		fontWeight: "bold",
	},
	name: {
		fontSize: 22,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginTop: 12,
	},
	roleText: {
		fontSize: 14,
		color: COLORS.textLight,
		marginTop: 2,
		fontWeight: "600",
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 20,
	},
	adminCard: {
		borderColor: COLORS.primary,
		borderWidth: 1.5,
	},
	adminTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: COLORS.primary,
		marginBottom: 12,
		textAlign: "center",
	},
	adminButton: {
		marginVertical: 6,
		borderRadius: 8,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		paddingBottom: 8,
	},
	parentSection: {
		width: "100%",
	},
	label: {
		fontWeight: "bold",
		color: COLORS.textLight,
		fontSize: 14,
	},
	value: {
		color: COLORS.textDark,
		fontSize: 14,
		fontWeight: "500",
	},
	logoutButton: {
		backgroundColor: COLORS.error,
		borderRadius: 8,
		paddingVertical: 4,
		marginBottom: 32,
	},
	logoutButtonLabel: {
		fontWeight: "bold",
		fontSize: 16,
		color: COLORS.white,
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
});
