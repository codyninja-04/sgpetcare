-- SGPetCare initial schema
-- Run in the Supabase SQL editor, or with `supabase db push`.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Profiles: plan and reminder preferences. One row per auth user, created by
-- the trigger at the bottom so the cron job never has to guess an email.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  email text,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  email_reminders boolean not null default true,
  push_reminders boolean not null default true,
  reminder_lead_days int not null default 14 check (reminder_lead_days between 1 and 60)
);

-- ---------------------------------------------------------------------------
-- Pets
-- ---------------------------------------------------------------------------
create table pets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  name text not null check (char_length(name) between 1 and 60),
  species text check (species in ('dog', 'cat', 'rabbit', 'bird', 'other')),
  breed text,
  sex text check (sex in ('male', 'female')),
  date_of_birth date,
  weight_kg numeric check (weight_kg is null or (weight_kg > 0 and weight_kg < 200)),
  microchip_number text,
  photo_url text,                          -- storage path, signed on read
  -- AVS licensing (dogs need one in SG, cats under the cat management framework)
  license_number text,
  license_expiry date,
  is_sterilized boolean default false,
  notes text
);

-- ---------------------------------------------------------------------------
-- Health records
-- ---------------------------------------------------------------------------
create table health_records (
  id uuid primary key default uuid_generate_v4(),
  pet_id uuid not null references pets(id) on delete cascade,
  created_at timestamptz default now(),
  record_type text check (record_type in ('vaccination', 'deworming', 'vet_visit', 'surgery', 'medication', 'grooming')),
  record_date date not null,
  vaccine_name text,
  next_due_date date,
  vet_clinic text,
  cost numeric check (cost is null or cost >= 0),
  notes text,
  vet_notes_original text,                 -- raw text, or Claude's transcription of a photo
  vet_notes_plain_english text,            -- Claude's interpretation
  vet_notes_key_points jsonb,              -- string[]
  vet_notes_follow_up text,                -- null when nothing needs chasing
  vet_notes_urgency text check (vet_notes_urgency in ('routine', 'follow_up', 'urgent')),
  document_url text                        -- storage path, signed on read
);

-- ---------------------------------------------------------------------------
-- Reminders. Created by the app whenever a record has a next due date or a
-- pet has a licence expiry. The daily cron sends them once inside the lead
-- window and marks reminder_sent.
-- ---------------------------------------------------------------------------
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  pet_id uuid not null references pets(id) on delete cascade,
  health_record_id uuid references health_records(id) on delete cascade,
  created_at timestamptz default now(),
  reminder_type text check (reminder_type in ('vaccination_due', 'license_renewal', 'deworming_due', 'checkup_due')),
  label text,                              -- "DHPPi booster", "AVS licence renewal"
  due_date date not null,
  is_completed boolean default false,
  reminder_sent boolean default false,
  sent_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Pet care Q&A history
-- ---------------------------------------------------------------------------
create table qa_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references pets(id) on delete set null,
  created_at timestamptz default now(),
  role text not null check (role in ('user', 'assistant')),
  content text not null
);

-- ---------------------------------------------------------------------------
-- Web push subscriptions, one per device
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- Indexes
create index idx_pets_user on pets(user_id);
create index idx_health_pet on health_records(pet_id, record_date desc);
create index idx_reminders_pet on reminders(pet_id, due_date asc, is_completed);
create index idx_reminders_open on reminders(due_date) where is_completed = false and reminder_sent = false;
create index idx_qa_user on qa_messages(user_id, created_at desc);
create index idx_push_user on push_subscriptions(user_id);

-- RLS
alter table profiles enable row level security;
alter table pets enable row level security;
alter table health_records enable row level security;
alter table reminders enable row level security;
alter table qa_messages enable row level security;
alter table push_subscriptions enable row level security;

create policy "own_profile_select" on profiles for select using (auth.uid() = id);
create policy "own_profile_insert" on profiles for insert with check (auth.uid() = id and plan = 'free');
-- Plan is not user editable. Billing updates it with the service role.
create policy "own_profile_update" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and plan = (select p.plan from profiles p where p.id = auth.uid()));

create policy "own_pets" on pets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_health" on health_records for all using (
  exists (select 1 from pets p where p.id = health_records.pet_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from pets p where p.id = health_records.pet_id and p.user_id = auth.uid())
);
create policy "own_reminders" on reminders for all using (
  exists (select 1 from pets p where p.id = reminders.pet_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from pets p where p.id = reminders.pet_id and p.user_id = auth.uid())
);
create policy "own_qa" on qa_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_push" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New user hook
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage. Both buckets are private and files live under <user_id>/..., so
-- the first folder in the path decides who can touch a file.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false), ('vet-documents', 'vet-documents', false)
on conflict (id) do nothing;

create policy "own_files_select" on storage.objects for select
  using (bucket_id in ('pet-photos', 'vet-documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_files_insert" on storage.objects for insert
  with check (bucket_id in ('pet-photos', 'vet-documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_files_update" on storage.objects for update
  using (bucket_id in ('pet-photos', 'vet-documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_files_delete" on storage.objects for delete
  using (bucket_id in ('pet-photos', 'vet-documents') and (storage.foldername(name))[1] = auth.uid()::text);
