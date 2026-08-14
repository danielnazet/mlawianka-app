export interface Match {
	id: number;
	team_id: number;
	opponent: string;
	match_date: string;
	location: string;
	result?: string | null;
	teams?: {
		name: string;
	} | null;
	created_at?: string;
}
