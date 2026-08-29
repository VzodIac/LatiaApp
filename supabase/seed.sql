-- =============================================================================
-- La Tía — başlangıç verisi (dünya mutfağı menüsü)
-- =============================================================================
-- schema.sql ve migrations/ ÇALIŞTIRILDIKTAN SONRA çalıştırın.
--
-- ⚠️ MENÜYÜ SIFIRLAR: mevcut kategoriler / ürünler / ekstralar silinip
--    aşağıdaki dünya mutfağı şablonu kurulur. Yanlışlıkla yüklenmiş bir menü
--    (ör. Around'un kahvaltı menüsü) tek çalıştırmayla temizlenir.
--
--    GEÇMİŞ SİPARİŞLER ETKİLENMEZ: order_items ürün adını, fiyatını ve
--    maliyetini satış anında dondurur, menu_item_id ise silinince null'a
--    düşer (on delete set null). Yani menü silinse de ciro ve kâr geçmişi
--    olduğu gibi kalır.
--
-- Ekstra yapısı Around ile aynı mantıkta çalışır, içerik farklıdır:
--   1) "Ekstra" kategorisi -> tek başına satılabilen yan ürünler (menu_items)
--   2) extras tablosu      -> ana yemeğe iliştirilen, adetlenebilen modifier'lar
--      (categories.allow_extras = true olan kategorideki ürünlere eklenir)
-- =============================================================================

do $$
declare
  b_id uuid;
  c_start uuid; c_main uuid; c_extra uuid; c_dessert uuid; c_drink uuid;
  old_items int;
begin
  -- ---- İşletme -------------------------------------------------------------
  -- Bu Supabase projesi yalnızca La Tía içindir. Başka bir adla kurulmuş bir
  -- işletme satırı varsa (ör. Around'un seed'i çalıştırıldıysa) ikinci bir
  -- işletme yaratmak yanlış olur: uygulama hangisine bağlanacağını bilemez ve
  -- menü değişiklikleri görünmez. Var olanı yeniden adlandırıyoruz.
  -- Sıralama önemli: uygulama da "adı La Tía olanların en eskisi" diyor.
  -- Sırasız limit 1, birden fazla kayıtta seed ile uygulamanın farklı
  -- işletmelere bakmasına yol açıyordu.
  select id into b_id from businesses where name = 'La Tía' order by created_at limit 1;
  if b_id is null then
    select id into b_id from businesses order by created_at limit 1;
    if b_id is null then
      insert into businesses (name) values ('La Tía') returning id into b_id;
      raise notice 'İşletme oluşturuldu.';
    else
      update businesses set name = 'La Tía' where id = b_id;
      raise notice 'Var olan işletme La Tía olarak yeniden adlandırıldı.';
    end if;
  end if;

  -- Fazladan işletme satırı kaldıysa uyar (veri silinmez, elle karar verilir)
  if (select count(*) from businesses) > 1 then
    raise warning 'Birden fazla işletme satırı var. Uygulama "La Tía" adlısına bağlanır; diğerleri kullanılmıyor.';
  end if;

  -- ---- Ayarlar -------------------------------------------------------------
  insert into settings (business_id, theme, table_count)
  values (b_id, 'light', 10)
  on conflict (business_id) do nothing;

  -- ---- Masalar -------------------------------------------------------------
  -- Migration 001 masaları "en eski işletme"ye kuruyordu; işletme kaydı birden
  -- fazlaysa masalar menüden farklı bir kayda düşüyor ve salon boş görünüyordu.
  -- Masalar artık menüyle aynı işletmeye kuruluyor.
  insert into tables (business_id, number, name, sort)
  select b_id, n, 'Masa ' || n, n
    from generate_series(1, 10) as n
  on conflict (business_id, number) do nothing;

  -- ---- Personel ------------------------------------------------------------
  if not exists (select 1 from staff where business_id = b_id) then
    insert into staff (business_id, name, pin, role, sort) values
      (b_id, 'Yönetici', '1234', 'manager', 0),
      (b_id, 'Garson', '5678', 'waiter', 1);
  end if;

  -- ---- Mevcut menüyü temizle -----------------------------------------------
  -- Sipariş geçmişi bundan etkilenmez (yukarıdaki snapshot açıklamasına bakın).
  select count(*) into old_items from menu_items where business_id = b_id;

  delete from extras      where business_id = b_id;
  delete from menu_items  where business_id = b_id;  -- categories FK: restrict
  delete from categories  where business_id = b_id;

  if old_items > 0 then
    raise notice 'Eski menü silindi (% ürün).', old_items;
  end if;

  -- ---- Kategoriler ---------------------------------------------------------
  -- station     : siparişin hangi ekrana düşeceği (kitchen = mutfak, bar = barista)
  -- allow_extras: bu kategorideki ürünlere modifier ekstra iliştirilebilir mi
  if not exists (select 1 from categories where business_id = b_id) then
    insert into categories (business_id, name, station, allow_extras, sort)
    values (b_id, 'Başlangıç', 'kitchen', false, 0) returning id into c_start;
    insert into categories (business_id, name, station, allow_extras, sort)
    values (b_id, 'Ana Yemek', 'kitchen', true,  1) returning id into c_main;
    insert into categories (business_id, name, station, allow_extras, sort)
    values (b_id, 'Ekstra',    'kitchen', false, 2) returning id into c_extra;
    insert into categories (business_id, name, station, allow_extras, sort)
    values (b_id, 'Tatlı',     'kitchen', false, 3) returning id into c_dessert;
    insert into categories (business_id, name, station, allow_extras, sort)
    values (b_id, 'İçecek',    'bar',     false, 4) returning id into c_drink;
  else
    select id into c_start   from categories where business_id = b_id and sort = 0;
    select id into c_main    from categories where business_id = b_id and sort = 1;
    select id into c_extra   from categories where business_id = b_id and sort = 2;
    select id into c_dessert from categories where business_id = b_id and sort = 3;
    select id into c_drink   from categories where business_id = b_id and sort = 4;
  end if;

  -- ---- Menü ürünleri -------------------------------------------------------
  -- Maliyet (cost) şimdilik 0; reçete girildikçe otomatik hesaplanır.
  if not exists (select 1 from menu_items where business_id = b_id) then
    insert into menu_items (business_id, category_id, name, description, price, kcal, allergens, sort) values
      -- Başlangıç
      (b_id, c_start, 'Günün Çorbası',     'Mevsim sebzeleriyle, kruton ile servis edilir', 180, 240, '{Gluten,Süt}', 0),
      (b_id, c_start, 'Bruschetta',        'Kızarmış ekşimaya ekmeği, domates, fesleğen, zeytinyağı', 240, 310, '{Gluten}', 1),
      (b_id, c_start, 'Humus & Pita',      'Nohut ezmesi, tahin, sıcak pita', 220, 380, '{Gluten,Susam}', 2),
      (b_id, c_start, 'Sezar Salata',      'Marul, parmesan, kruton, sezar sos', 320, 420, '{Gluten,Süt,Yumurta,Balık}', 3),
      (b_id, c_start, 'Nachos',            'Cheddar sos, jalapeño, guacamole, salsa', 280, 560, '{Süt}', 4),
      (b_id, c_start, 'Kalamar Tava',      'Tartar sos ve limon ile', 380, 480, '{Gluten,Yumurta,Deniz Ürünü}', 5),
      -- Ana Yemek (ürüne ekstra iliştirilebilir)
      (b_id, c_main, 'Cheeseburger',       '180 gr dana köfte, cheddar, turşu, patates kızartması', 480, 890, '{Gluten,Süt,Yumurta}', 6),
      (b_id, c_main, 'Club Sandviç',       'Tavuk, bacon, domates, marul, patates kızartması', 420, 760, '{Gluten,Yumurta}', 7),
      (b_id, c_main, 'Margherita Pizza',   'San Marzano domates, mozzarella, fesleğen', 440, 820, '{Gluten,Süt}', 8),
      (b_id, c_main, 'Penne Arrabbiata',   'Acılı domates sos, sarımsak, parmesan', 380, 640, '{Gluten,Süt}', 9),
      (b_id, c_main, 'Tavuk Fajita',       'Tortilla, közlenmiş biber, soğan, guacamole', 460, 710, '{Gluten,Süt}', 10),
      (b_id, c_main, 'Beef Wrap',          'Dana bonfile, cheddar, karamelize soğan', 430, 690, '{Gluten,Süt}', 11),
      (b_id, c_main, 'Pad Thai',           'Pirinç eriştesi, yer fıstığı, tamarind sos', 450, 620, '{Yer Fıstığı,Yumurta,Soya}', 12),
      (b_id, c_main, 'Izgara Somon',       'Sebze garnitür, limon beurre blanc', 620, 540, '{Balık,Süt}', 13),
      -- Ekstra: menüden tek başına eklenebilen yan ürünler
      (b_id, c_extra, 'Patates Kızartması',      'Porsiyon',            140, 380, '{}', 14),
      (b_id, c_extra, 'Tatlı Patates Kızartması','Porsiyon',            170, 400, '{}', 15),
      (b_id, c_extra, 'Soğan Halkası',           '8 adet',              150, 420, '{Gluten,Süt}', 16),
      (b_id, c_extra, 'Sarımsaklı Ekmek',        'Tereyağı ve maydanoz ile', 90, 260, '{Gluten,Süt}', 17),
      (b_id, c_extra, 'Mevsim Salata',           'Küçük porsiyon',      120, 110, '{}', 18),
      (b_id, c_extra, 'Izgara Sebze',            'Kabak, biber, patlıcan', 160, 150, '{}', 19),
      (b_id, c_extra, 'Ekstra Köfte',            '90 gr dana',          180, 260, '{}', 20),
      (b_id, c_extra, 'Izgara Tavuk',            '100 gr',              160, 190, '{}', 21),
      (b_id, c_extra, 'Bacon',                   '2 dilim',             120, 180, '{}', 22),
      (b_id, c_extra, 'Guacamole',               '',                    110, 170, '{}', 23),
      (b_id, c_extra, 'Cheddar Sos',             '',                    60,  120, '{Süt}', 24),
      (b_id, c_extra, 'Trüf Mayonez',            '',                    70,  140, '{Yumurta}', 25),
      -- Tatlı
      (b_id, c_dessert, 'Cheesecake',      'Frambuaz sos ile', 260, 450, '{Gluten,Süt,Yumurta}', 26),
      (b_id, c_dessert, 'Brownie',         'Sıcak brownie, vanilyalı dondurma', 240, 520, '{Gluten,Süt,Yumurta}', 27),
      (b_id, c_dessert, 'Tiramisu',        'Mascarpone, espresso, kakao', 270, 430, '{Gluten,Süt,Yumurta}', 28),
      (b_id, c_dessert, 'Künefe',          'Antep fıstığı ile', 290, 610, '{Gluten,Süt,Antep Fıstığı}', 29),
      -- İçecek
      (b_id, c_drink, 'Espresso',              '', 110, null, '{}', 30),
      (b_id, c_drink, 'Americano',             '', 130, null, '{}', 31),
      (b_id, c_drink, 'Latte',                 '', 160, null, '{Süt}', 32),
      (b_id, c_drink, 'Cappuccino',            '', 160, null, '{Süt}', 33),
      (b_id, c_drink, 'Türk Kahvesi',          '', 120, null, '{}', 34),
      (b_id, c_drink, 'Bardak Çay',            '', 50,  null, '{}', 35),
      (b_id, c_drink, 'Bitki Çayı',            '', 90,  null, '{}', 36),
      (b_id, c_drink, 'Limonata',              '', 140, null, '{}', 37),
      (b_id, c_drink, 'Taze Portakal Suyu',    '', 170, null, '{}', 38),
      (b_id, c_drink, 'Milkshake',             'Çikolata / vanilya / çilek', 200, null, '{Süt}', 39),
      (b_id, c_drink, 'Kola',                  '', 100, null, '{}', 40),
      (b_id, c_drink, 'Soda',                  '', 60,  null, '{}', 41),
      (b_id, c_drink, 'Su',                    '', 40,  null, '{}', 42);
  end if;

  -- ---- Ana yemeğe iliştirilen ekstralar (modifier) --------------------------
  -- Serviste ürünün altında adetlenerek seçilir; mutfak fişinde ürünün altında
  -- görünür ve hesapta ayrı satır olarak yazılır.
  if not exists (select 1 from extras where business_id = b_id) then
    insert into extras (business_id, name, price, sort) values
      (b_id, 'Ekstra Cheddar',      70,  0),
      (b_id, 'Ekstra Köfte',        180, 1),
      (b_id, 'Izgara Tavuk',        160, 2),
      (b_id, 'Çift Bacon',          120, 3),
      (b_id, 'Avokado',             90,  4),
      (b_id, 'Karamelize Soğan',    50,  5),
      (b_id, 'Jalapeño',            60,  6),
      (b_id, 'Trüf Mayonez',        70,  7),
      (b_id, 'Glutensiz Ekmek',     75,  8);
  end if;

  raise notice 'La Tía hazır: %', b_id;
end $$;

-- Sonucu göster (Supabase editörü NOTICE satırlarını göstermiyor)
select
  b.name                                                           as isletme,
  (select count(*) from categories c where c.business_id = b.id)   as kategori,
  (select count(*) from menu_items m where m.business_id = b.id)   as urun,
  (select count(*) from extras     e where e.business_id = b.id)   as ekstra,
  (select count(*) from tables     t where t.business_id = b.id)   as masa,
  (select count(*) from staff      s where s.business_id = b.id)   as personel
from businesses b;
