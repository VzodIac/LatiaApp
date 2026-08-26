-- =============================================================================
-- Migration 001 — masa yönetimi, kısmi (kişi bazlı) ödeme, ekstra grupları
-- =============================================================================
-- schema.sql + seed.sql çalıştırıldıktan SONRA bir kez çalıştırın.
-- Tekrar çalıştırılabilir (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Masalar — adları değiştirilebilir olsun ("Masa 3" → "Teras 1")
-- ---------------------------------------------------------------------------
create table if not exists tables (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  number       int not null,
  name         text not null,
  section      text,                      -- "İç Salon", "Teras" …
  seats        int not null default 4,
  active       boolean not null default true,
  sort         int not null default 0,
  unique (business_id, number)
);
create index if not exists tables_business_idx on tables(business_id, sort);

-- Mevcut işletme için 1..10 varsayılan masaları oluştur
do $$
declare b_id uuid;
begin
  select id into b_id from businesses order by created_at limit 1;
  if b_id is not null then
    insert into tables (business_id, number, name, sort)
    select b_id, n, 'Masa ' || n, n
      from generate_series(1, 10) as n
    on conflict (business_id, number) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Kısmi ödeme — bir adisyonun ürünleri ayrı ayrı ödenebilsin
--    (ör. 4 kişilik masada herkes kendi siparişini öder)
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  order_id     uuid not null references orders(id) on delete cascade,
  amount       numeric(12,2) not null,
  cost         numeric(12,4) not null default 0,
  method       text not null,                      -- cash | card
  staff_id     uuid references staff(id),
  staff_name   text not null default '',
  note         text,
  paid_at      timestamptz not null default now()
);
create index if not exists payments_order_idx on payments(order_id);
create index if not exists payments_business_idx on payments(business_id, paid_at desc);

-- Hangi satırın hangi ödemeye ait olduğu. NULL = henüz ödenmedi.
alter table order_items add column if not exists payment_id uuid references payments(id) on delete set null;
create index if not exists order_items_payment_idx on order_items(payment_id);

-- ---------------------------------------------------------------------------
-- 3) Ekstra (modifier) grupları — hangi kategorideki ürünlere iliştirilebilir
--    Not: kategori id'leri UUID olduğu için isim/koda göre kontrol kırılgandı;
--    kalıcı çözüm kategori üzerinde bayrak tutmak.
-- ---------------------------------------------------------------------------
alter table categories add column if not exists allow_extras boolean not null default false;

-- Ekmek Üstü / Sandviç kategorisinde ekstralar seçilebilsin
update categories
   set allow_extras = true
 where allow_extras = false
   and (name ilike '%ekmek üstü%' or name ilike '%sandvi%');

-- ---------------------------------------------------------------------------
-- 4) Gerçek zamanlı yayına yeni tabloları ekle
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table tables;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table payments;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tables','payments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists auth_all on %I', t);
    execute format(
      'create policy auth_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Ödeme analizi görünümü (kısmi ödemeler dahil)
-- ---------------------------------------------------------------------------
create or replace view v_payments as
select
  p.business_id,
  date_trunc('day', p.paid_at) as gun,
  p.method,
  count(*)                     as odeme_sayisi,
  sum(p.amount)                as tutar,
  sum(p.cost)                  as maliyet,
  sum(p.amount - p.cost)       as brut_kar
from payments p
group by 1,2,3;
