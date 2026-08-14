import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Text,
} from "react-native-paper";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../css/colors";
import { FONTS } from "../../css/fonts";

type InfoRowProps = {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
};

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: InfoRowProps) {
  return (
    <>
      <View style={styles.infoRow}>
        <Avatar.Icon
          size={40}
          icon={icon}
          color={COLORS.primary}
          style={styles.infoIcon}
        />

        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>
            {label}
          </Text>

          <Text
            style={styles.infoValue}
            selectable
          >
            {value}
          </Text>
        </View>
      </View>

      {!last && <Divider style={styles.divider} />}
    </>
  );
}

function GuestProfile() {
  return (
    <ScrollView
      contentContainerStyle={styles.guestScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[
          COLORS.primaryDark,
          COLORS.primary,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.guestHero}
      >
        <View style={styles.guestLogoContainer}>
          <Image
            source={require("../assets/logo_gks.png")}
            style={styles.guestLogo}
          />
        </View>

        <Text style={styles.guestHeroTitle}>
          Twoje miejsce w klubie
        </Text>

        <Text style={styles.guestHeroDescription}>
          Zaloguj się, aby otrzymywać informacje od
          trenerów i mieć dostęp do swojej drużyny.
        </Text>
      </LinearGradient>

      <Card style={styles.guestCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>
            Po zalogowaniu
          </Text>

          <View style={styles.benefitRow}>
            <Avatar.Icon
              size={42}
              icon="calendar-check"
              color={COLORS.primary}
              style={styles.benefitIcon}
            />

            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>
                Terminarz treningów
              </Text>

              <Text style={styles.benefitDescription}>
                Sprawdzaj najbliższe treningi, mecze
                i zmiany w harmonogramie.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <Avatar.Icon
              size={42}
              icon="message-text"
              color={COLORS.primary}
              style={styles.benefitIcon}
            />

            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>
                Komunikacja z trenerem
              </Text>

              <Text style={styles.benefitDescription}>
                Odbieraj ważne komunikaty dotyczące
                swojej drużyny.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <Avatar.Icon
              size={42}
              icon="account-group"
              color={COLORS.primary}
              style={styles.benefitIcon}
            />

            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>
                Informacje o drużynie
              </Text>

              <Text style={styles.benefitDescription}>
                Miej dane zawodnika i przypisanie do
                grupy zawsze pod ręką.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="login"
        onPress={() => router.push("/auth/login")}
        buttonColor={COLORS.primary}
        textColor={COLORS.white}
        contentStyle={styles.primaryButtonContent}
        style={styles.primaryButton}
        labelStyle={styles.buttonLabel}
      >
        Zaloguj się
      </Button>

      <Button
        mode="outlined"
        icon="account-plus-outline"
        onPress={() => router.push("/auth/register")}
        textColor={COLORS.primary}
        contentStyle={styles.secondaryButtonContent}
        style={styles.secondaryButton}
        labelStyle={styles.buttonLabel}
      >
        Utwórz konto
      </Button>

      <Text style={styles.guestFooter}>
        Konto zawodnika niepełnoletniego powinno być
        powiązane z kontem rodzica lub opiekuna.
      </Text>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const [teamName, setTeamName] = useState(
    "Brak przypisania",
  );

  const [coachTeam, setCoachTeam] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [logoutLoading, setLogoutLoading] =
    useState(false);

  const loadProfileDetails = useCallback(
    async (showLoader = true) => {
      if (!profile) {
        if (showLoader) {
          setLoading(false);
        }

        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setTeamName("Brak przypisania");
      setCoachTeam(null);

      try {
        if (
          profile.role === "player" &&
          profile.team_id
        ) {
          const {
            data: team,
            error,
          } = await supabase
            .from("teams")
            .select("name")
            .eq("id", profile.team_id)
            .single();

          if (error) {
            throw error;
          }

          setTeamName(
            team?.name ?? "Brak przypisania",
          );
        }

        if (profile.role === "coach") {
          const {
            data: teams,
            error,
          } = await supabase
            .from("teams")
            .select("name")
            .eq("coach_id", profile.id);

          if (error) {
            throw error;
          }

          setCoachTeam(
            teams && teams.length > 0
              ? teams
                  .map((team) => team.name)
                  .join(", ")
              : "Brak przypisanej drużyny",
          );
        }
      } catch (error) {
        console.error(
          "Error loading profile details:",
          error,
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [profile],
  );

  useEffect(() => {
    void loadProfileDetails();
  }, [loadProfileDetails]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await refreshProfile();
      await loadProfileDetails(false);
    } catch (error) {
      console.error(
        "Profile refresh error:",
        error,
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (
        error &&
        error.message !== "Auth session missing!"
      ) {
        throw error;
      }

      router.replace("/news");
    } catch (error) {
      console.error("Logout error:", error);

      Alert.alert(
        "Nie udało się wylogować",
        "Spróbuj ponownie za chwilę.",
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const getInitials = () => {
    const firstName =
      profile?.first_name?.trim() ?? "";

    const lastName =
      profile?.last_name?.trim() ?? "";

    const initials =
      `${firstName[0] ?? ""}${lastName[0] ?? ""}`;

    return initials.toUpperCase() || "U";
  };

  const getFullName = () => {
    if (!profile) {
      return user?.email ?? "Użytkownik";
    }

    const fullName = [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return fullName || "Użytkownik";
  };

  const getRoleLabel = () => {
    switch (profile?.role) {
      case "admin":
        return "Administrator klubu";

      case "coach":
        return "Trener";

      case "parent":
        return "Rodzic zawodnika";

      case "player":
        return "Zawodnik";

      default:
        return "Użytkownik";
    }
  };

  const formatJoinDate = (
    dateString?: string | null,
  ) => {
    if (!dateString) {
      return "Brak danych";
    }

    return new Date(dateString).toLocaleDateString(
      "pl-PL",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  };

  const childName = [
    profile?.child_first_name,
    profile?.child_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Wczytywanie profilu…
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <GuestProfile />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <LinearGradient
          colors={[
            COLORS.primaryDark,
            COLORS.primary,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHero}
        >
          <Avatar.Text
            size={82}
            label={getInitials()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />

          <Text style={styles.profileName}>
            {getFullName()}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {getRoleLabel()}
            </Text>
          </View>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.sectionTitle}>
              Informacje o koncie
            </Text>

            <InfoRow
              icon="email-outline"
              label="Adres e-mail"
              value={
                profile?.email ??
                user.email ??
                "Brak danych"
              }
            />

            <InfoRow
              icon="calendar-outline"
              label="Data dołączenia"
              value={formatJoinDate(
                profile?.created_at,
              )}
              last
            />
          </Card.Content>
        </Card>

        {profile?.role === "player" && (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.sectionTitle}>
                Moja drużyna
              </Text>

              <InfoRow
                icon="account-group-outline"
                label="Grupa treningowa"
                value={teamName}
                last
              />
            </Card.Content>
          </Card>
        )}

        {profile?.role === "coach" && (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.sectionTitle}>
                Prowadzone zespoły
              </Text>

              <InfoRow
                icon="whistle-outline"
                label="Przypisane drużyny"
                value={
                  coachTeam ??
                  "Brak przypisanej drużyny"
                }
                last
              />
            </Card.Content>
          </Card>
        )}

        {profile?.role === "parent" && (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.sectionTitle}>
                Dane zawodnika
              </Text>

              <InfoRow
                icon="account-child-outline"
                label="Dziecko"
                value={
                  childName || "Nie podano danych"
                }
                last
              />
            </Card.Content>
          </Card>
        )}

        {profile?.role === "admin" && (
          <Card
            style={[
              styles.card,
              styles.adminCard,
            ]}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.adminHeader}>
                <Avatar.Icon
                  size={44}
                  icon="shield-account-outline"
                  color={COLORS.white}
                  style={styles.adminIcon}
                />

                <View style={styles.adminHeaderText}>
                  <Text style={styles.adminTitle}>
                    Zarządzanie klubem
                  </Text>

                  <Text
                    style={styles.adminDescription}
                  >
                    Członkowie, trenerzy i zespoły
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                icon="account-group"
                onPress={() =>
                  router.push(
                    "/admin/manage_members",
                  )
                }
                buttonColor={COLORS.primary}
                textColor={COLORS.white}
                contentStyle={styles.adminButtonContent}
                style={styles.adminButton}
              >
                Zarządzaj członkami
              </Button>

              <Button
                mode="outlined"
                icon="shield-home-outline"
                onPress={() =>
                  router.push(
                    "/admin/manage_teams",
                  )
                }
                textColor={COLORS.primary}
                contentStyle={styles.adminButtonContent}
                style={styles.adminOutlinedButton}
              >
                Zarządzaj zespołami
              </Button>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="outlined"
          icon="logout"
          onPress={handleLogout}
          loading={logoutLoading}
          disabled={logoutLoading}
          textColor={COLORS.error}
          contentStyle={styles.logoutButtonContent}
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonLabel}
        >
          Wyloguj się
        </Button>

        <Text style={styles.versionText}>
          GKS Strzegowo
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.background,
  },

  loadingText: {
    fontFamily: FONTS.regular,
    color: COLORS.textLight,
    fontSize: 14,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  profileHero: {
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
  },

  avatar: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },

  avatarLabel: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.extraBold,
    fontSize: 29,
  },

  profileName: {
    marginTop: 12,
    color: COLORS.white,
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    textAlign: "center",
  },

  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  roleBadgeText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },

  card: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },

  cardContent: {
    paddingVertical: 17,
  },

  sectionTitle: {
    marginBottom: 10,
    color: COLORS.textDark,
    fontFamily: FONTS.extraBold,
    fontSize: 16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },

  infoIcon: {
    backgroundColor: COLORS.primaryLight,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    marginBottom: 2,
    color: COLORS.textLight,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },

  infoValue: {
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 20,
  },

  divider: {
    marginLeft: 52,
    backgroundColor: COLORS.border,
  },

  adminCard: {
    borderColor: "rgba(29,78,216,0.28)",
    backgroundColor: COLORS.primaryLight,
  },

  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  adminIcon: {
    backgroundColor: COLORS.primary,
  },

  adminHeaderText: {
    flex: 1,
  },

  adminTitle: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.extraBold,
    fontSize: 16,
  },

  adminDescription: {
    marginTop: 2,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },

  adminButton: {
    marginBottom: 10,
    borderRadius: 12,
  },

  adminOutlinedButton: {
    borderRadius: 12,
    borderColor: COLORS.primary,
  },

  adminButtonContent: {
    minHeight: 46,
  },

  logoutButton: {
    marginTop: 4,
    borderRadius: 12,
    borderColor: "rgba(239,68,68,0.55)",
  },

  logoutButtonContent: {
    minHeight: 48,
  },

  logoutButtonLabel: {
    fontFamily: FONTS.bold,
  },

  versionText: {
    marginTop: 16,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: "center",
  },

  guestScrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 36,
  },

  guestHero: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 24,
    overflow: "hidden",
  },

  guestLogoContainer: {
    width: 82,
    height: 82,
    marginBottom: 16,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },

  guestLogo: {
    width: 62,
    height: 62,
    resizeMode: "contain",
  },

  guestHeroTitle: {
    color: COLORS.white,
    fontFamily: FONTS.extraBold,
    fontSize: 23,
    textAlign: "center",
  },

  guestHeroDescription: {
    maxWidth: 300,
    marginTop: 8,
    color: "rgba(255,255,255,0.82)",
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  guestCard: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  benefitIcon: {
    backgroundColor: COLORS.primaryLight,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  benefitDescription: {
    marginTop: 2,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
  },

  primaryButton: {
    borderRadius: 12,
  },

  primaryButtonContent: {
    minHeight: 50,
  },

  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    borderColor: COLORS.primary,
  },

  secondaryButtonContent: {
    minHeight: 50,
  },

  buttonLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },

  guestFooter: {
    marginTop: 18,
    paddingHorizontal: 14,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
