import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

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
				console.error("Error fetching profile inside provider:", error);
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
		// Check active sessions
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			const currentUser = session?.user ?? null;
			setUser(currentUser);
			if (currentUser) {
				await fetchProfile(currentUser.id);
			}
			setLoading(false);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
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
			{!loading && children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}

export default { useAuth, AuthProvider };
