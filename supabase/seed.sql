-- =============================================================================
-- La Tía — başlangıç verisi
-- =============================================================================
-- schema.sql ÇALIŞTIRILDIKTAN SONRA bir kez çalıştırın.
-- İşletmeyi, personeli ve mevcut menüyü (kahvaltı menüsü) Postgres'e kurar.
-- Tekrar çalıştırılabilir: var olan kayıtları çoğaltmaz.
-- =============================================================================

do $$
declare
  b_id uuid;
  c_food uuid; c_coffee uuid; c_tea uuid; c_dessert uuid;
begin
  -- ---- İşletme -------------------------------------------------------------
  select id into b_id from businesses where name = 'La Tía' limit 1;
  if b_id is null then
    insert into businesses (name) values ('La Tía') returning id into b_id;
  end if;

  -- ---- Ayarlar -------------------------------------------------------------
  insert into settings (business_id, theme, table_count)
  values (b_id, 'light', 10)
  on conflict (business_id) do nothing;

  -- ---- Personel ------------------------------------------------------------
  if not exists (select 1 from staff where business_id = b_id) then
    insert into staff (business_id, name, pin, role, sort) values
      (b_id, 'Yönetici', '1234', 'manager', 0),
      (b_id, 'Garson', '5678', 'waiter', 1);
  end if;

  -- ---- Kategoriler ---------------------------------------------------------
  -- station: siparişin hangi ekrana düşeceği (kitchen = mutfak, bar = barista)
  if not exists (select 1 from categories where business_id = b_id) then
    insert into categories (business_id, name, station, sort)
    values (b_id, 'Yiyecek', 'kitchen', 0) returning id into c_food;
    insert into categories (business_id, name, station, sort)
    values (b_id, 'Kahve', 'bar', 1) returning id into c_coffee;
    insert into categories (business_id, name, station, sort)
    values (b_id, 'Çay', 'bar', 2) returning id into c_tea;
    insert into categories (business_id, name, station, sort)
    values (b_id, 'Tatlı', 'kitchen', 3) returning id into c_dessert;
  else
    select id into c_food    from categories where business_id = b_id and sort = 0;
    select id into c_coffee  from categories where business_id = b_id and sort = 1;
    select id into c_tea     from categories where business_id = b_id and sort = 2;
    select id into c_dessert from categories where business_id = b_id and sort = 3;
  end if;

  -- ---- Menü ürünleri -------------------------------------------------------
  -- Maliyet (cost) şimdilik 0; reçete girildikçe otomatik hesaplanacak.
  -- ⚠️ ÖRNEK MENÜ — La Tía'nın gerçek menüsüyle değiştirilecek.
  -- Uygulamadaki Menü sekmesinden de düzenlenebilir.
  if not exists (select 1 from menu_items where business_id = b_id) then
    insert into menu_items (business_id, category_id, name, description, price, sort) values
      (b_id, c_food,  'Örnek Yiyecek 1', '', 0, 0),
      (b_id, c_food,  'Örnek Yiyecek 2', '', 0, 1),
      (b_id, c_coffee,'Espresso',        '', 0, 2),
      (b_id, c_coffee,'Americano',       '', 0, 3),
      (b_id, c_coffee,'Latte',           '', 0, 4),
      (b_id, c_tea,   'Demleme Çay',     '', 0, 5),
      (b_id, c_tea,   'Bitki Çayı',      '', 0, 6),
      (b_id, c_dessert,'Örnek Tatlı',    '', 0, 7);
  end if;

  -- ---- Ekmek üstüne iliştirilen ekstralar (modifier) ------------------------
  -- Ekstralar (ör. "ekstra shot", "laktozsuz süt") uygulamadan eklenebilir.

  raise notice 'La Tía işletmesi hazır: %', b_id;
end $$;
