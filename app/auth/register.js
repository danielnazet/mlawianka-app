import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Title, Text, RadioButton } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";

// Stałe definiujące dostępne grupy treningowe
const TRAINING_GROUPS = [
	{ label: "Grupa A (U-8)", value: "group_a" },
	{ label: "Grupa B (U-10)", value: "group_b" },
	{ label: "Grupa C (U-12)", value: "group_c" },
	{ label: "Grupa D (U-14)", value: "group_d" },
];

export default function RegisterScreen() {
	// Stan formularza przechowujący wszystkie pola
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		trainingGroup: "",
	});

	// Stany dla loadera i komunikatów błędów
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// Funkcja obsługująca rejestrację użytkownika
	const handleRegister = async () => {
		const { firstName, lastName, email, password, trainingGroup } = formData;
		const trimmedEmail = email ? email.trim() : "";

		// Sprawdzenie czy wszystkie pola są wypełnione
		if (!firstName || !lastName || !trimmedEmail || !password || !trainingGroup) {
			setError("Proszę wypełnić wszystkie pola");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Rejestracja w Supabase Auth
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					data: {
						first_name: firstName,
						last_name: lastName,
						training_group: trainingGroup,
						role: "user",
					},
				},
			});

			if (authError) throw authError;

			// Dodanie profilu do tabeli profiles w bazie danych
			if (authData?.user) {
				const { error: profileError } = await supabase.from("profiles").insert([
					{
						id: authData.user.id,
						first_name: firstName,
						last_name: lastName,
						email: email,
						role: "user",
						training_group: trainingGroup,
					},
				]);

				if (profileError) {
					console.warn("Błąd zapisu profilu:", profileError.message);
				}
			}

			// Przekierowanie do strony logowania
			router.push("/auth/login");
			
		} catch (error) {
			setError(error.message || "Błąd podczas rejestracji");
			console.error("Błąd rejestracji:", error);
		} finally {
			setLoading(false);
		}
	};

	// Funkcja aktualizująca pojedyncze pole w formularzu
	const updateFormData = (key, value) => {
		setFormData(prev => ({ ...prev, [key]: value }));
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.keyboardView}
		>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.container}>
					{/* Karta rejestracji */}
					<View style={styles.card}>
						<Title style={styles.cardTitle}>Utwórz konto zawodnika</Title>
						<Text style={styles.cardSubtitle}>Wypełnij poniższe dane, aby dołączyć</Text>

						<TextInput
							label="Imię"
							value={formData.firstName}
							onChangeText={(value) => updateFormData("firstName", value)}
							mode="outlined"
							style={styles.input}
							activeOutlineColor={COLORS.primary}
							outlineColor={COLORS.border}
						/>

						<TextInput
							label="Nazwisko"
							value={formData.lastName}
							onChangeText={(value) => updateFormData("lastName", value)}
							mode="outlined"
							style={styles.input}
							activeOutlineColor={COLORS.primary}
							outlineColor={COLORS.border}
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
						/>

						{/* Sekcja wyboru grupy treningowej */}
						<Text style={styles.label}>Wybierz grupę treningową</Text>
						<RadioButton.Group
							onValueChange={(value) => updateFormData("trainingGroup", value)}
							value={formData.trainingGroup}
						>
							{TRAINING_GROUPS.map((group) => (
								<View key={group.value} style={styles.radioItem}>
									<RadioButton 
										value={group.value} 
										color={COLORS.primary}
										uncheckedColor={COLORS.border}
									/>
									<Text 
										onPress={() => updateFormData("trainingGroup", group.value)}
										style={styles.radioLabel}
									>
										{group.label}
									</Text>
								</View>
							))}
						</RadioButton.Group>

						{/* Wyświetlanie błędów */}
						{error ? <Text style={styles.error}>{error}</Text> : null}

						{/* Przyciski akcji */}
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
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	keyboardView: {
		flex: 1,
		backgroundColor: COLORS.background,
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
