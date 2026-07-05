revoke all on table public.watchlist_items from anon;
revoke all on table public.watchlist_items from authenticated;

grant select, insert, delete on table public.watchlist_items to authenticated;
