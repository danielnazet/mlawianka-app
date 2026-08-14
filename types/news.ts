export interface NewsItem {
	id: number;
	title: string;
	content: string;
	created_at: string;
	is_first_team: boolean;
	image_url?: string | null;
}

export interface AnnouncementItem {
	id: number;
	title: string;
	content: string;
	created_at: string;
	sender: {
		first_name: string;
		last_name: string;
	} | null;
	team_id: number | null;
}
