-- Add location column to orlik_bookings to distinguish between Orlik SP and Orlik Parkowa
alter table public.orlik_bookings
  add column if not exists location text default 'Orlik nr 1 przy SP, ul. Wojska Polskiego 1';
