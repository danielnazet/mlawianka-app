import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Dane konfiguracyjne Supabase (w produkcji powinny być w zmiennych środowiskowych)
const supabaseUrl = "https://twoj-url-supabase.com";
const supabaseAnonKey = "twoj-klucz-anonimowy";

// Inicjalizacja klienta Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

// Funkcja inicjalizująca strukturę bazy danych
export const initializeDatabase = async () => {
	try {
		// Tworzenie tabel i struktur bazodanowych
		await Promise.all([
			createTrainingsTable(),
			createProfilesTable(),
			createBookingsTable(),
		]);

		console.log("Baza danych została zainicjalizowana");
	} catch (error) {
		console.error("Błąd podczas inicjalizacji bazy:", error);
	}
};

// Funkcje pomocnicze do tworzenia tabel
const createTrainingsTable = async () => {
	// Implementacja tworzenia tabeli treningów
};

const createProfilesTable = async () => {
	// Implementacja tworzenia tabeli profili
};

const createBookingsTable = async () => {
	// Implementacja tworzenia tabeli rezerwacji
};

// Inicjalizacja bazy przy starcie aplikacji
initializeDatabase();

export const createAdminAccount = async () => {
	const adminEmail = "admin@mlawianka.pl";
	const adminPassword = "admin123";

	try {
		// Najpierw utworzymy konto w auth
		const { data: authData, error: authError } = await supabase.auth.signUp(
			{
				email: adminEmail,
				password: adminPassword,
				options: {
					data: {
						first_name: "Admin",
						last_name: "Mlawianka",
						role: "admin",
					},
				},
			}
		);

		if (authError) throw authError;

		// Następnie dodamy profil do tabeli profiles
		const { error: profileError } = await supabase.from("profiles").insert([
			{
				id: authData.user.id,
				first_name: "Admin",
				last_name: "Mlawianka",
				email: adminEmail,
				role: "admin",
			},
		]);

		if (profileError) throw profileError;

		console.log("Konto administratora zostało utworzone pomyślnie");
		return { success: true };
	} catch (error) {
		console.error("Błąd podczas tworzenia konta administratora:", error);
		return { success: false, error };
	}
};
