import React, { useState } from "react";
import { View, StyleSheet, ImageBackground, Image } from "react-native";
import { TextInput, Button, Title, Text } from "react-native-paper";
import { router } from "expo-router";

// Dane testowe do lokalnego logowania
const TEST_CREDENTIALS = {
	email: "admin@mlawianka.pl",
	password: "admin123",
};

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleLogin = async () => {
		if (!email || !password) {
			setError("Please fill in all fields");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Proste lokalne sprawdzenie poświadczeń
			if (
				email === TEST_CREDENTIALS.email &&
				password === TEST_CREDENTIALS.password
			) {
				router.replace("/news");
			} else {
				throw new Error("Invalid credentials");
			}
		} catch (error) {
			setError("Invalid email or password");
			console.error("Login error:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ImageBackground
			source={require("../assets/logo.png")}
			style={styles.backgroundImage}
			resizeMode="contain"
		>
			<View style={styles.overlay}>
				<View style={styles.container}>
					<View style={styles.logoContainer}>
						<Image
							source={require("../assets/logo.png")}
							style={styles.logo}
							resizeMode="contain"
						/>
					</View>

					<Title style={styles.title}>Mlawianka Mlawa</Title>

					<View style={styles.form}>
						<TextInput
							label="Email"
							value={email}
							onChangeText={setEmail}
							mode="outlined"
							style={styles.input}
							keyboardType="email-address"
							autoCapitalize="none"
							theme={{ colors: { primary: "#1e3a8a" } }}
						/>

						<TextInput
							label="Password"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							mode="outlined"
							style={styles.input}
							theme={{ colors: { primary: "#1e3a8a" } }}
						/>

						{error ? (
							<Text style={styles.error}>{error}</Text>
						) : null}

						<Button
							mode="contained"
							onPress={handleLogin}
							style={styles.button}
							loading={loading}
							disabled={loading}
						>
							Login
						</Button>

						<Button
							mode="text"
							onPress={() => router.push("/auth/register")}
							style={styles.button}
							disabled={loading}
						>
							Don't have an account? Register
						</Button>
					</View>
				</View>
			</View>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	backgroundImage: {
		flex: 1,
		width: "100%",
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(255, 255, 255, 0.95)", // Biały z przezroczystością
	},
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: 20,
	},
	logo: {
		width: 150,
		height: 150,
		opacity: 0.9,
	},
	title: {
		fontSize: 24,
		marginBottom: 20,
		textAlign: "center",
		color: "#1e3a8a",
	},
	form: {
		width: "100%",
		backgroundColor: "rgba(255, 255, 255, 0.8)",
		padding: 20,
		borderRadius: 10,
	},
	input: {
		marginBottom: 10,
		backgroundColor: "white",
	},
	button: {
		marginTop: 10,
		backgroundColor: "#1e3a8a",
	},
	error: {
		color: "red",
		marginBottom: 10,
		textAlign: "center",
	},
});
