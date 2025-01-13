import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Title, Text, RadioButton } from "react-native-paper";
import { router } from "expo-router";

// Stałe definiujące dostępne grupy treningowe
const TRAINING_GROUPS = [
	{ label: "Group A (U-8)", value: "group_a" },
	{ label: "Group B (U-10)", value: "group_b" },
	{ label: "Group C (U-12)", value: "group_c" },
	{ label: "Group D (U-14)", value: "group_d" },
];

// Testowa baza użytkowników (symulacja lokalnej bazy danych)
const TEST_USERS = [];

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

		// Sprawdzenie czy wszystkie pola są wypełnione
		if (!firstName || !lastName || !email || !password || !trainingGroup) {
			setError("Proszę wypełnić wszystkie pola");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Symulacja opóźnienia serwera
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Sprawdzenie czy email jest już zajęty
			if (TEST_USERS.some(user => user.email === email)) {
				throw new Error("Ten email jest już zajęty");
			}

			// Dodanie nowego użytkownika do testowej bazy
			TEST_USERS.push({
				id: Date.now().toString(),
				...formData
			});

			// Przekierowanie do strony logowania
			router.push("/auth/login");
			
		} catch (error) {
			setError(error.message);
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
