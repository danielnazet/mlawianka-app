import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Text,
  Portal,
  Dialog,
  TextInput,
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

import { findTeamIdByAge, getAgeFromInput } from "../../constants/teams";

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

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [addChildModalVisible, setAddChildModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [newChildFirstName, setNewChildFirstName] = useState("");
  const [newChildLastName, setNewChildLastName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [newChildTeamId, setNewChildTeamId] = useState("");
  const [addChildLoading, setAddChildLoading] = useState(false);

  const handleNewChildAgeChange = (val: string) => {
    setNewChildAge(val);
    const calculatedAge = getAgeFromInput(val);
    if (calculatedAge !== null && teamsList.length > 0) {
      const matchedTeamId = findTeamIdByAge(calculatedAge, teamsList);
      if (matchedTeamId) {
        setNewChildTeamId(matchedTeamId.toString());
      }
    }
  };

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
        if (profile.role === "parent") {
          const { data: teamsData } = await supabase.from("teams").select("*");
          setTeamsList(teamsData || []);
          if (teamsData && teamsData.length > 0 && !newChildTeamId) {
            setNewChildTeamId(teamsData[0].id.toString());
          }

          const { data: rels, error: relErr } = await supabase
            .from("parent_children")
            .select("child_id")
            .eq("parent_id", profile.id);

          if (!relErr && rels && rels.length > 0) {
            const childIds = rels.map((r) => r.child_id);
            const { data: kids } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, team_id, teams(name)")
              .in("id", childIds);

            setChildrenList(kids || []);
          } else if (profile.child_first_name) {
            setChildrenList([
              {
                id: "single_child",
                first_name: profile.child_first_name,
                last_name: profile.child_last_name || "",
                teams: profile.team_id ? { name: teamName } : null,
              },
            ]);
          } else {
            setChildrenList([]);
          }
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

  const handleAddChild = async () => {
    if (!profile) return;
    if (!newChildFirstName.trim() || !newChildLastName.trim() || !newChildTeamId) {
      Alert.alert("Błąd", "Wypełnij imię, nazwisko oraz wybierz zespół dziecka");
      return;
    }

    setAddChildLoading(true);
    try {
      const { data: childProfile, error: childErr } = await supabase
        .from("profiles")
        .insert([
          {
            first_name: newChildFirstName.trim(),
            last_name: newChildLastName.trim(),
            age: newChildAge ? parseInt(newChildAge) : null,
            role: "player",
            team_id: parseInt(newChildTeamId),
          },
        ])
        .select()
        .single();

      if (childErr) throw childErr;

      if (childProfile) {
        const { error: relErr } = await supabase
          .from("parent_children")
          .insert([
            {
              parent_id: profile.id,
              child_id: childProfile.id,
            },
          ]);
        if (relErr) throw relErr;
      }

      setAddChildModalVisible(false);
      setNewChildFirstName("");
      setNewChildLastName("");
      setNewChildAge("");
      await loadProfileDetails(false);
      Alert.alert("Sukces", "Dziecko zostało pomyślnie dodane do zespołu!");
    } catch (err: any) {
      console.error("Error adding child:", err);
      Alert.alert("Błąd", err.message || "Nie udało się dodać dziecka");
    } finally {
      setAddChildLoading(false);
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

      case "fan":
        return "Kibic GKS Strzegowo";

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
          {profile?.avatar_url ? (
            <Avatar.Image
              size={82}
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={82}
              label={getInitials()}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
          )}

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
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                  Moje Dzieci w Klubie
                </Text>
                <Button
                  mode="text"
                  compact
                  icon="plus"
                  onPress={() => setAddChildModalVisible(true)}
                  textColor={COLORS.primary}
                  labelStyle={{ fontFamily: FONTS.bold, fontSize: 13 }}
                >
                  Dodaj dziecko
                </Button>
              </View>

              {childrenList.length > 0 ? (
                childrenList.map((kid, idx) => (
                  <InfoRow
                    key={kid.id}
                    icon="account-child-outline"
                    label={`${kid.first_name} ${kid.last_name}`}
                    value={kid.teams?.name ? `Zespół: ${kid.teams.name}` : "Brak zespołu"}
                    last={idx === childrenList.length - 1}
                  />
                ))
              ) : (
                <InfoRow
                  icon="account-child-outline"
                  label="Dziecko"
                  value={childName || "Nie podano danych dziecka"}
                  last
                />
              )}
            </Card.Content>
          </Card>
        )}

        {profile?.role === "fan" && (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.sectionTitle}>
                Oficjalny Kibic & Sympatyk GKS Strzegowo
              </Text>

              <InfoRow
                icon="bullhorn-outline"
                label="Status konta"
                value="Dostęp do aktualności, tabel ligowych i meczów Seniorów"
              />

              <InfoRow
                icon="bell-ring-outline"
                label="Powiadomienia PUSH"
                value="Włączone: Nowości klubowe oraz powiadomienia o meczach Seniorów"
                last
              />
            </Card.Content>
          </Card>
        )}

        {profile?.role === "admin" && (
          <View style={styles.adminPanel}>
            <View style={styles.adminHeader}>
              <Avatar.Icon
                size={46}
                icon="shield-crown"
                style={styles.adminIcon}
                color={COLORS.white}
              />
              <View style={styles.adminHeaderText}>
                <Text style={styles.adminHeading}>Panel administratora</Text>
                <Text style={styles.adminDescription}>
                  Zarządzaj drużynami i trenerami klubu
                </Text>
              </View>
            </View>
            <View style={styles.adminTiles}>
              <Pressable
                onPress={() => router.push("/admin/manage_coaches")}
                style={({ pressed }) => [
                  styles.adminTile,
                  pressed && styles.adminTilePressed,
                ]}
              >
                <View style={styles.adminTileIcon}>
                  <MaterialCommunityIcons
                    name="account-tie"
                    size={27}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.adminTileTitle}>Trenerzy</Text>
                <Text style={styles.adminTileDescription}>
                  Dodawaj trenerów i sprawdzaj ich drużyny
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={COLORS.textLight}
                  style={styles.adminTileArrow}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push("/admin/manage_teams")}
                style={({ pressed }) => [
                  styles.adminTile,
                  pressed && styles.adminTilePressed,
                ]}
              >
                <View style={styles.adminTileIcon}>
                  <MaterialCommunityIcons
                    name="shield-plus"
                    size={27}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.adminTileTitle}>Drużyny</Text>
                <Text style={styles.adminTileDescription}>
                  Twórz drużyny i przypisuj trenerów
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={COLORS.textLight}
                  style={styles.adminTileArrow}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push("/admin/manage_members")}
                style={({ pressed }) => [
                  styles.adminTile,
                  pressed && styles.adminTilePressed,
                ]}
              >
                <View style={styles.adminTileIcon}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={27}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.adminTileTitle}>Członkowie</Text>
                <Text style={styles.adminTileDescription}>
                  Zarządzaj zawodnikami i rodzicami
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={COLORS.textLight}
                  style={styles.adminTileArrow}
                />
              </Pressable>
            </View>
          </View>
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

      {/* Modal Dodawania Nowego Dziecka */}
      <Portal>
        <Dialog
          visible={addChildModalVisible}
          onDismiss={() => setAddChildModalVisible(false)}
          style={{ backgroundColor: COLORS.white, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18 }}>
            Dodaj dziecko do klubu
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 16 }}>
            <TextInput
              label="Imię dziecka"
              value={newChildFirstName}
              onChangeText={setNewChildFirstName}
              mode="outlined"
              style={{ marginBottom: 10, backgroundColor: COLORS.white }}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              textColor={COLORS.textDark}
            />
            <TextInput
              label="Nazwisko dziecka"
              value={newChildLastName}
              onChangeText={setNewChildLastName}
              mode="outlined"
              style={{ marginBottom: 10, backgroundColor: COLORS.white }}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              textColor={COLORS.textDark}
            />
            <TextInput
              label="Wiek lub rok urodzenia (np. 10 lub 2016)"
              value={newChildAge}
              onChangeText={handleNewChildAgeChange}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 14, backgroundColor: COLORS.white }}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              textColor={COLORS.textDark}
            />

            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textDark, marginBottom: 4 }}>
              Przypisany zespół dziecka (automatyczny wg wieku):
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#CBD5E1",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.primary} />
              <Text style={{ flex: 1, marginLeft: 10, fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textDark }}>
                {teamsList.find((t) => t.id.toString() === newChildTeamId)?.name || "Wpisz wiek dziecka powyżej"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4, fontFamily: FONTS.regular, fontStyle: "italic" }}>
              * Zespół przydzielany jest automatycznie na podstawie wieku. Zmiany grupy dokonuje wyłącznie Administrator.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddChildModalVisible(false)}>Anuluj</Button>
            <Button
              mode="contained"
              onPress={handleAddChild}
              loading={addChildLoading}
              disabled={addChildLoading}
              buttonColor={COLORS.primary}
            >
              Zapisz
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal Wyboru Zespołu w Profilu */}
      <Portal>
        <Dialog
          visible={teamModalVisible}
          onDismiss={() => setTeamModalVisible(false)}
          style={{ backgroundColor: COLORS.white, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18 }}>
            Wybierz zespół
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 16 }}>
            <ScrollView style={{ maxHeight: 280 }}>
              {teamsList.map((t) => {
                const isSelected = newChildTeamId === t.id.toString();
                return (
                  <Pressable
                    key={t.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: isSelected ? COLORS.primaryLight : "transparent",
                    }}
                    onPress={() => {
                      setNewChildTeamId(t.id.toString());
                      setTeamModalVisible(false);
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: isSelected ? FONTS.bold : FONTS.regular,
                        color: isSelected ? COLORS.primary : COLORS.textDark,
                      }}
                    >
                      {t.name}
                    </Text>
                    {isSelected && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTeamModalVisible(false)}>Zamknij</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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

  adminPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  adminIcon: {
    backgroundColor: COLORS.primary,
  },
  adminHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  adminHeading: {
    color: COLORS.textDark,
    fontSize: 17,
    fontFamily: FONTS.extraBold,
  },
  adminDescription: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  adminTiles: {
    gap: 10,
  },
  adminTile: {
    position: "relative",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 14,
    paddingRight: 45,
    minHeight: 105,
  },
  adminTilePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  adminTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  adminTileTitle: {
    color: COLORS.textDark,
    fontSize: 16,
    fontFamily: FONTS.extraBold,
  },
  adminTileDescription: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    fontFamily: FONTS.regular,
  },
  adminTileArrow: {
    position: "absolute",
    right: 12,
    top: "40%",
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
