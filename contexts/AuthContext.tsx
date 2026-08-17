import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Profile } from "../types";
export { Profile };

interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	loading: boolean;
	refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	profile: null,
	loading: true,
	refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchProfile = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				if (error.code !== "PGRST116") {
					console.error("Error fetching profile inside provider:", error);
				}
				setProfile(null);
			} else {
				setProfile(data);
			}
		} catch (err) {
			console.error("Fetch profile failed:", err);
			setProfile(null);
		}
	};

	const refreshProfile = async () => {
		if (user) {
			await fetchProfile(user.id);
		}
	};

	useEffect(() => {
		const clearSupabaseKeys = async () => {
			try {
				const keys = await AsyncStorage.getAllKeys();
				const supabaseKeys = keys.filter(key => key.includes("auth-token") || key.includes("supabase.auth"));
				for (const key of supabaseKeys) {
					await AsyncStorage.removeItem(key);
				}
			} catch (e) {
				console.error("Error clearing AsyncStorage keys:", e);
			}
		};

		// Check active sessions
		supabase.auth.getSession().then(async ({ data, error }) => {
			if (error) {
				console.warn("Session retrieval error:", error);
				if (error.message && (error.message.includes("Refresh Token") || error.message.includes("Invalid Refresh Token"))) {
					try {
						await clearSupabaseKeys();
						await supabase.auth.signOut();
					} catch (_) {}
				}
				setUser(null);
				setProfile(null);
				setLoading(false);
				return;
			}
			const session = data?.session ?? null;
			const currentUser = session?.user ?? null;
			setUser(currentUser);
			if (currentUser) {
				await fetchProfile(currentUser.id);
			}
			setLoading(false);
		}).catch(async (err) => {
			console.error("Auth getSession unhandled error:", err);
			try {
				await clearSupabaseKeys();
				await supabase.auth.signOut();
			} catch (_) {}
			setUser(null);
			setProfile(null);
			setLoading(false);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			// If session becomes invalid or token expired, reset user
			if (event === "TOKEN_REFRESHED" && !session) {
				setUser(null);
				setProfile(null);
				setLoading(false);
				return;
			}
			const currentUser = session?.user ?? null;
			setUser(currentUser);
			if (currentUser) {
				await fetchProfile(currentUser.id);
			} else {
				setProfile(null);
			}
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, []);

	const value = {
		user,
		profile,
		loading,
		refreshProfile,
	};

	return (
		<AuthContext.Provider value={value}>
			{loading ? (
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
					<ActivityIndicator size="large" color="#1e40af" />
				</View>
			) : (
				children
			)}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}

export default { useAuth, AuthProvider };
