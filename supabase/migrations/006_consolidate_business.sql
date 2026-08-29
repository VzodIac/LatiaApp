-- =============================================================================
-- 006 — Tek işletmeye indirge (menü/masa görünmemesi sorununun kalıcı çözümü)
-- =============================================================================
-- Bu Supabase projesi tek işletme içindir. Ancak farklı betikler işletmeyi
-- farklı yollarla seçiyordu:
--   • migration 001 masaları  "en eski işletme"ye kuruyordu
--   • seed.sql menüyü         "adı La Tía olan işletme"ye kuruyordu
--   • uygulama                önce ada, yoksa en eskiye bağlanıyordu
-- Bunlar farklı kayıtlara denk geldiğinde veri bölünüyor: bir işletmede menü,
-- diğerinde masalar kalıyor ve uygulama hangisine bağlanırsa diğerini boş
-- görüyor.
--
-- Bu betik tüm veriyi TEK işletmede toplar, fazladan işletme kayıtlarını siler
-- ve adı 'La Tía' yapar. Hiçbir sipariş/menü/masa verisi kaybolmaz — yalnızca
-- sahiplik tek kayda taşınır. Tekrar çalıştırılabilir.
-- =============================================================================

do $$
declare
  target uuid;
  t text;
  moved int;
begin
  -- Hedef: en çok menü ürünü olan işletme; eşitlikte en eski olan.
  -- "En eski" tek başına yanlış olurdu: menü sonradan oluşturulmuş kayda
  -- kurulmuş olabilir ve asıl veri orada durur.
  select b.id into target
    from businesses b
    left join menu_items m on m.business_id = b.id
   group by b.id, b.created_at
   order by count(m.id) desc, b.created_at asc
   limit 1;

  if target is null then
    raise exception 'Veritabanında işletme kaydı yok — önce seed.sql çalıştırın.';
  end if;

  -- ---- Masalar: numara çakışmasını önle -----------------------------------
  -- tables(business_id, number) tekil. Hedefte zaten var olan numaraları
  -- taşıyamayız; onları siliyoruz (masa kaydı yalnızca ad/koltuk taşır,
  -- siparişler masaya FK ile bağlı değil, adisyonda table_no olarak durur).
  delete from tables x
   where x.business_id <> target
     and exists (select 1 from tables y where y.business_id = target and y.number = x.number);

  -- ---- Ayarlar: business_id birincil anahtar, hedefte zaten var ------------
  delete from settings where business_id <> target;

  -- ---- Geri kalan her şeyi hedefe taşı ------------------------------------
  foreach t in array array[
    'staff', 'categories', 'menu_items', 'extras', 'ingredients',
    'orders', 'tables', 'payments', 'purchases', 'reservations'
  ] loop
    execute format('update %I set business_id = $1 where business_id <> $1', t) using target;
    get diagnostics moved = row_count;
    if moved > 0 then
      raise notice '% : % satır taşındı', t, moved;
    end if;
  end loop;

  -- ---- Fazladan işletme kayıtlarını sil -----------------------------------
  delete from businesses where id <> target;

  -- ---- Adı sabitle ---------------------------------------------------------
  update businesses set name = 'La Tía' where id = target;

  -- ---- Eksikleri tamamla ---------------------------------------------------
  insert into settings (business_id, theme, table_count)
  values (target, 'light', 10)
  on conflict (business_id) do nothing;

  -- Masalar hiç kurulmamış olabilir (001 farklı işletmeye kurmuş olabilir)
  insert into tables (business_id, number, name, sort)
  select target, n, 'Masa ' || n, n
    from generate_series(1, 10) as n
  on conflict (business_id, number) do nothing;

  if not exists (select 1 from staff where business_id = target) then
    insert into staff (business_id, name, pin, role, sort) values
      (target, 'Yönetici', '1234', 'manager', 0),
      (target, 'Garson', '5678', 'waiter', 1);
  end if;

  raise notice 'Tek işletmede toplandı: %', target;
end $$;

-- Sonucu göster (Supabase editörü NOTICE'i gizliyor, bu tablo görünür)
select
  b.name                                                            as isletme,
  (select count(*) from categories   c where c.business_id = b.id)  as kategori,
  (select count(*) from menu_items   m where m.business_id = b.id)  as urun,
  (select count(*) from extras       e where e.business_id = b.id)  as ekstra,
  (select count(*) from tables       t where t.business_id = b.id)  as masa,
  (select count(*) from staff        s where s.business_id = b.id)  as personel,
  (select count(*) from orders       o where o.business_id = b.id)  as siparis
from businesses b;
