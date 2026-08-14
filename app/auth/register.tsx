import React, {
  ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Checkbox,
  Text,
  TextInput,
} from "react-native-paper";

import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";
import { findTeamIdByAge } from "../../constants";

type RegistrationRole = "player" | "parent";

type MaterialIconName = ComponentProps<
  typeof MaterialIcons
>["name"];

interface Team {
  id: number;
  name: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  childFirstName: string;
  childLastName: string;
  childAge: string;
}

type RoleOptionProps = {
  value: RegistrationRole;
  selected: boolean;
  icon: MaterialIconName;
  title: string;
  description: string;
  onPress: (role: RegistrationRole) => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  age: "",
  childFirstName: "",
  childLastName: "",
  childAge: "",
};

function translateRegisterError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "Konto z tym adresem e-mail już istnieje.";
  }

  if (
    normalized.includes("password") &&
    normalized.includes("weak")
  ) {
    return "Hasło jest zbyt słabe.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many")
  ) {
    return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch")
  ) {
    return "Sprawdź połączenie z internetem.";
  }

  return "Nie udało się utworzyć konta. Spróbuj ponownie.";
}

function RoleOption({
  value,
  selected,
  icon,
  title,
  description,
  onPress,
}: RoleOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onPress(value)}
      style={[
        styles.roleOption,
        selected && styles.selectedRoleOption,
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          selected && styles.selectedRoleIcon,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={24}
          color={
            selected
              ? COLORS.white
              : COLORS.primary
          }
        />
      </View>

      <Text
        style={[
          styles.roleTitle,
          selected && styles.selectedRoleTitle,
        ]}
      >
        {title}
      </Text>

      <Text style={styles.roleDescription}>
        {description}
      </Text>

      <View
        style={[
          styles.roleCheck,
          selected && styles.selectedRoleCheck,
        ]}
      >
        {selected && (
          <MaterialIcons
            name="check"
            size={14}
            color={COLORS.white}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [role, setRole] =
    useState<RegistrationRole>("parent");

  const [formData, setFormData] =
    useState<RegisterForm>(INITIAL_FORM);

  const [teams, setTeams] = useState<Team[]>([]);
  const [acceptedPrivacy, setAcceptedPrivacy] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [registrationComplete, setRegistrationComplete] =
    useState(false);

  const [registeredEmail, setRegisteredEmail] =
    useState("");

  useEffect(() => {
    let mounted = true;

    const fetchTeams = async () => {
      try {
        const {
          data,
          error: teamsError,
        } = await supabase
          .from("registration_teams")
          .select("id, name")
          .order("id", {
            ascending: true,
          });

        if (teamsError) {
          throw teamsError;
        }

        if (mounted) {
          setTeams(data ?? []);
        }
      } catch (caughtError) {
        console.error(
          "Error fetching registration teams:",
          caughtError,
        );

        if (mounted) {
          setTeams([]);
        }
      } finally {
        if (mounted) {
          setTeamsLoading(false);
        }
      }
    };

    void fetchTeams();

    return () => {
      mounted = false;
    };
  }, []);

  const numericAge = useMemo(() => {
    const ageValue =
      role === "player"
        ? formData.age
        : formData.childAge;

    const parsedAge = Number.parseInt(
      ageValue,
      10,
    );

    return Number.isFinite(parsedAge)
      ? parsedAge
      : null;
  }, [
    role,
    formData.age,
    formData.childAge,
  ]);

  const suggestedTeamId = useMemo(() => {
    if (numericAge === null || teams.length === 0) {
      return null;
    }

    return findTeamIdByAge(
      numericAge,
      teams,
    );
  }, [numericAge, teams]);

  const suggestedTeam = useMemo(
    () =>
      teams.find(
        (team) => team.id === suggestedTeamId,
      ) ?? null,
    [teams, suggestedTeamId],
  );

  const updateFormData = (
    key: keyof RegisterForm,
    value: string,
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const changeRole = (
    selectedRole: RegistrationRole,
  ) => {
    setRole(selectedRole);
    setError("");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/news");
  };

  const validateForm = () => {
    const firstName =
      formData.firstName.trim();

    const lastName =
      formData.lastName.trim();

    const email = formData.email
      .trim()
      .toLowerCase();

    if (
      firstName.length < 2 ||
      lastName.length < 2
    ) {
      return "Podaj prawidłowe imię i nazwisko.";
    }

    if (!EMAIL_REGEX.test(email)) {
      return "Podaj prawidłowy adres e-mail.";
    }

    if (formData.password.length < 8) {
      return "Hasło powinno mieć co najmniej 8 znaków.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "Podane hasła nie są takie same.";
    }

    if (role === "player") {
      const playerAge = Number.parseInt(
        formData.age,
        10,
      );

      if (
        !Number.isFinite(playerAge) ||
        playerAge < 4 ||
        playerAge > 100
      ) {
        return "Podaj prawidłowy wiek zawodnika.";
      }
    }

    if (role === "parent") {
      if (
        formData.childFirstName.trim().length < 2 ||
        formData.childLastName.trim().length < 2
      ) {
        return "Podaj imię i nazwisko dziecka.";
      }

      const childAge = Number.parseInt(
        formData.childAge,
        10,
      );

      if (
        !Number.isFinite(childAge) ||
        childAge < 3 ||
        childAge > 18
      ) {
        return "Podaj prawidłowy wiek dziecka.";
      }
    }

    if (!acceptedPrivacy) {
      return "Zaakceptuj regulamin i politykę prywatności.";
    }

    return null;
  };

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedEmail = formData.email
      .trim()
      .toLowerCase();

    setLoading(true);
    setError("");

    try {
      const metadata: Record<
        string,
        string | number | boolean | null
      > = {
        first_name:
          formData.firstName.trim(),

        last_name:
          formData.lastName.trim(),

        role,

        team_id: suggestedTeamId,

        privacy_accepted: true,
      };

      if (role === "player") {
        metadata.age = Number.parseInt(
          formData.age,
          10,
        );
      }

      if (role === "parent") {
        metadata.child_first_name =
          formData.childFirstName.trim();

        metadata.child_last_name =
          formData.childLastName.trim();

        metadata.child_age =
          Number.parseInt(
            formData.childAge,
            10,
          );
      }

      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: formData.password,

        options: {
          emailRedirectTo:
            "gksstrzegowo://auth/login",

          data: metadata,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      /*
       * Nie wykonujemy tutaj INSERT do profiles.
       * Profil tworzy trigger bazodanowy.
       */

      if (data.session) {
        router.replace("/news");
        return;
      }

      setRegisteredEmail(trimmedEmail);
      setRegistrationComplete(true);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "";

      setError(
        translateRegisterError(message),
      );

      console.error(
        "Registration error:",
        caughtError,
      );
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <View style={styles.successScreen}>
        <LinearGradient
          colors={[
            COLORS.primaryDark,
            COLORS.primary,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.successGradient,
            {
              paddingTop: insets.top + 30,
              paddingBottom: insets.bottom + 30,
            },
          ]}
        >
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <MaterialIcons
                name="mark-email-read"
                size={46}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.successTitle}>
              Sprawdź swoją pocztę
            </Text>

            <Text style={styles.successDescription}>
              Wysłaliśmy wiadomość potwierdzającą na:
            </Text>

            <Text style={styles.successEmail}>
              {registeredEmail}
            </Text>

            <Text style={styles.successHint}>
              Kliknij link w wiadomości, a następnie
              wróć do aplikacji i zaloguj się.
            </Text>

            <Button
              mode="contained"
              icon="login"
              onPress={() =>
                router.replace("/auth/login")
              }
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              contentStyle={styles.mainButtonContent}
              style={styles.mainButton}
              labelStyle={styles.mainButtonLabel}
            >
              Przejdź do logowania
            </Button>

            <Button
              mode="text"
              onPress={() =>
                router.replace("/news")
              }
              textColor={COLORS.textLight}
              style={styles.successHomeButton}
              labelStyle={styles.successHomeButtonLabel}
            >
              Wróć do aktualności
            </Button>
          </View>
        </LinearGradient>
      </View>
    );
  }

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
        {/* Przycisk powrotu - zamocowany na stałe */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          onPress={handleBack}
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
          {/* Nagłówek wewnątrz ScrollView dla optymalnej responsywności */}
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
                paddingTop: insets.top + 24,
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
              Dołącz do GKS
            </Text>

            <Text style={styles.clubSubtitle}>
              UTWÓRZ KONTO W APLIKACJI KLUBOWEJ
            </Text>
          </LinearGradient>

          {/* Karta rejestracji */}
          <View style={styles.registerCard}>
            <Text style={styles.cardTitle}>
              Utwórz konto
            </Text>

            <Text style={styles.cardDescription}>
              Podaj swoje dane i wybierz sposób,
              w jaki korzystasz z aplikacji.
            </Text>

            <Text style={styles.sectionLabel}>
              Kim jesteś?
            </Text>

            <View
              accessibilityRole="radiogroup"
              style={styles.roleOptions}
            >
              <RoleOption
                value="parent"
                selected={role === "parent"}
                icon="family-restroom"
                title="Rodzic"
                description="Konto opiekuna zawodnika"
                onPress={changeRole}
              />

              <RoleOption
                value="player"
                selected={role === "player"}
                icon="sports-soccer"
                title="Zawodnik"
                description="Konto zawodnika klubu"
                onPress={changeRole}
              />
            </View>

            <Text style={styles.sectionLabel}>
              Twoje dane
            </Text>

            <TextInput
              label="Imię"
              value={formData.firstName}
              onChangeText={(value) =>
                updateFormData(
                  "firstName",
                  value,
                )
              }
              mode="outlined"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              editable={!loading}
              left={
                <TextInput.Icon
                  icon="account-outline"
                  color={COLORS.textLight}
                />
              }
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              cursorColor={COLORS.primary}
              textColor={COLORS.textDark}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Nazwisko"
              value={formData.lastName}
              onChangeText={(value) =>
                updateFormData(
                  "lastName",
                  value,
                )
              }
              mode="outlined"
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              editable={!loading}
              left={
                <TextInput.Icon
                  icon="account-outline"
                  color={COLORS.textLight}
                />
              }
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              cursorColor={COLORS.primary}
              textColor={COLORS.textDark}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Adres e-mail"
              value={formData.email}
              onChangeText={(value) =>
                updateFormData("email", value)
              }
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
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
              textColor={COLORS.textDark}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Hasło"
              value={formData.password}
              onChangeText={(value) =>
                updateFormData(
                  "password",
                  value,
                )
              }
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
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
              textColor={COLORS.textDark}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Powtórz hasło"
              value={formData.confirmPassword}
              onChangeText={(value) =>
                updateFormData(
                  "confirmPassword",
                  value,
                )
              }
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
              left={
                <TextInput.Icon
                  icon="lock-check-outline"
                  color={COLORS.textLight}
                />
              }
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              cursorColor={COLORS.primary}
              textColor={COLORS.textDark}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <Text style={styles.passwordHint}>
              Hasło powinno mieć minimum 8 znaków.
            </Text>

            {role === "player" && (
              <>
                <Text style={styles.sectionLabel}>
                  Dane zawodnika
                </Text>

                <TextInput
                  label="Wiek zawodnika"
                  value={formData.age}
                  onChangeText={(value) =>
                    updateFormData(
                      "age",
                      value.replace(
                        /[^0-9]/g,
                        "",
                      ),
                    )
                  }
                  mode="outlined"
                  keyboardType="number-pad"
                  editable={!loading}
                  left={
                    <TextInput.Icon
                      icon="calendar-account-outline"
                      color={COLORS.textLight}
                    />
                  }
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  cursorColor={COLORS.primary}
                  textColor={COLORS.textDark}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />
              </>
            )}

            {role === "parent" && (
              <>
                <Text style={styles.sectionLabel}>
                  Dane dziecka
                </Text>

                <TextInput
                  label="Imię dziecka"
                  value={formData.childFirstName}
                  onChangeText={(value) =>
                    updateFormData(
                      "childFirstName",
                      value,
                    )
                  }
                  mode="outlined"
                  autoCapitalize="words"
                  editable={!loading}
                  left={
                    <TextInput.Icon
                      icon="account-child-outline"
                      color={COLORS.textLight}
                    />
                  }
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  cursorColor={COLORS.primary}
                  textColor={COLORS.textDark}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />

                <TextInput
                  label="Nazwisko dziecka"
                  value={formData.childLastName}
                  onChangeText={(value) =>
                    updateFormData(
                      "childLastName",
                      value,
                    )
                  }
                  mode="outlined"
                  autoCapitalize="words"
                  editable={!loading}
                  left={
                    <TextInput.Icon
                      icon="account-child-outline"
                      color={COLORS.textLight}
                    />
                  }
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  cursorColor={COLORS.primary}
                  textColor={COLORS.textDark}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />

                <TextInput
                  label="Wiek dziecka"
                  value={formData.childAge}
                  onChangeText={(value) =>
                    updateFormData(
                      "childAge",
                      value.replace(
                        /[^0-9]/g,
                        "",
                      ),
                    )
                  }
                  mode="outlined"
                  keyboardType="number-pad"
                  editable={!loading}
                  left={
                    <TextInput.Icon
                      icon="calendar-account-outline"
                      color={COLORS.textLight}
                    />
                  }
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  cursorColor={COLORS.primary}
                  textColor={COLORS.textDark}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />
              </>
            )}

            {numericAge !== null && (
              <View style={styles.teamSuggestion}>
                <MaterialIcons
                  name="groups"
                  size={22}
                  color={COLORS.primary}
                />

                <View style={styles.teamSuggestionText}>
                  <Text style={styles.teamSuggestionLabel}>
                    Przewidywana grupa
                  </Text>

                  <Text style={styles.teamSuggestionValue}>
                    {teamsLoading
                      ? "Sprawdzanie…"
                      : suggestedTeam?.name ??
                        "Grupę przypisze administrator"}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: acceptedPrivacy,
              }}
              onPress={() =>
                setAcceptedPrivacy(
                  (current) => !current,
                )
              }
              style={styles.privacyRow}
            >
              <Checkbox
                status={
                  acceptedPrivacy
                    ? "checked"
                    : "unchecked"
                }
                onPress={() =>
                  setAcceptedPrivacy(
                    (current) => !current,
                  )
                }
                color={COLORS.primary}
                uncheckedColor={COLORS.textLight}
                disabled={loading}
              />

              <Text style={styles.privacyText}>
                Akceptuję regulamin aplikacji oraz
                politykę prywatności i wyrażam zgodę
                na przetwarzanie podanych danych.
              </Text>
            </Pressable>

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
              icon="account-plus"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              contentStyle={styles.mainButtonContent}
              style={styles.mainButton}
              labelStyle={styles.mainButtonLabel}
            >
              {loading
                ? "Tworzenie konta…"
                : "Utwórz konto"}
            </Button>

            <Button
              mode="text"
              onPress={() =>
                router.replace("/auth/login")
              }
              disabled={loading}
              textColor={COLORS.primary}
              style={styles.loginLink}
              labelStyle={styles.loginLinkLabel}
            >
              Masz już konto? Zaloguj się
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
            labelStyle={styles.homeLinkLabel}
          >
            Kontynuuj bez rejestracji
          </Button>
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

    elevation: 6,
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
  },

  clubSubtitle: {
    marginTop: 4,

    color: "rgba(255,255,255,0.75)",
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    letterSpacing: 1.3,
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },

  registerCard: {
    marginTop: -24,
    marginHorizontal: 16,
    padding: 20,

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
    marginTop: 5,
    marginBottom: 20,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
  },

  sectionLabel: {
    marginTop: 14,
    marginBottom: 10,

    color: COLORS.textDark,
    fontFamily: FONTS.extraBold,
    fontSize: 14,
  },

  roleOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },

  roleOption: {
    flex: 1,
    minHeight: 132,
    padding: 12,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
  },

  selectedRoleOption: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  roleIcon: {
    width: 44,
    height: 44,
    marginBottom: 8,

    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primaryLight,
  },

  selectedRoleIcon: {
    backgroundColor: COLORS.primary,
  },

  roleTitle: {
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  selectedRoleTitle: {
    color: COLORS.primaryDark,
  },

  roleDescription: {
    marginTop: 3,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: "center",
  },

  roleCheck: {
    position: "absolute",
    top: 8,
    right: 8,

    width: 20,
    height: 20,

    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.white,
  },

  selectedRoleCheck: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  input: {
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },

  inputOutline: {
    borderRadius: 13,
  },

  passwordHint: {
    marginTop: -5,
    marginLeft: 4,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 10.5,
  },

  teamSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,

    marginTop: 4,
    marginBottom: 12,
    padding: 12,

    borderRadius: 13,

    backgroundColor: COLORS.primaryLight,

    borderWidth: 1,
    borderColor: "rgba(29,78,216,0.18)",
  },

  teamSuggestionText: {
    flex: 1,
  },

  teamSuggestionLabel: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 10.5,
  },

  teamSuggestionValue: {
    marginTop: 2,

    color: COLORS.primaryDark,
    fontFamily: FONTS.extraBold,
    fontSize: 13,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",

    marginTop: 6,
    marginBottom: 14,
    padding: 10,

    borderRadius: 12,
    backgroundColor: COLORS.background,
  },

  privacyText: {
    flex: 1,
    paddingTop: 7,
    paddingRight: 4,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
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

  mainButton: {
    borderRadius: 13,
  },

  mainButtonContent: {
    minHeight: 52,
  },

  mainButtonLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },

  loginLink: {
    marginTop: 10,
  },

  loginLinkLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  homeButton: {
    alignSelf: "center",
    marginTop: 12,
  },
  
  homeLinkLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  successScreen: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },

  successGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  successCard: {
    width: "100%",
    maxWidth: 430,

    alignItems: "center",
    padding: 26,

    borderRadius: 24,

    backgroundColor: COLORS.white,
  },

  successIcon: {
    width: 82,
    height: 82,
    marginBottom: 16,

    borderRadius: 41,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(16,185,129,0.1)",
  },

  successTitle: {
    color: COLORS.textDark,
    fontFamily: FONTS.extraBold,
    fontSize: 23,
    textAlign: "center",
  },

  successDescription: {
    marginTop: 8,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: "center",
  },

  successEmail: {
    marginTop: 5,

    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 14,
    textAlign: "center",
  },

  successHint: {
    marginTop: 14,
    marginBottom: 22,

    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  successHomeButton: {
    marginTop: 10,
  },
  
  successHomeButtonLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
});
