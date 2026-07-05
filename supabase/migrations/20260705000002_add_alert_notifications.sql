-- Add email and webhook columns to price_alerts table
alter table public.price_alerts
add column if not exists notify_email boolean not null default false,
add column if not exists webhook_url text default null;
