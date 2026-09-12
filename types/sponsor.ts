export type SponsorCategory = "main" | "strategic" | "partner";

export interface Sponsor {
	id: number;
	name: string;
	category: SponsorCategory;
	description?: string | null;
	logo_url?: string | null;
	website_url?: string | null;
	phone?: string | null;
	display_order: number;
	is_active: boolean;
	created_at: string;
}
