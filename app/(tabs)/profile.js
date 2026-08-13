import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Card, Title, Button, Text, Avatar, Paragraph } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";

const GROUP_LABELS = {
	group_a: "Grupa A (U-8)",
	group_b: "Grupa B (U-10)",
	group_c: "Grupa C (U-12)",
	group_d: "Grupa D (U-14)",
};

export default function ProfileScreen() {
	const { user } = useAuth();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [logoutLoading, setLogoutLoading] = useState(false);

	const fetchProfile = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.single();

			if (error) throw error;
			setProfile(data);
		} catch (error) {
			console.error("Error fetching profile:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProfile();
	}, [user]);

	const handleLogout = async () => {
		setLogoutLoading(true);
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			router.replace("/auth/login");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setLogoutLoading(false);
		}
	};

	const getInitials = () => {
		if (!profile) return "U";
		const first = profile.first_name ? profile.first_name[0] : "";
		const last = profile.last_name ? profile.last_name[0] : "";
		return `${first}${last}`.toUpperCase();
	};

	const formatJoinDate = (dateString) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("pl-PL");
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	if (!user) {
		return (
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
		);
	}

	return (
		<View style={styles.container}>
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
					<Text style={styles.roleText}>
						{profile?.role === "admin" ? "Administrator" : "Zawodnik Mławianki"}
					</Text>
				</View>

				<Card style={styles.card}>
					<Card.Content>
						<View style={styles.infoRow}>
							<Text style={styles.label}>Adres E-mail:</Text>
							<Text style={styles.value}>{profile?.email || user?.email}</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.label}>Grupa Treningowa:</Text>
							<Text style={styles.value}>
								{profile?.training_group ? GROUP_LABELS[profile.training_group] : "Brak przypisania"}
							</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.label}>Data dołączenia:</Text>
							<Text style={styles.value}>
								{profile?.created_at ? formatJoinDate(profile.created_at) : "Brak danych"}
							</Text>
						</View>
					</Card.Content>
				</Card>

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
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 24,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f3f4f6",
		paddingBottom: 8,
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
		backgroundColor: COLORS.background,
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
