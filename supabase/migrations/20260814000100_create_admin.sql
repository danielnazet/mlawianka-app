-- Usuwamy administratora, jeśli już istnieje (czyszczenie przed wstawieniem)
DELETE FROM public.profiles WHERE email = 'admin@gksstrzegowo.pl';
DELETE FROM auth.users WHERE email = 'admin@gksstrzegowo.pl';

-- Wstawiamy nowego użytkownika do auth.users (hasło: Admin123!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'authenticated',
    'authenticated',
    'admin@gksstrzegowo.pl',
    extensions.crypt('Admin123!', extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- Wstawiamy profil administratora do public.profiles
INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email,
    role,
    team_id
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Jan',
    'Administrator',
    'admin@gksstrzegowo.pl',
    'admin',
    null
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
