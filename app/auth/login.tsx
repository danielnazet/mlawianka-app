import React, { useState } from "react";

import {
	Image,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";

import {
	Button,
	Text,
	TextInput,
} from "react-native-paper";

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

WebBrowser.maybeCompleteAuthSession();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateAuthError(message: string) {
	const normalizedMessage = message.toLowerCase();

	if (
		normalizedMessage.includes(
			"invalid login credentials",
		)
	) {
		return "Nieprawidłowy adres e-mail lub hasło.";
	}

	if (
		normalizedMessage.includes(
			"email not confirmed",
		)
	) {
		return "Adres e-mail nie został jeszcze potwierdzony.";
	}

	if (
		normalizedMessage.includes("too many requests") ||
		normalizedMessage.includes("rate limit")
	) {
		return "Wykonano zbyt wiele prób. Spróbuj ponownie za chwilę.";
	}

	if (
		normalizedMessage.includes("network") ||
		normalizedMessage.includes("fetch")
	) {
		return "Sprawdź połączenie z internetem i spróbuj ponownie.";
	}

	return "Nie udało się zalogować. Spróbuj ponownie.";
}

export default function LoginScreen() {
	const insets = useSafeAreaInsets();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [showPassword, setShowPassword] =
		useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleBack = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/news");
	};

	const handleEmailChange = (value: string) => {
		setEmail(value);

		if (error) {
			setError("");
		}
	};

	const handlePasswordChange = (value: string) => {
		setPassword(value);

		if (error) {
			setError("");
		}
	};

	const handleLogin = async () => {
		if (loading) {
			return;
		}

		const trimmedEmail = email
			.trim()
			.toLowerCase();

		if (!trimmedEmail || !password) {
			setError("Wypełnij adres e-mail i hasło.");
			return;
		}

		if (!EMAIL_REGEX.test(trimmedEmail)) {
			setError("Podaj prawidłowy adres e-mail.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const { error: authError } =
				await supabase.auth.signInWithPassword({
					email: trimmedEmail,
					password,
				});

			if (authError) {
				throw authError;
			}

			if (router.canDismiss()) {
				router.dismissAll();
			}
			router.navigate("/news");
		} catch (caughtError) {
			const message =
				caughtError instanceof Error
					? caughtError.message
					: "";

			setError(translateAuthError(message));

			console.error("Login error:", caughtError);
		} finally {
			setLoading(false);
		}
	};

	const extractTokensFromUrl = (url: string) => {
		let accessToken = "";
		let refreshToken = "";

		const hashPart = url.includes("#") ? url.split("#")[1] : "";
		const queryPart = url.includes("?") ? url.split("?")[1] : "";

		const parseStr = (str: string) => {
			const pairs = str.split("&");
			for (const pair of pairs) {
				const [key, val] = pair.split("=");
				if (key === "access_token") accessToken = decodeURIComponent(val || "");
				if (key === "refresh_token") refreshToken = decodeURIComponent(val || "");
			}
		};

		if (hashPart) parseStr(hashPart);
		if (!accessToken && queryPart) parseStr(queryPart);

		return { accessToken, refreshToken };
	};

	const handleGoogleSignIn = async () => {
		if (loading) return;
		setLoading(true);
		setError("");

		try {
			const redirectUrl = Platform.OS === "web"
				? Linking.createURL("auth/callback")
				: "gksstrzegowo://auth/callback";
			console.log("[Google OAuth] Generated redirect URL:", redirectUrl);

			const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: redirectUrl,
					skipBrowserRedirect: true,
				},
			});

			if (oauthError) throw oauthError;

			if (data?.url) {
				console.log("[Google OAuth] Opening WebBrowser URL:", data.url);
				const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
				console.log("[Google OAuth] WebBrowser result type:", result.type);

				if (result.type === "success" && result.url) {
					console.log("[Google OAuth] Returned URL:", result.url);
					const { accessToken, refreshToken } = extractTokensFromUrl(result.url);

					if (accessToken && refreshToken) {
						console.log("[Google OAuth] Setting session with tokens...");
						const { error: sessionError } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});
						if (sessionError) throw sessionError;
						console.log("[Google OAuth] Session set successfully!");
						if (router.canDismiss()) {
							router.dismissAll();
						}
						router.navigate("/news");
					} else {
						console.warn("[Google OAuth] Could not find tokens in returned URL:", result.url);
					}
				}
			}
		} catch (err: any) {
			console.error("Google login error:", err);
			setError(err?.message || "Nie udało się zalogować przez Google.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={
				Platform.OS === "ios"
					? "padding"
					: undefined
			}
			style={styles.keyboardView}
		>
			<View style={styles.screen}>
				{/* Przycisk powrotu - zamocowany na stałe w Safe Area */}
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Wróć"
					onPress={handleBack}
					hitSlop={8}
					style={[
						styles.backButton,
						{
							top: insets.top + 8,
						},
					]}
				>
					<MaterialIcons
						name="arrow-back"
						size={23}
						color={COLORS.white}
					/>
				</Pressable>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode={
						Platform.OS === "ios"
							? "interactive"
							: "on-drag"
					}
				>
					{/* Górna sekcja (LinearGradient) przeniesiona wewnątrz ScrollView dla pełnej responsywności */}
					<LinearGradient
						colors={[
							COLORS.primaryDark,
							COLORS.primary,
						]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={[
							styles.hero,
							{
								paddingTop: insets.top + 32,
							},
						]}
					>
						<View style={styles.logoContainer}>
							<Image
								source={require("../assets/logo_gks.png")}
								style={styles.logo}
							/>
						</View>

						<Text style={styles.clubName}>
							GKS Strzegowo
						</Text>

						<Text style={styles.clubSubtitle}>
							OFICJALNA APLIKACJA KLUBOWA
						</Text>
					</LinearGradient>

					{/* Karta logowania */}
					<View style={styles.loginCard}>
						<Text style={styles.cardTitle}>
							Witaj ponownie
						</Text>

						<Text style={styles.cardDescription}>
							Zaloguj się, aby sprawdzić wiadomości,
							treningi i informacje swojej drużyny.
						</Text>

						<TextInput
							label="Adres e-mail"
							value={email}
							onChangeText={handleEmailChange}
							mode="outlined"
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="email"
							textContentType="emailAddress"
							returnKeyType="next"
							editable={!loading}
							left={
								<TextInput.Icon
									icon="email-outline"
									color={COLORS.textLight}
								/>
							}
							outlineColor={COLORS.border}
							activeOutlineColor={COLORS.primary}
							cursorColor={COLORS.primary}
							selectionColor={COLORS.primaryLight}
							textColor={COLORS.textDark}
							outlineStyle={styles.inputOutline}
							contentStyle={styles.inputContent}
							style={styles.input}
						/>

						<TextInput
							label="Hasło"
							value={password}
							onChangeText={handlePasswordChange}
							mode="outlined"
							secureTextEntry={!showPassword}
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="current-password"
							textContentType="password"
							returnKeyType="done"
							onSubmitEditing={handleLogin}
							editable={!loading}
							left={
								<TextInput.Icon
									icon="lock-outline"
									color={COLORS.textLight}
								/>
							}
							right={
								<TextInput.Icon
									icon={
										showPassword
											? "eye-off-outline"
											: "eye-outline"
									}
									color={COLORS.textLight}
									forceTextInputFocus={false}
									onPress={() =>
										setShowPassword(
											(current) => !current,
										)
									}
								/>
							}
							outlineColor={COLORS.border}
							activeOutlineColor={COLORS.primary}
							cursorColor={COLORS.primary}
							selectionColor={COLORS.primaryLight}
							textColor={COLORS.textDark}
							outlineStyle={styles.inputOutline}
							contentStyle={styles.inputContent}
							style={styles.input}
						/>

						<View style={styles.forgotPasswordRow}>
							<Button
								mode="text"
								compact
								disabled={loading}
								onPress={() =>
									router.push(
										"/auth/forgot-password",
									)
								}
								textColor={COLORS.primary}
								labelStyle={
									styles.forgotPasswordLabel
								}
							>
								Nie pamiętam hasła
							</Button>
						</View>

						{error ? (
							<View
								accessibilityRole="alert"
								style={styles.errorBox}
							>
								<MaterialIcons
									name="error-outline"
									size={20}
									color={COLORS.error}
								/>

								<Text style={styles.errorText}>
									{error}
								</Text>
							</View>
						) : null}

						<Button
							mode="contained"
							icon="login"
							onPress={handleLogin}
							loading={loading}
							disabled={loading}
							buttonColor={COLORS.primary}
							textColor={COLORS.white}
							contentStyle={styles.loginButtonContent}
							style={styles.loginButton}
							labelStyle={styles.loginButtonLabel}
						>
							{loading
								? "Logowanie…"
								: "Zaloguj się"}
						</Button>

						<View style={styles.separator}>
							<View style={styles.separatorLine} />

							<Text style={styles.separatorText}>
								lub zaloguj przez
							</Text>

							<View style={styles.separatorLine} />
						</View>

						<Button
							mode="outlined"
							icon={({ size }) => <MaterialCommunityIcons name="google" size={size} color="#EA4335" />}
							onPress={handleGoogleSignIn}
							disabled={loading}
							textColor={COLORS.textDark}
							contentStyle={styles.googleButtonContent}
							style={styles.googleButton}
							labelStyle={styles.googleButtonLabel}
						>
							Zaloguj się przez Google
						</Button>

						<View style={styles.separator}>
							<View style={styles.separatorLine} />

							<Text style={styles.separatorText}>
								nie masz konta?
							</Text>

							<View style={styles.separatorLine} />
						</View>

						<Button
							mode="outlined"
							icon="account-plus-outline"
							onPress={() =>
								router.push("/auth/register")
							}
							disabled={loading}
							textColor={COLORS.primary}
							contentStyle={
								styles.registerButtonContent
							}
							style={styles.registerButton}
							labelStyle={styles.registerButtonLabel}
						>
							Utwórz nowe konto
						</Button>
					</View>

					<Button
						mode="text"
						icon="arrow-left"
						onPress={() =>
							router.replace("/news")
						}
						disabled={loading}
						textColor={COLORS.textLight}
						style={styles.homeButton}
						labelStyle={styles.homeButtonLabel}
					>
						Kontynuuj bez logowania
					</Button>

					<Text style={styles.footerText}>
						Logując się, uzyskujesz dostęp do
						informacji przeznaczonych dla członków
						klubu.
					</Text>
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	keyboardView: {
		flex: 1,
		backgroundColor: COLORS.background,
	},

	screen: {
		flex: 1,
		backgroundColor: COLORS.background,
	},

	hero: {
		alignItems: "center",
		paddingBottom: 48,
		paddingHorizontal: 24,
		overflow: "hidden",
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

		backgroundColor: "rgba(255,255,255,0.14)",

		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.24)",
	},

	logoContainer: {
		width: 72,
		height: 72,

		borderRadius: 36,

		alignItems: "center",
		justifyContent: "center",

		backgroundColor: COLORS.white,

		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.4)",

		shadowColor: "#0F172A",
		shadowOffset: {
			width: 0,
			height: 3,
		},
		shadowOpacity: 0.18,
		shadowRadius: 6,

		elevation: 5,
	},

	logo: {
		width: 54,
		height: 54,
		resizeMode: "contain",
	},

	clubName: {
		marginTop: 10,
		color: COLORS.white,
		fontFamily: FONTS.extraBold,
		fontSize: 21,
		letterSpacing: 0.2,
	},

	clubSubtitle: {
		marginTop: 4,
		color: "rgba(255,255,255,0.75)",
		fontFamily: FONTS.bold,
		fontSize: 9,
		letterSpacing: 1.5,
	},

	scrollView: {
		flex: 1,
	},

	scrollContent: {
		flexGrow: 1,
		paddingBottom: 32,
	},

	loginCard: {
		marginTop: -24,
		marginHorizontal: 16,
		padding: 22,
		borderRadius: 22,
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: "#0F172A",
		shadowOffset: {
			width: 0,
			height: 6,
		},
		shadowOpacity: 0.1,
		shadowRadius: 16,
		elevation: 5,
	},

	cardTitle: {
		color: COLORS.textDark,
		fontFamily: FONTS.extraBold,
		fontSize: 22,
	},

	cardDescription: {
		marginTop: 6,
		marginBottom: 20,
		color: COLORS.textLight,
		fontFamily: FONTS.regular,
		fontSize: 13,
		lineHeight: 19,
	},

	input: {
		marginBottom: 14,
		backgroundColor: COLORS.white,
	},

	inputOutline: {
		borderRadius: 13,
	},

	inputContent: {
		minHeight: 54,
	},

	forgotPasswordRow: {
		alignItems: "flex-end",
		marginTop: -8,
		marginRight: -8,
		marginBottom: 8,
	},

	forgotPasswordLabel: {
		fontSize: 12,
		fontFamily: FONTS.bold,
	},

	errorBox: {
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
		marginBottom: 14,
		paddingHorizontal: 12,
		paddingVertical: 11,
		borderRadius: 12,
		backgroundColor: "rgba(239,68,68,0.08)",
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.22)",
	},

	errorText: {
		flex: 1,
		color: COLORS.error,
		fontFamily: FONTS.semiBold,
		fontSize: 13,
		lineHeight: 18,
	},

	loginButton: {
		borderRadius: 13,
	},

	loginButtonContent: {
		minHeight: 52,
	},

	loginButtonLabel: {
		fontSize: 15,
		fontFamily: FONTS.bold,
	},

	separator: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginVertical: 18,
	},

	separatorLine: {
		flex: 1,
		height: 1,
		backgroundColor: COLORS.border,
	},

	separatorText: {
		color: COLORS.textLight,
		fontFamily: FONTS.semiBold,
		fontSize: 12,
	},

	registerButton: {
		borderRadius: 13,
		borderColor: COLORS.primary,
	},

	registerButtonContent: {
		minHeight: 50,
	},

	registerButtonLabel: {
		fontSize: 14,
		fontFamily: FONTS.bold,
	},

	googleButton: {
		borderRadius: 13,
		borderColor: "#E2E8F0",
		backgroundColor: COLORS.white,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	googleButtonContent: {
		minHeight: 50,
	},
	googleButtonLabel: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},

	homeButton: {
		alignSelf: "center",
		marginTop: 12,
	},

	homeButtonLabel: {
		fontSize: 13,
		fontFamily: FONTS.bold,
	},

	footerText: {
		marginTop: 4,
		paddingHorizontal: 24,
		color: COLORS.textLight,
		fontFamily: FONTS.regular,
		fontSize: 10.5,
		lineHeight: 15,
		textAlign: "center",
	},
});
