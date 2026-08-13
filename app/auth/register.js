import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Title, Text, RadioButton } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

// Stałe definiujące dostępne grupy treningowe
const TRAINING_GROUPS = [
	{ label: "Group A (U-8)", value: "group_a" },
	{ label: "Group B (U-10)", value: "group_b" },
	{ label: "Group C (U-12)", value: "group_c" },
	{ label: "Group D (U-14)", value: "group_d" },
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

	// Stany dla loadera i komunikatów błów
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
		<ScrollView contentContainerStyle={styles.scrollContainer}>
			<View style={styles.container}>
				{/* Logo i nagłówek */}
				<View style={styles.logoContainer}>
					<Text style={styles.logoText}>MLAWIANKA</Text>
				</View>

				<Title style={styles.title}>Utwórz konto</Title>

				{/* Formularz rejestracji */}
				<TextInput
					label="Imię"
					value={formData.firstName}
					onChangeText={(value) => updateFormData("firstName", value)}
					mode="outlined"
					style={styles.input}
				/>

				<TextInput
					label="Nazwisko"
					value={formData.lastName}
					onChangeText={(value) => updateFormData("lastName", value)}
					mode="outlined"
					
					style={styles.input}
				/>

				<TextInput
					label="Email"
					value={formData.email}
					onChangeText={(value) => updateFormData("email", value)}
					
					mode="outlined"
					style={styles.input}
					keyboardType="email-address"
					autoCapitalize="none"
				/>

				<TextInput
					label="Hasło"
					value={formData.password}
					onChangeText={(value) => updateFormData("password", value)}
					secureTextEntry
					mode="outlined"
					style={styles.input}
				/>

				{/* Sekcja wyboru grupy treningowej */}
				<Text style={styles.label}>Wybierz grupę treningową</Text>
				<RadioButton.Group
					onValueChange={(value) => updateFormData("trainingGroup", value)}
					value={formData.trainingGroup}
				>
					{TRAINING_GROUPS.map((group) => (
						<View key={group.value} style={styles.radioItem}>
							<RadioButton value={group.value} />
							<Text onPress={() => updateFormData("trainingGroup", group.value)}>
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
					loading={loading}
					disabled={loading}
				>
					Zarejestruj się
				</Button>

				<Button
					mode="text"
					onPress={() => router.push("/auth/login")}
					style={styles.button}
					disabled={loading}
				>
					Masz już konto? Zaloguj się
				</Button>
			</View>
		</ScrollView>
	);
}

// Style komponentu
const styles = StyleSheet.create({
	scrollContainer: {
		flexGrow: 1,
	},
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
		backgroundColor: "#fff",
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: 20,
	},
	logoText: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	title: {
		fontSize: 24,
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		marginBottom: 10,
	},
	label: {
		fontSize: 16,
		marginBottom: 8,
		marginTop: 8,
	},
	radioItem: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 4,
	},
	button: {
		marginTop: 10,
	},
	error: {
		color: "red",
		marginBottom: 10,
		textAlign: "center",
	},
});
