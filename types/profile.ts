export interface Profile {
	id: string;
	first_name: string;
	last_name: string;
	email?: string;
	role: "admin" | "coach" | "player" | "parent";
	team_id?: number | null;
	child_first_name?: string | null;
	child_last_name?: string | null;
	created_at?: string;
}
