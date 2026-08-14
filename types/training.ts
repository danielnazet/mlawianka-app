export interface Training {
	id: number;
	title: string;
	description?: string | null;
	coach: string;
	time: string;
	location: string;
	team_id: number | null;
	teams?: {
		name: string;
	} | null;
	created_at?: string;
}
