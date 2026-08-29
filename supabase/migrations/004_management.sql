-- =============================================================================
-- 004 — Yönetim paneli: bahşiş havuzu, alımlar (maliyet girdisi), rezervasyon
-- =============================================================================
-- 003'ten sonra bir kez çalıştırın. Tekrar çalıştırılabilir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bahşiş — havuz modeli
-- Bahşiş ödeme anında tahsil edilir, bu yüzden asıl kayıt payments üzerinde.
-- orders.tip_total rapor kolaylığı için toplamı taşır.
--
-- NOT: Uygulama yalnızca GİRİLEN bahşişi kaydeder. Kartlı bahşişin gerçek
-- tahsilatı POS/banka tarafındadır; mutabakat oradan yapılmalıdır.
-- ---------------------------------------------------------------------------
alter table payments add column if not exists tip numeric(12,2) not null default 0;
alter table orders   add column if not exists tip_total numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------------
-- 2) Alımlar — e-faturaya giden yolun ilk adımı
--
-- e-Fatura entegrasyonunun zor kısmı bağlantı değil, fatura satırını kendi
-- malzemene eşleştirmek ("KAŞAR PEYNIRI 1KG VAKUM" -> kaşar / gram). Bu tablo
-- önce manuel/fiş girişini toplar; entegratör bağlandığında aynı tabloya
-- source='efatura' ile yazılır, raporlar değişmez.
-- ---------------------------------------------------------------------------
create table if not exists purchases (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  ingredient_id   uuid references ingredients(id) on delete set null,
  ingredient_name text not null,                     -- snapshot
  supplier        text,
  doc_no          text,                              -- fatura / fiş no
  source          text not null default 'manual',    -- manual | efatura
  qty             numeric(12,4) not null,            -- temel birimde miktar
  unit            text not null default 'g',
  total           numeric(12,2) not null,            -- ödenen toplam
  unit_cost       numeric(12,4) not null,            -- total / qty
  purchased_at    timestamptz not null default now(),
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists purchases_business_idx on purchases(business_id, purchased_at desc);
create index if not exists purchases_ingredient_idx on purchases(ingredient_id, purchased_at desc);

-- ---------------------------------------------------------------------------
-- 3) Rezervasyon
-- ---------------------------------------------------------------------------
create table if not exists reservations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  guest_name   text not null,
  phone        text,
  reserved_at  timestamptz not null,
  guest_count  int not null default 2,
  table_no     int,
  status       text not null default 'booked',       -- booked | seated | noshow | cancelled
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists reservations_business_idx on reservations(business_id, reserved_at);

-- ---------------------------------------------------------------------------
-- 4) Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table reservations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table purchases;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['purchases','reservations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists auth_all on %I', t);
    execute format(
      'create policy auth_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Bahşiş havuzu görünümü
-- Havuz modelinde bahşiş garsona değil işletmeye gelir ve sonra paylaşılır;
-- bu yüzden garson kırılımı "kim ne kadar topladı" bilgisidir, hak edişi değil.
-- ---------------------------------------------------------------------------
create or replace view v_tip_pool as
select
  p.business_id,
  date_trunc('day', p.paid_at) as gun,
  p.staff_name                 as garson,
  count(*)                     as tahsilat,
  sum(p.tip)                   as bahsis,
  sum(p.amount)                as ciro
from payments p
where p.tip > 0
group by 1, 2, 3;

-- ---------------------------------------------------------------------------
-- 7) Malzeme alım maliyeti görünümü — reçete kârlılığının girdisi
-- ---------------------------------------------------------------------------
create or replace view v_purchase_costs as
select
  pu.business_id,
  pu.ingredient_id,
  pu.ingredient_name             as malzeme,
  count(*)                       as alim_adedi,
  sum(pu.total)                  as toplam_harcama,
  sum(pu.qty)                    as toplam_miktar,
  min(pu.unit_cost)              as en_dusuk_birim,
  max(pu.unit_cost)              as en_yuksek_birim,
  case when sum(pu.qty) > 0 then round(sum(pu.total) / sum(pu.qty), 4) end as ortalama_birim,
  max(pu.purchased_at)           as son_alim
from purchases pu
group by 1, 2, 3;
