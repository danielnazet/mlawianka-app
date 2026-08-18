export interface NewsItem {
	id: number;
	title: string;
	content: string;
	created_at: string;
	is_first_team: boolean;
	image_url?: string | null;
	images?: string[] | null;
	is_important?: boolean;
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
	target_team_ids?: number[] | null;
}
