-- =============================================================================
-- La Tía — Postgres şeması (Supabase)
-- =============================================================================
-- Tasarım ilkeleri:
--  1) SNAPSHOT: Satış anındaki fiyat VE maliyet, sipariş satırına yazılır.
--     Sonradan zam/indirim yapılsa bile geçmiş kâr marjı bozulmaz.
--  2) ANALİZ HAZIR: Sipariş satırları ayrı tabloda (JSON değil) → SQL ile
--     ürün bazlı ciro/kâr/adet sorguları doğrudan çalışır.
--  3) ÇOK KİRACILI HAZIR: Her tabloda business_id var; bugün tek işletme,
--     yarın 2. şube eklenirse şema değişmeden çalışır.
--
-- Uygulama: Supabase panelinde SQL Editor'a yapıştırıp çalıştırın.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- İşletme (çok kiracılılık kökü)
-- ---------------------------------------------------------------------------
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'TRY',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Personel — uygulama içi garson kimliği (PIN ile hızlı geçiş)
-- Not: Cihazın veritabanına erişim yetkisi Supabase Auth ile ayrı yönetilir.
--      Buradaki PIN, vardiyada kimin sipariş aldığını ayırt etmek içindir.
-- ---------------------------------------------------------------------------
create table if not exists staff (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  pin          text not null,
  role         text not null default 'waiter',   -- waiter | manager | kitchen
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists staff_business_idx on staff(business_id);

-- ---------------------------------------------------------------------------
-- Vardiya — kasa açılış/kapanış (gün sonu mutabakatı)
-- ---------------------------------------------------------------------------
create table if not exists shifts (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  opened_by      uuid references staff(id),
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  opening_cash   numeric(12,2) not null default 0,
  closing_cash   numeric(12,2),
  note           text
);
create index if not exists shifts_business_idx on shifts(business_id, opened_at desc);

-- ---------------------------------------------------------------------------
-- Malzemeler — maliyetin kaynağı + alerjen bilgisi
-- cost_per_unit: TEMEL birim başına maliyet (g / ml / adet)
--   ör. 1 kg mozzarella 400 TL ise → unit='g', cost_per_unit = 0.40
-- ---------------------------------------------------------------------------
create table if not exists ingredients (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  name           text not null,
  unit           text not null default 'g',        -- g | ml | adet
  cost_per_unit  numeric(12,4) not null default 0, -- temel birim başına TL
  allergens      text[] not null default '{}',     -- {'Gluten','Süt','Ceviz'}
  supplier       text,
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists ingredients_business_idx on ingredients(business_id);

-- Malzeme fiyat geçmişi — "geçmiş maliyetimizi de görelim" ihtiyacı için.
-- Her fiyat değişiminde yeni satır eklenir; eski satır kapatılmaz, valid_from
-- ile sıralanır (belirli bir tarihteki maliyet = o tarihten önceki son kayıt).
create table if not exists ingredient_price_history (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references ingredients(id) on delete cascade,
  cost_per_unit  numeric(12,4) not null,
  valid_from     timestamptz not null default now(),
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists iph_ingredient_idx on ingredient_price_history(ingredient_id, valid_from desc);

-- ---------------------------------------------------------------------------
-- Menü
-- station: siparişin hangi mutfak ekranına düşeceği (yemek / bar)
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  station      text not null default 'kitchen',  -- kitchen | bar
  sort         int not null default 0
);
create index if not exists categories_business_idx on categories(business_id, sort);

create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete restrict,
  name         text not null,
  description  text not null default '',
  price        numeric(12,2) not null default 0,
  -- Reçeteden hesaplanan güncel maliyet (önbellek; recalc_menu_item_cost ile güncellenir)
  cost         numeric(12,4) not null default 0,
  kcal         int,
  -- Reçeteden türeyen alerjenler manuel olarak da genişletilebilir
  allergens    text[] not null default '{}',
  station      text,                              -- boşsa kategoriden miras alınır
  sold_out     boolean not null default false,
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists menu_items_business_idx on menu_items(business_id, sort);
create index if not exists menu_items_category_idx on menu_items(category_id);

-- Ekstralar / modifierlar (ürüne iliştirilen: 2 yumurta, glutensiz ekmek…)
create table if not exists extras (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  price        numeric(12,2) not null default 0,
  cost         numeric(12,4) not null default 0,
  active       boolean not null default true,
  sort         int not null default 0
);
create index if not exists extras_business_idx on extras(business_id, sort);

-- ---------------------------------------------------------------------------
-- Reçete (BOM) — ürün/ekstra ile malzeme arasındaki bağ.
-- Mutfak ekranında "içindekiler" olarak gösterilir; maliyet buradan hesaplanır.
-- ---------------------------------------------------------------------------
create table if not exists recipe_items (
  id             uuid primary key default gen_random_uuid(),
  menu_item_id   uuid references menu_items(id) on delete cascade,
  extra_id       uuid references extras(id) on delete cascade,
  ingredient_id  uuid not null references ingredients(id) on delete restrict,
  qty            numeric(12,4) not null,   -- malzemenin temel biriminde miktar
  note           text,                     -- "ince dilim", "fırında 8 dk" gibi
  sort           int not null default 0,
  -- Bir reçete satırı ya bir ürüne ya bir ekstraya ait olmalı
  constraint recipe_owner_ck check (
    (menu_item_id is not null and extra_id is null) or
    (menu_item_id is null and extra_id is not null)
  )
);
create index if not exists recipe_menu_item_idx on recipe_items(menu_item_id);
create index if not exists recipe_extra_idx on recipe_items(extra_id);

-- ---------------------------------------------------------------------------
-- Adisyonlar
-- guest_count: kişi başı ciro analizi için (sektörün temel metriği)
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  shift_id         uuid references shifts(id),
  kind             text not null default 'table',   -- table | name | paket
  label            text not null,                   -- "Masa 3", "Elif H."
  table_no         int,
  guest_count      int not null default 1,
  staff_id         uuid references staff(id),
  waiter_name      text not null default '',        -- snapshot (personel silinse de rapor bozulmaz)
  status           text not null default 'open',    -- open | paid | void
  opened_at        timestamptz not null default now(),
  paid_at          timestamptz,
  payment_method   text,                            -- cash | card
  -- Tutarlar ödeme anında dondurulur (rapor tutarlılığı)
  subtotal         numeric(12,2) not null default 0,
  discount_type    text not null default 'none',    -- none | p10 | p15 | comp | custom
  discount_amount  numeric(12,2) not null default 0,
  discount_reason  text,                            -- kâr sızıntısı analizi
  total            numeric(12,2) not null default 0,
  total_cost       numeric(12,4) not null default 0,-- satılan ürünlerin maliyet toplamı
  split_count      int not null default 1,
  void_reason      text,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_business_status_idx on orders(business_id, status);
create index if not exists orders_paid_at_idx on orders(business_id, paid_at desc);
create index if not exists orders_shift_idx on orders(shift_id);

-- Sipariş satırları — analiz için ayrı tablo (JSON değil).
-- unit_price / unit_cost: SATIŞ ANINDAKİ değerler (snapshot).
create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  menu_item_id   uuid references menu_items(id) on delete set null,
  name           text not null,                    -- snapshot
  unit_price     numeric(12,2) not null,           -- snapshot
  unit_cost      numeric(12,4) not null default 0, -- snapshot → gerçek geçmiş marj
  qty            int not null default 1,
  note           text,
  course         int not null default 1,           -- kaçıncı servis
  station        text not null default 'kitchen',
  -- KDS akışı
  status         text not null default 'new',      -- new | preparing | ready | served
  sent_at        timestamptz,                      -- mutfağa düşme
  ready_at       timestamptz,                      -- hazır işaretlenme
  served_at      timestamptz,
  voided         boolean not null default false,
  void_reason    text,
  created_at     timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);
create index if not exists order_items_menu_item_idx on order_items(menu_item_id);
create index if not exists order_items_kds_idx on order_items(station, status);

-- Satırdaki ekstralar — ayrı tabloda: "ekstra ekleme oranı" (upsell) analizi için
create table if not exists order_item_extras (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references order_items(id) on delete cascade,
  extra_id       uuid references extras(id) on delete set null,
  name           text not null,                    -- snapshot
  price          numeric(12,2) not null,           -- snapshot
  cost           numeric(12,4) not null default 0  -- snapshot
);
create index if not exists oie_item_idx on order_item_extras(order_item_id);

-- ---------------------------------------------------------------------------
-- Ayarlar (tema, varsayılanlar) — işletme başına tek satır
-- ---------------------------------------------------------------------------
create table if not exists settings (
  business_id   uuid primary key references businesses(id) on delete cascade,
  theme         text not null default 'light',
  table_count   int not null default 10,
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- Yardımcı fonksiyonlar
-- =============================================================================

-- Bir ürünün reçeteden gelen maliyetini hesaplar ve menu_items.cost'a yazar.
create or replace function recalc_menu_item_cost(p_menu_item_id uuid)
returns numeric
language plpgsql
as $$
declare
  v_cost numeric(12,4);
begin
  select coalesce(sum(ri.qty * i.cost_per_unit), 0)
    into v_cost
    from recipe_items ri
    join ingredients i on i.id = ri.ingredient_id
   where ri.menu_item_id = p_menu_item_id;

  update menu_items set cost = v_cost where id = p_menu_item_id;
  return v_cost;
end;
$$;

-- Malzeme fiyatı değişince geçmişe kayıt düş + etkilenen ürünlerin maliyetini güncelle
create or replace function on_ingredient_cost_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE' and new.cost_per_unit is distinct from old.cost_per_unit)
     or tg_op = 'INSERT' then
    insert into ingredient_price_history(ingredient_id, cost_per_unit)
    values (new.id, new.cost_per_unit);

    -- Bu malzemeyi kullanan tüm ürünlerin maliyetini yeniden hesapla
    perform recalc_menu_item_cost(ri.menu_item_id)
       from (select distinct menu_item_id from recipe_items
              where ingredient_id = new.id and menu_item_id is not null) ri;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ingredients_cost_trg on ingredients;
create trigger ingredients_cost_trg
  before insert or update on ingredients
  for each row execute function on_ingredient_cost_change();

-- Reçete değişince ilgili ürünün maliyetini güncelle
create or replace function on_recipe_change()
returns trigger
language plpgsql
as $$
declare
  v_item uuid;
begin
  v_item := coalesce(new.menu_item_id, old.menu_item_id);
  if v_item is not null then
    perform recalc_menu_item_cost(v_item);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists recipe_items_trg on recipe_items;
create trigger recipe_items_trg
  after insert or update or delete on recipe_items
  for each row execute function on_recipe_change();

-- =============================================================================
-- Analiz görünümleri (Aşama 3'ün temeli — panel gelmeden de sorgulanabilir)
-- =============================================================================

-- Ürün bazlı satış + kâr performansı (menü mühendisliğinin temeli)
create or replace view v_item_performance as
select
  o.business_id,
  date_trunc('day', o.paid_at)              as gun,
  oi.menu_item_id,
  oi.name                                    as urun,
  oi.unit_price                              as birim_fiyat,
  oi.unit_cost                               as birim_maliyet,
  sum(oi.qty)                                as adet,
  sum(oi.qty * oi.unit_price)                as ciro,
  sum(oi.qty * oi.unit_cost)                 as maliyet,
  sum(oi.qty * (oi.unit_price - oi.unit_cost)) as brut_kar,
  case when sum(oi.qty * oi.unit_price) > 0
       then round(100 * sum(oi.qty * (oi.unit_price - oi.unit_cost))
                      / sum(oi.qty * oi.unit_price), 1)
  end                                        as kar_marji_yuzde
from order_items oi
join orders o on o.id = oi.order_id
where o.status = 'paid' and not oi.voided
group by 1,2,3,4,5,6;

-- Günlük özet: ciro, kâr, kişi başı harcama, adisyon ortalaması
create or replace view v_daily_summary as
select
  o.business_id,
  date_trunc('day', o.paid_at)        as gun,
  count(*)                             as adisyon_sayisi,
  sum(o.guest_count)                   as kisi_sayisi,
  sum(o.total)                         as ciro,
  sum(o.total_cost)                    as maliyet,
  sum(o.total - o.total_cost)          as brut_kar,
  sum(o.discount_amount)               as toplam_indirim,
  round(avg(o.total), 2)               as ortalama_adisyon,
  case when sum(o.guest_count) > 0
       then round(sum(o.total) / sum(o.guest_count), 2) end as kisi_basi_harcama
from orders o
where o.status = 'paid'
group by 1,2;

-- Hazırlık süresi (mutfak performansı)
create or replace view v_prep_times as
select
  o.business_id,
  oi.name                                                as urun,
  oi.station,
  count(*)                                                as adet,
  round(avg(extract(epoch from (oi.ready_at - oi.sent_at)) / 60)::numeric, 1) as ort_dakika,
  round(max(extract(epoch from (oi.ready_at - oi.sent_at)) / 60)::numeric, 1) as max_dakika
from order_items oi
join orders o on o.id = oi.order_id
where oi.sent_at is not null and oi.ready_at is not null
group by 1,2,3;

-- =============================================================================
-- Güvenlik (RLS) — sadece giriş yapmış kullanıcılar erişebilir
-- Not: Tek işletme senaryosunda bu yeterli. Çok işletmeli yapıya geçilirse
--      politikalar business_id ↔ kullanıcı eşlemesine göre daraltılır.
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'businesses','staff','shifts','ingredients','ingredient_price_history',
    'categories','menu_items','extras','recipe_items',
    'orders','order_items','order_item_extras','settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists auth_all on %I', t);
    execute format(
      'create policy auth_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Gerçek zamanlı yayın (mutfak ekranı ve cihazlar arası senkron)
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table order_item_extras;
alter publication supabase_realtime add table menu_items;
