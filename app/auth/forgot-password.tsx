import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from "react-native";
import { TextInput, Button, Title, Text } from "react-native-paper";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const handleReset = async () => {
		if (!email.trim()) {
			Alert.alert("Błąd", "Wprowadź swój adres e-mail");
			return;
		}

		setLoading(true);
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
				redirectTo: "gksstrzegowo://reset-password",
			});
			if (error) throw error;
			setSubmitted(true);
		} catch (error: any) {
			console.error("Reset error:", error);
			Alert.alert("Błąd", error.message || "Nie udało się wysłać linku resetującego");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={styles.container}
		>
			<TouchableOpacity
				style={[styles.backButton, { top: insets.top + 10 }]}
				onPress={() => router.back()}
			>
				<MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
			</TouchableOpacity>

			<ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]}>
				<Title style={styles.title}>Resetuj hasło</Title>
				<Text style={styles.subtitle}>
					{submitted 
						? "Wysłaliśmy link do resetowania hasła na Twój e-mail. Sprawdź swoją skrzynkę."
						: "Wprowadź swój adres e-mail, a wyślemy Ci link do ustawienia nowego hasła."
					}
				</Text>

				{!submitted && (
					<View style={styles.form}>
						<TextInput
							label="Adres e-mail"
							value={email}
							onChangeText={setEmail}
							mode="outlined"
							keyboardType="email-address"
							autoCapitalize="none"
							textColor={COLORS.textDark}
							activeOutlineColor={COLORS.primary}
							outlineColor={COLORS.border}
							style={styles.input}
						/>

						<Button
							mode="contained"
							onPress={handleReset}
							loading={loading}
							disabled={loading}
							buttonColor={COLORS.primary}
							textColor={COLORS.white}
							style={styles.button}
							labelStyle={styles.buttonLabel}
						>
							Wyślij link
						</Button>
					</View>
				)}

				{submitted && (
					<Button
						mode="outlined"
						onPress={() => router.replace("/auth/login")}
						style={styles.backToLoginButton}
						textColor={COLORS.primary}
						labelStyle={styles.buttonLabel}
					>
						Powrót do logowania
					</Button>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	scrollContent: {
		padding: 24,
		alignItems: "center",
	},
	backButton: {
		position: "absolute",
		left: 16,
		zIndex: 10,
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 24,
		fontFamily: FONTS.extraBold,
		color: COLORS.primary,
		marginTop: 20,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		textAlign: "center",
		marginTop: 10,
		lineHeight: 20,
		maxWidth: 300,
	},
	form: {
		width: "100%",
		marginTop: 30,
	},
	input: {
		backgroundColor: COLORS.white,
		marginBottom: 20,
	},
	button: {
		borderRadius: 12,
		paddingVertical: 4,
	},
	buttonLabel: {
		fontFamily: FONTS.bold,
		fontSize: 15,
	},
	backToLoginButton: {
		marginTop: 30,
		width: "100%",
		borderRadius: 12,
		borderColor: COLORS.primary,
	},
});
