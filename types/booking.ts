export interface OrlikBooking {
	id: number;
	booking_date: string;
	start_time: string;
	end_time: string;
	description?: string | null;
	booked_by: string;
	profile?: {
		first_name: string;
		last_name: string;
	} | null;
	profiles?: {
		first_name: string;
		last_name: string;
	} | null;
	created_at?: string;
}
