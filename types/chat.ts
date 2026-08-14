import { Profile } from "./profile";

export interface Message {
	id: number;
	sender_id: string;
	recipient_id: string | null;
	channel: string | null;
	content: string;
	created_at: string;
	sender_name?: string;
	sender?: {
		first_name: string;
		last_name: string;
	} | null;
}

export interface ActiveChat {
	channel?: string | null;
	recipient?: Profile | null;
}
