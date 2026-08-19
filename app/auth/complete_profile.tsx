import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ImageBackground, Image, TouchableOpacity, Pressable, Alert } from "react-native";
import { Text, TextInput, Button, Card, Portal, Dialog, Checkbox } from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { Team } from "../../types";

import { findTeamIdByAge, getAgeFromInput } from "../../constants/teams";

export default function CompleteProfileScreen() {
	const { user, profile, refreshProfile } = useAuth();
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [firstName, setFirstName] = useState(profile?.first_name || user?.user_metadata?.full_name?.split(" ")[0] || "");
	const [lastName, setLastName] = useState(profile?.last_name || user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "");
	const [selectedRole, setSelectedRole] = useState<"player" | "parent" | "fan">("player");
	const [selectedTeamId, setSelectedTeamId] = useState<string>("");

	// Dane dziecka dla rodzica
	const [childFirstName, setChildFirstName] = useState("");
	const [childLastName, setChildLastName] = useState("");
	const [childAge, setChildAge] = useState("");
	const [childTeamId, setChildTeamId] = useState<string>("");

	// Modale wyboru zespołów
	const [teamModalVisible, setTeamModalVisible] = useState(false);
	const [childTeamModalVisible, setChildTeamModalVisible] = useState(false);
	const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

	const handleChildAgeChange = (val: string) => {
		setChildAge(val);
		const calculatedAge = getAgeFromInput(val);
		if (calculatedAge !== null && teams.length > 0) {
			const matchedTeamId = findTeamIdByAge(calculatedAge, teams);
			if (matchedTeamId) {
				setChildTeamId(matchedTeamId.toString());
			}
		}
	};

	useEffect(() => {
		if (profile?.role) {
			router.replace("/(tabs)/news");
		}
	}, [profile]);

	useEffect(() => {
		fetchTeams();
	}, []);

	const sortTeamsOrdered = (teamsList: Team[]) => {
		return [...teamsList].sort((a, b) => {
			const nameA = a.name.toLowerCase();
			const nameB = b.name.toLowerCase();
			const isSeniorA = nameA.includes("senior") || nameA.includes("pierwszy") || nameA.includes("i zespół");
			const isSeniorB = nameB.includes("senior") || nameB.includes("pierwszy") || nameB.includes("i zespół");
			if (isSeniorA && !isSeniorB) return -1;
			if (!isSeniorA && isSeniorB) return 1;
			const matchA = nameA.match(/u-?(\d+)/i);
			const matchB = nameB.match(/u-?(\d+)/i);
			if (matchA && matchB) return parseInt(matchB[1]) - parseInt(matchA[1]);
			if (matchA && !matchB) return -1;
			if (!matchA && matchB) return 1;
			return nameA.localeCompare(nameB, "pl");
		});
	};

	const fetchTeams = async () => {
		try {
			const { data, error: err } = await supabase.from("teams").select("*");
			if (err) throw err;
			const sorted = sortTeamsOrdered(data || []);
			setTeams(sorted);
			if (sorted.length > 0) {
				setSelectedTeamId(sorted[0].id.toString());
				setChildTeamId(sorted[0].id.toString());
			}
		} catch (err) {
			console.error("Error fetching teams:", err);
		}
	};

	const handleSaveProfile = async () => {
		if (!user) return;
		if (!firstName.trim() || !lastName.trim()) {
			setError("Proszę podać imię i nazwisko");
			return;
		}

		if (selectedRole === "player" && !selectedTeamId) {
			setError("Proszę wybrać zespół");
			return;
		}

		if (selectedRole === "parent") {
			if (!childFirstName.trim() || !childLastName.trim() || !childAge.trim()) {
				setError("Proszę podać imię, nazwisko oraz wiek dziecka");
				return;
			}
			if (!childTeamId) {
				setError("Nie udało się przypisać zespołu dla podanego wieku dziecka.");
				return;
			}
		}

		if (!acceptedPrivacy) {
			setError("Proszę zaakceptować regulamin i politykę prywatności, aby kontynuować.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// 1. Utwórz lub zaktualizuj profil głównego użytkownika (upsert)
			const upsertPayload: any = {
				id: user.id,
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				role: selectedRole,
				email: user?.email || profile?.email || null,
				team_id: selectedRole === "player" ? parseInt(selectedTeamId) : (selectedRole === "parent" && childTeamId ? parseInt(childTeamId) : null),
				child_first_name: selectedRole === "parent" ? childFirstName.trim() : null,
				child_last_name: selectedRole === "parent" ? childLastName.trim() : null,
				child_age: selectedRole === "parent" && childAge ? parseInt(childAge) : null,
			};

			const { error: profileErr } = await supabase
				.from("profiles")
				.upsert(upsertPayload);

			if (profileErr) throw profileErr;

			// 2. Jeśli to rodzic, stwórz profil dziecka i relację parent_children
			if (selectedRole === "parent") {
				const { data: childProfile, error: childErr } = await supabase
					.from("profiles")
					.insert([
						{
							first_name: childFirstName.trim(),
							last_name: childLastName.trim(),
							age: childAge ? parseInt(childAge) : null,
							role: "player",
							team_id: parseInt(childTeamId),
						},
					])
					.select()
					.single();

				if (childErr) throw childErr;

				// Powiąż rodzica z dzieckiem
				if (childProfile) {
					const { error: relErr } = await supabase
						.from("parent_children")
						.insert([
							{
								parent_id: user.id,
								child_id: childProfile.id,
							},
						]);

					if (relErr) throw relErr;
				}
			}

			await refreshProfile();
			router.replace("/(tabs)/news");
		} catch (err: any) {
			console.error("Error completing profile:", err);
			setError(err.message || "Wystąpił błąd podczas zapisywania profilu");
		} finally {
			setLoading(false);
		}
	};

	return (
		<ImageBackground
			source={require("../assets/logo_gks.png")}
			style={styles.container}
			imageStyle={styles.backgroundImageStyle}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<Image source={require("../assets/logo_gks.png")} style={styles.logo} />
					<Text style={styles.title}>Dokończ rejestrację</Text>
					<Text style={styles.subtitle}>
						Witaj w klubie GKS Strzegowo! Uzupełnij profil, aby uzyskać dostęp do aplikacji.
					</Text>
				</View>

				<Card style={styles.card}>
					<Card.Content>
						<Text style={styles.sectionTitle}>Twoje dane osobowe</Text>
						<TextInput
							label="Imię"
							value={firstName}
							onChangeText={setFirstName}
							mode="outlined"
							style={styles.input}
							outlineColor={COLORS.border}
							activeOutlineColor={COLORS.primary}
							textColor={COLORS.textDark}
							left={<TextInput.Icon icon="account" color={COLORS.primary} />}
						/>
						<TextInput
							label="Nazwisko"
							value={lastName}
							onChangeText={setLastName}
							mode="outlined"
							style={styles.input}
							outlineColor={COLORS.border}
							activeOutlineColor={COLORS.primary}
							textColor={COLORS.textDark}
							left={<TextInput.Icon icon="account" color={COLORS.primary} />}
						/>

						<Text style={styles.sectionTitle}>Wybierz swoją rolę w klubie</Text>
						<View style={styles.roleSelectionRow}>
							<TouchableOpacity
								activeOpacity={0.85}
								style={[styles.roleCard, selectedRole === "player" && styles.roleCardActive]}
								onPress={() => setSelectedRole("player")}
							>
								<MaterialCommunityIcons
									name="soccer"
									size={26}
									color={selectedRole === "player" ? COLORS.white : COLORS.primary}
								/>
								<Text style={[styles.roleCardTitle, selectedRole === "player" && styles.roleCardTitleActive]}>
									Zawodnik
								</Text>
								<Text style={[styles.roleCardSub, selectedRole === "player" && styles.roleCardSubActive]}>
									Gram w zespole
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								activeOpacity={0.85}
								style={[styles.roleCard, selectedRole === "parent" && styles.roleCardActive]}
								onPress={() => setSelectedRole("parent")}
							>
								<MaterialCommunityIcons
									name="human-male-child"
									size={26}
									color={selectedRole === "parent" ? COLORS.white : COLORS.primary}
								/>
								<Text style={[styles.roleCardTitle, selectedRole === "parent" && styles.roleCardTitleActive]}>
									Rodzic
								</Text>
								<Text style={[styles.roleCardSub, selectedRole === "parent" && styles.roleCardSubActive]}>
									Mam dziecko w klubie
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								activeOpacity={0.85}
								style={[styles.roleCard, selectedRole === "fan" && styles.roleCardActive]}
								onPress={() => setSelectedRole("fan")}
							>
								<MaterialCommunityIcons
									name="bullhorn"
									size={26}
									color={selectedRole === "fan" ? COLORS.white : COLORS.primary}
								/>
								<Text style={[styles.roleCardTitle, selectedRole === "fan" && styles.roleCardTitleActive]}>
									Kibic
								</Text>
								<Text style={[styles.roleCardSub, selectedRole === "fan" && styles.roleCardSubActive]}>
									Kibicuję GKS
								</Text>
							</TouchableOpacity>
						</View>

						{selectedRole === "player" && (
							<View style={styles.roleSubSection}>
								<Text style={styles.fieldLabel}>Twój zespół:</Text>
								<TouchableOpacity
									style={styles.dropdownSelector}
									activeOpacity={0.8}
									onPress={() => setTeamModalVisible(true)}
								>
									<MaterialIcons name="groups" size={22} color={COLORS.primary} />
									<Text style={styles.dropdownSelectorText}>
										{teams.find((t) => t.id.toString() === selectedTeamId)?.name || "Wybierz zespół"}
									</Text>
									<MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textLight} />
								</TouchableOpacity>
							</View>
						)}

						{selectedRole === "parent" && (
							<View style={styles.roleSubSection}>
								<Text style={styles.sectionTitle}>Dane Twojego dziecka</Text>
								<TextInput
									label="Imię dziecka"
									value={childFirstName}
									onChangeText={setChildFirstName}
									mode="outlined"
									style={styles.input}
									outlineColor={COLORS.border}
									activeOutlineColor={COLORS.primary}
									textColor={COLORS.textDark}
									left={<TextInput.Icon icon="account-child" color={COLORS.primary} />}
								/>
								<TextInput
									label="Nazwisko dziecka"
									value={childLastName}
									onChangeText={setChildLastName}
									mode="outlined"
									style={styles.input}
									outlineColor={COLORS.border}
									activeOutlineColor={COLORS.primary}
									textColor={COLORS.textDark}
									left={<TextInput.Icon icon="account-child" color={COLORS.primary} />}
								/>
								<TextInput
									label="Wiek lub rok urodzenia (np. 10 lub 2016)"
									value={childAge}
									onChangeText={handleChildAgeChange}
									keyboardType="numeric"
									mode="outlined"
									style={styles.input}
									outlineColor={COLORS.border}
									activeOutlineColor={COLORS.primary}
									textColor={COLORS.textDark}
									left={<TextInput.Icon icon="calendar-clock" color={COLORS.primary} />}
								/>

								<Text style={styles.fieldLabel}>Przypisany zespół dziecka (automatyczny wg wieku):</Text>
								<View style={[styles.dropdownSelector, styles.disabledSelector]}>
									<MaterialCommunityIcons name="lock-outline" size={22} color={COLORS.primary} />
									<Text style={styles.dropdownSelectorText}>
										{teams.find((t) => t.id.toString() === childTeamId)?.name || "Wpisz wiek dziecka powyżej"}
									</Text>
								</View>
								<Text style={styles.lockHint}>
									* Zespół przydzielany jest automatycznie na podstawie wieku. Zmiany grupy dokonuje wyłącznie Administrator.
								</Text>

								<View style={styles.multiChildHintBox}>
									<MaterialCommunityIcons name="information-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
									<View style={{ flex: 1 }}>
										<Text style={styles.multiChildHintTitle}>Masz więcej niż jedno dziecko w klubie?</Text>
										<Text style={styles.multiChildHintSub}>
											Wpisz powyżej dane pierwszego dziecka. Drugie i kolejne dziecko bez problemu dodasz w dowolnym momencie w zakładce <Text style={{ fontFamily: FONTS.bold }}>Profil</Text>!
										</Text>
									</View>
								</View>
							</View>
						)}

						{selectedRole === "fan" && (
							<View style={styles.roleSubSection}>
								<Card style={styles.fanNoticeCard}>
									<Card.Content style={{ flexDirection: "row", alignItems: "center" }}>
										<MaterialCommunityIcons name="bullhorn-outline" size={32} color={COLORS.primary} style={{ marginRight: 12 }} />
										<View style={{ flex: 1 }}>
											<Text style={styles.fanNoticeTitle}>Profil Kibica i Sympatyka</Text>
											<Text style={styles.fanNoticeSub}>
												Będziesz mieć natychmiastowy dostęp do aktualności klubowych, tabeli oraz terminarza meczów Seniorów!
											</Text>
										</View>
									</Card.Content>
								</Card>
							</View>
						)}

						<TouchableOpacity
							activeOpacity={0.85}
							onPress={() => setAcceptedPrivacy((prev) => !prev)}
							style={[styles.privacyCard, acceptedPrivacy && styles.privacyCardActive]}
						>
							<View style={styles.privacyHeader}>
								<MaterialCommunityIcons
									name="shield-check-outline"
									size={22}
									color={acceptedPrivacy ? COLORS.primary : COLORS.textLight}
								/>
								<Text style={[styles.privacyTitle, acceptedPrivacy && styles.privacyTitleActive]}>
									Wymagana akceptacja regulaminu
								</Text>
							</View>
							<View style={styles.privacyRow}>
								<Checkbox
									status={acceptedPrivacy ? "checked" : "unchecked"}
									onPress={() => setAcceptedPrivacy((prev) => !prev)}
									color={COLORS.primary}
									uncheckedColor={COLORS.textLight}
								/>
								<Text style={styles.privacyText}>
									Oświadczam, że akceptuję <Text style={styles.privacyLink}>Regulamin Klubu GKS Strzegowo</Text> oraz <Text style={styles.privacyLink}>Politykę Prywatności</Text> i wyrażam zgodę na przetwarzanie danych.
								</Text>
							</View>
						</TouchableOpacity>

						{error ? <Text style={styles.errorText}>{error}</Text> : null}

						<Button
							mode="contained"
							onPress={handleSaveProfile}
							loading={loading}
							disabled={loading}
							style={styles.submitBtn}
							labelStyle={styles.submitBtnLabel}
						>
							Zapisz i Przejdź do Aplikacji
						</Button>
					</Card.Content>
				</Card>
			</ScrollView>

			{/* Modal Wyboru Zespołu dla Zawodnika */}
			<Portal>
				<Dialog
					visible={teamModalVisible}
					onDismiss={() => setTeamModalVisible(false)}
					style={styles.dialogContainer}
				>
					<Dialog.Title style={styles.dialogTitle}>Wybierz swój zespół</Dialog.Title>
					<Dialog.Content style={{ paddingHorizontal: 16 }}>
						<ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
							{teams.map((t) => {
								const isSelected = selectedTeamId === t.id.toString();
								return (
									<TouchableOpacity
										key={t.id}
										style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
										onPress={() => {
											setSelectedTeamId(t.id.toString());
											setTeamModalVisible(false);
										}}
									>
										<MaterialIcons name="group" size={20} color={isSelected ? COLORS.primary : COLORS.textLight} />
										<Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
											{t.name}
										</Text>
										{isSelected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setTeamModalVisible(false)}>Zamknij</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Modal Wyboru Zespołu dla Dziecka */}
			<Portal>
				<Dialog
					visible={childTeamModalVisible}
					onDismiss={() => setChildTeamModalVisible(false)}
					style={styles.dialogContainer}
				>
					<Dialog.Title style={styles.dialogTitle}>Wybierz zespół dziecka</Dialog.Title>
					<Dialog.Content style={{ paddingHorizontal: 16 }}>
						<ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
							{teams.map((t) => {
								const isSelected = childTeamId === t.id.toString();
								return (
									<TouchableOpacity
										key={t.id}
										style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
										onPress={() => {
											setChildTeamId(t.id.toString());
											setChildTeamModalVisible(false);
										}}
									>
										<MaterialIcons name="group" size={20} color={isSelected ? COLORS.primary : COLORS.textLight} />
										<Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
											{t.name}
										</Text>
										{isSelected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setChildTeamModalVisible(false)}>Zamknij</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	backgroundImageStyle: {
		opacity: 0.045,
	},
	scrollContainer: {
		paddingHorizontal: 20,
		paddingTop: 50,
		paddingBottom: 40,
	},
	header: {
		alignItems: "center",
		marginBottom: 20,
	},
	logo: {
		width: 70,
		height: 70,
		resizeMode: "contain",
		marginBottom: 12,
	},
	title: {
		fontFamily: FONTS.extraBold,
		fontSize: 24,
		color: COLORS.primary,
		textAlign: "center",
	},
	subtitle: {
		fontFamily: FONTS.regular,
		fontSize: 13,
		color: COLORS.textLight,
		textAlign: "center",
		marginTop: 4,
		lineHeight: 18,
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 18,
		elevation: 4,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		paddingVertical: 8,
	},
	sectionTitle: {
		fontFamily: FONTS.bold,
		fontSize: 15,
		color: COLORS.textDark,
		marginTop: 12,
		marginBottom: 8,
	},
	fieldLabel: {
		fontFamily: FONTS.semiBold,
		fontSize: 13,
		color: COLORS.textDark,
		marginTop: 8,
		marginBottom: 4,
	},
	input: {
		marginBottom: 12,
		backgroundColor: COLORS.white,
	},
	roleSelectionRow: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 16,
	},
	roleCard: {
		flex: 1,
		backgroundColor: "#F8FAFC",
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 14,
		paddingVertical: 14,
		paddingHorizontal: 8,
		alignItems: "center",
	},
	roleCardActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primary,
		elevation: 3,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	roleCardTitle: {
		fontFamily: FONTS.bold,
		fontSize: 14,
		color: COLORS.textDark,
		marginTop: 6,
	},
	roleCardTitleActive: {
		color: COLORS.white,
	},
	roleCardSub: {
		fontFamily: FONTS.regular,
		fontSize: 11,
		color: COLORS.textLight,
		marginTop: 2,
		textAlign: "center",
	},
	roleCardSubActive: {
		color: "rgba(255,255,255,0.85)",
	},
	roleSubSection: {
		marginTop: 4,
	},
	dropdownSelector: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginTop: 4,
		marginBottom: 14,
	},
	dropdownSelectorText: {
		flex: 1,
		fontSize: 14,
		fontFamily: FONTS.semiBold,
		color: COLORS.textDark,
		marginLeft: 10,
	},
	disabledSelector: {
		backgroundColor: "#F1F5F9",
		borderColor: "#CBD5E1",
	},
	lockHint: {
		fontSize: 11,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		marginTop: -8,
		marginBottom: 12,
		fontStyle: "italic",
	},
	fanNoticeCard: {
		backgroundColor: COLORS.primaryLight,
		borderRadius: 14,
		marginVertical: 12,
		borderWidth: 1,
		borderColor: COLORS.primary,
	},
	fanNoticeTitle: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginBottom: 2,
	},
	fanNoticeSub: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		lineHeight: 16,
	},
	multiChildHintBox: {
		backgroundColor: "#F0F7FF",
		borderColor: "#BFDBFE",
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		flexDirection: "row",
		alignItems: "center",
		marginTop: 6,
		marginBottom: 10,
	},
	multiChildHintTitle: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.primaryDark,
		marginBottom: 2,
	},
	multiChildHintSub: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		lineHeight: 16,
	},
	privacyCard: {
		backgroundColor: "#F8FAFC",
		borderColor: COLORS.border,
		borderWidth: 1.5,
		borderRadius: 14,
		padding: 14,
		marginVertical: 14,
	},
	privacyCardActive: {
		backgroundColor: "#F0F7FF",
		borderColor: COLORS.primary,
	},
	privacyHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	privacyTitle: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.textLight,
		marginLeft: 8,
	},
	privacyTitleActive: {
		color: COLORS.primary,
	},
	privacyRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	privacyText: {
		flex: 1,
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		lineHeight: 17,
		marginLeft: 6,
	},
	privacyLink: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		textDecorationLine: "underline",
	},
	submitBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 12,
		paddingVertical: 6,
		marginTop: 16,
	},
	submitBtnLabel: {
		fontFamily: FONTS.bold,
		fontSize: 15,
		color: COLORS.white,
	},
	errorText: {
		fontFamily: FONTS.bold,
		color: COLORS.error,
		textAlign: "center",
		fontSize: 13,
		marginTop: 8,
	},
	dialogContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
	},
	dialogTitle: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		fontSize: 18,
	},
	dropdownOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 8,
		marginBottom: 4,
	},
	dropdownOptionActive: {
		backgroundColor: COLORS.primaryLight,
	},
	dropdownOptionText: {
		flex: 1,
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textDark,
		marginLeft: 10,
	},
	dropdownOptionTextActive: {
		fontFamily: FONTS.bold,
		color: COLORS.primary,
	},
});
