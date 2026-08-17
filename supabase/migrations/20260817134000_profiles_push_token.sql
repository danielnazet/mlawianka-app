-- Add push_token column to profiles table for background push notification delivery
alter table public.profiles
  add column if not exists push_token text;
