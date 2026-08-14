import React, { useState } from "react";
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Dimensions } from "react-native";
import { TextInput, Button, Title, Text } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleLogin = async () => {
		const trimmedEmail = email ? email.trim() : "";
		if (!trimmedEmail || !password) {
			setError("Proszę wypełnić wszystkie pola");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const { error: authError } = await supabase.auth.signInWithPassword({
				email: trimmedEmail,
				password,
			});

			if (authError) throw authError;

			router.replace("/news");
		} catch (err: any) {
			setError(err.message || "Nieprawidłowy email lub hasło");
			console.error("Login error:", err);
		} finally {
			setLoading(false);
		}
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
						{/* Górna część - logo klubowe */}
						<View style={styles.header}>
							<Image
								source={require("../assets/logo_gks.png")}
								style={styles.logo}
								resizeMode="contain"
							/>
							<Title style={styles.appTitle}>GKS Strzegowo</Title>
							<Text style={styles.appSubtitle}>Oficjalna Aplikacja Klubowa</Text>
						</View>

						{/* Karta formularza logowania */}
						<View style={styles.card}>
							<Title style={styles.cardTitle}>Zaloguj się</Title>

							<TextInput
								label="Adres E-mail"
								value={email}
								onChangeText={setEmail}
								mode="outlined"
								style={styles.input}
								keyboardType="email-address"
								autoCapitalize="none"
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>

							<TextInput
								label="Hasło"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								mode="outlined"
								style={styles.input}
								outlineColor={COLORS.border}
								activeOutlineColor={COLORS.primary}
								textColor={COLORS.textDark}
							/>

							{error ? (
								<Text style={styles.error}>{error}</Text>
							) : null}

							<Button
								mode="contained"
								onPress={handleLogin}
								style={styles.button}
								labelStyle={styles.buttonLabel}
								loading={loading}
								disabled={loading}
							>
								Zaloguj się
							</Button>

							<Button
								mode="text"
								onPress={() => router.push("/auth/register")}
								style={styles.textButton}
								textColor={COLORS.primary}
								disabled={loading}
							>
								Nie masz konta? Zarejestruj się
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
		padding: 24,
		justifyContent: "center",
	},
	header: {
		alignItems: "center",
		marginBottom: 32,
	},
	logo: {
		width: 120,
		height: 120,
	},
	appTitle: {
		fontSize: 28,
		fontWeight: "bold",
		color: COLORS.primary,
		marginTop: 12,
		textAlign: "center",
	},
	appSubtitle: {
		fontSize: 14,
		color: COLORS.textLight,
		marginTop: 4,
		textAlign: "center",
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
		fontSize: 20,
		fontWeight: "bold",
		color: COLORS.textDark,
		marginBottom: 16,
	},
	input: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
	},
	button: {
		marginTop: 8,
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
		marginBottom: 12,
		textAlign: "center",
		fontSize: 14,
	},
});
