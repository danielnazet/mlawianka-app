import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from "react-native";
import { TextInput, Button, Title, Text, RadioButton } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";

interface Team {
	id: number;
	name: string;
}

export default function RegisterScreen() {
	const [role, setRole] = useState<"player" | "parent">("player");
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		teamId: "",
		childFirstName: "",
		childLastName: "",
	});

	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchTeams = async () => {
			try {
				const { data, error: err } = await supabase
					.from("teams")
					.select("id, name")
					.order("id", { ascending: true });
				
				if (err) throw err;
				if (data && data.length > 0) {
					setTeams(data);
				} else {
					setTeams([
						{ id: 1, name: "Główny Zespół (Seniorzy)" },
						{ id: 2, name: "Juniorzy U-8" },
						{ id: 3, name: "Juniorzy U-10" },
						{ id: 4, name: "Juniorzy U-12" },
						{ id: 5, name: "Juniorzy U-14" },
					]);
				}
			} catch (err) {
				console.error("Error fetching teams:", err);
				setTeams([
					{ id: 1, name: "Główny Zespół (Seniorzy)" },
					{ id: 2, name: "Juniorzy U-8" },
					{ id: 3, name: "Juniorzy U-10" },
					{ id: 4, name: "Juniorzy U-12" },
					{ id: 5, name: "Juniorzy U-14" },
				]);
			}
		};

		fetchTeams();
	}, []);

	const handleRegister = async () => {
		const { firstName, lastName, email, password, teamId, childFirstName, childLastName } = formData;
		const trimmedEmail = email ? email.trim() : "";

		// Basic validation
		if (!firstName || !lastName || !trimmedEmail || !password) {
			setError("Proszę wypełnić wszystkie dane osobowe");
			return;
		}

		if (role === "player" && !teamId) {
			setError("Proszę wybrać zespół");
			return;
		}

		if (role === "parent" && (!childFirstName || !childLastName)) {
			setError("Proszę podać imię i nazwisko dziecka");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Register in Auth
			const signUpOptions: any = {
				email: trimmedEmail,
				password,
				options: {
					data: {
						first_name: firstName,
						last_name: lastName,
						role: role,
					},
				},
			};

			if (role === "player") {
				signUpOptions.options.data.team_id = parseInt(teamId);
			} else {
				signUpOptions.options.data.child_first_name = childFirstName;
				signUpOptions.options.data.child_last_name = childLastName;
			}

			const { data: authData, error: authError } = await supabase.auth.signUp(signUpOptions);

			if (authError) throw authError;

			// Add profile to profiles table
			if (authData?.user) {
				const profileData: any = {
					id: authData.user.id,
					first_name: firstName,
					last_name: lastName,
					email: trimmedEmail,
					role: role,
				};

				if (role === "player") {
					profileData.team_id = parseInt(teamId);
				} else {
					profileData.child_first_name = childFirstName;
					profileData.child_last_name = childLastName;
				}

				const { error: profileError } = await supabase.from("profiles").insert([profileData]);

				if (profileError) {
					console.warn("Błąd zapisu profilu:", profileError.message);
				}
			}

			router.push("/auth/login");
		} catch (err: any) {
			setError(err.message || "Błąd podczas rejestracji");
			console.error("Błąd rejestracji:", err);
		} finally {
			setLoading(false);
		}
	};

	const updateFormData = (key: string, value: string) => {
		setFormData(prev => ({ ...prev, [key]: value }));
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.keyboardView}
		>
			<ImageBackground
				source={require("../assets/logo_gks.png")}
				style={styles.backgroundImage}
				imageStyle={styles.backgroundImageStyle}
			>
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<View style={styles.container}>
						<View style={styles.card}>
							<Title style={styles.cardTitle}>Utwórz konto w GKS</Title>
							<Text style={styles.cardSubtitle}>Dołącz do społeczności GKS Strzegowo</Text>

							{/* Wybór roli */}
							<Text style={styles.label}>Kim jesteś?</Text>
							<RadioButton.Group
								onValueChange={(value) => setRole(value as any)}
								value={role}
							>
								<View style={styles.roleSelection}>
									<View style={styles.radioItem}>
										<RadioButton value="player" color={COLORS.primary} />
										<Text onPress={() => setRole("player")} style={styles.radioLabel}>
											Zawodnik
										</Text>
									</View>
									<View style={styles.radioItem}>
										<RadioButton value="parent" color={COLORS.primary} />
										<Text onPress={() => setRole("parent")} style={styles.radioLabel}>
											Rodzic
										</Text>
									</View>
								</View>
							</RadioButton.Group>

							<TextInput
								label="Imię"
								value={formData.firstName}
								onChangeText={(value) => updateFormData("firstName", value)}
								mode="outlined"
								style={styles.input}
								activeOutlineColor={COLORS.primary}
								outlineColor={COLORS.border}
								textColor={COLORS.textDark}
							/>

							<TextInput
								label="Nazwisko"
								value={formData.lastName}
								onChangeText={(value) => updateFormData("lastName", value)}
								mode="outlined"
								style={styles.input}
								activeOutlineColor={COLORS.primary}
								outlineColor={COLORS.border}
								textColor={COLORS.textDark}
							/>

							<TextInput
								label="Adres E-mail"
								value={formData.email}
								onChangeText={(value) => updateFormData("email", value)}
								mode="outlined"
								style={styles.input}
								keyboardType="email-address"
								autoCapitalize="none"
								activeOutlineColor={COLORS.primary}
								outlineColor={COLORS.border}
								textColor={COLORS.textDark}
							/>

							<TextInput
								label="Hasło"
								value={formData.password}
								onChangeText={(value) => updateFormData("password", value)}
								secureTextEntry
								mode="outlined"
								style={styles.input}
								activeOutlineColor={COLORS.primary}
								outlineColor={COLORS.border}
								textColor={COLORS.textDark}
							/>

							{/* Jeśli Zawodnik: Wybór Zespołu */}
							{role === "player" && (
								<View>
									<Text style={styles.label}>Wybierz zespół / grupę</Text>
									<RadioButton.Group
										onValueChange={(value) => updateFormData("teamId", value)}
										value={formData.teamId}
									>
										{teams.map((team) => (
											<View key={team.id} style={styles.radioItem}>
												<RadioButton value={team.id.toString()} color={COLORS.primary} />
												<Text
													onPress={() => updateFormData("teamId", team.id.toString())}
													style={styles.radioLabel}
												>
													{team.name}
												</Text>
											</View>
										))}
									</RadioButton.Group>
								</View>
							)}

							{/* Jeśli Rodzic: Dane dziecka */}
							{role === "parent" && (
								<View>
									<Text style={styles.label}>Dane Twojego dziecka</Text>
									<TextInput
										label="Imię dziecka"
										value={formData.childFirstName}
										onChangeText={(value) => updateFormData("childFirstName", value)}
										mode="outlined"
										style={styles.input}
										activeOutlineColor={COLORS.primary}
										outlineColor={COLORS.border}
										textColor={COLORS.textDark}
									/>
									<TextInput
										label="Nazwisko dziecka"
										value={formData.childLastName}
										onChangeText={(value) => updateFormData("childLastName", value)}
										mode="outlined"
										style={styles.input}
										activeOutlineColor={COLORS.primary}
										outlineColor={COLORS.border}
										textColor={COLORS.textDark}
									/>
								</View>
							)}

							{error ? <Text style={styles.error}>{error}</Text> : null}

							<Button
								mode="contained"
								onPress={handleRegister}
								style={styles.button}
								labelStyle={styles.buttonLabel}
								loading={loading}
								disabled={loading}
							>
								Zarejestruj się
							</Button>

							<Button
								mode="text"
								onPress={() => router.push("/auth/login")}
								style={styles.textButton}
								textColor={COLORS.primary}
								disabled={loading}
							>
								Masz już konto? Zaloguj się
							</Button>
						</View>
					</View>
				</ScrollView>
			</ImageBackground>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	keyboardView: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	backgroundImage: {
		flex: 1,
		width: "100%",
		height: "100%",
	},
	backgroundImageStyle: {
		opacity: 0.08,
		resizeMode: "cover",
		width: "100%",
		height: "100%",
		position: "absolute",
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: "center",
	},
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
	},
	cardTitle: {
		fontSize: 22,
		fontWeight: "bold",
		color: COLORS.primary,
		textAlign: "center",
	},
	cardSubtitle: {
		fontSize: 14,
		color: COLORS.textLight,
		textAlign: "center",
		marginBottom: 20,
		marginTop: 4,
	},
	input: {
		marginBottom: 12,
		backgroundColor: COLORS.white,
	},
	label: {
		fontSize: 16,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginBottom: 8,
		marginTop: 12,
	},
	roleSelection: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 12,
	},
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 4,
	},
	radioLabel: {
		fontSize: 15,
		color: COLORS.textDark,
		marginLeft: 8,
	},
	button: {
		marginTop: 20,
		backgroundColor: COLORS.primary,
		paddingVertical: 4,
		borderRadius: 8,
	},
	buttonLabel: {
		fontSize: 16,
		fontWeight: "bold",
		color: COLORS.white,
	},
	textButton: {
		marginTop: 12,
	},
	error: {
		color: COLORS.error,
		marginTop: 12,
		textAlign: "center",
		fontSize: 14,
	},
});
