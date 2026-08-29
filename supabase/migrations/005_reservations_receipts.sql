-- =============================================================================
-- 005 — Rezervasyon çakışma engeli + fiş fotoğrafı arşivi
-- =============================================================================
-- 004'ten sonra bir kez çalıştırın. Tekrar çalıştırılabilir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Rezervasyon süresi
-- Çakışma "aynı dakika" değil "aynı oturum" üzerinden hesaplanmalı: 19:00'daki
-- masaya 19:30 için ikinci rezervasyon verilemez.
-- ---------------------------------------------------------------------------
alter table reservations add column if not exists duration_min int not null default 90;

-- ---------------------------------------------------------------------------
-- 2) Aynı masaya çakışan rezervasyon engeli
--
-- Kontrol yalnızca arayüzde yapılsaydı iki cihaz aynı anda kaydettiğinde
-- ikisi de geçerdi. Exclusion constraint bunu veritabanı düzeyinde keser.
-- İptal ve gelmedi durumundakiler masayı işgal etmez.
--
-- Bitiş zamanı ayrı bir kolonda tutuluyor: "reserved_at + interval" ifadesi
-- IMMUTABLE değildir (yaz saati için zaman dilimi ayarına bakar) ve bu yüzden
-- doğrudan indeks/kısıt ifadesinde kullanılamaz. Trigger kolonu güncel tutar.
-- ---------------------------------------------------------------------------
create extension if not exists btree_gist;

alter table reservations add column if not exists ends_at timestamptz;

create or replace function reservations_set_ends_at() returns trigger
language plpgsql as $fn$
begin
  new.ends_at := new.reserved_at + make_interval(mins => new.duration_min);
  return new;
end;
$fn$;

drop trigger if exists trg_reservations_ends_at on reservations;
create trigger trg_reservations_ends_at
  before insert or update on reservations
  for each row execute function reservations_set_ends_at();

-- Var olan kayıtlar için doldur
update reservations
   set ends_at = reserved_at + make_interval(mins => duration_min)
 where ends_at is null;

alter table reservations alter column ends_at set not null;

-- Kısıt konmadan önce var olan çakışmalar temizlenmeli: kural yokken aynı
-- masaya aynı saate birden fazla rezervasyon girilebiliyordu. Çakışanlardan
-- EN ESKİSİ korunur, sonrakiler "iptal" işaretlenir — kayıt silinmez, iptal
-- olanlar masayı işgal etmediği için kısıt geçer. İstemediklerini uygulamadan
-- tek dokunuşla silebilirsin.
do $clean$
declare
  n int;
  toplam int := 0;
begin
  loop
    update reservations
       set status = 'cancelled'
     where id = (
       select r.id
         from reservations r
        where r.table_no is not null
          and r.status in ('booked', 'seated')
          and exists (
            select 1
              from reservations o
             where o.id <> r.id
               and o.business_id = r.business_id
               and o.table_no = r.table_no
               and o.status in ('booked', 'seated')
               and tstzrange(o.reserved_at, o.ends_at) && tstzrange(r.reserved_at, r.ends_at)
               and (o.created_at, o.id) < (r.created_at, r.id)
          )
        order by r.created_at, r.id
        limit 1
     );
    get diagnostics n = row_count;
    exit when n = 0;
    toplam := toplam + n;
  end loop;

  if toplam > 0 then
    raise notice 'Çakışan % rezervasyon iptal olarak işaretlendi.', toplam;
  end if;
end;
$clean$;

alter table reservations drop constraint if exists reservations_no_overlap;
alter table reservations add constraint reservations_no_overlap
  exclude using gist (
    business_id with =,
    table_no with =,
    tstzrange(reserved_at, ends_at) with &&
  ) where (table_no is not null and status in ('booked', 'seated'));

-- ---------------------------------------------------------------------------
-- 3) Fiş fotoğrafı
-- Fotoğraf storage'da durur, satırda yalnızca yolu tutulur.
-- Otomatik okuma (OCR / e-fatura) henüz yok; fotoğraf şimdiden arşivlenirse
-- okuma devreye girdiğinde geçmiş fişler de işlenebilir.
-- ---------------------------------------------------------------------------
alter table purchases add column if not exists receipt_path text;

-- ---------------------------------------------------------------------------
-- 4) Fiş fotoğrafları için depolama kovası (gizli)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receipts_auth_all on storage.objects;
create policy receipts_auth_all on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts')
  with check (bucket_id = 'receipts');
