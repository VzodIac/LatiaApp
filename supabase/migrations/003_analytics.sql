-- =============================================================================
-- 003 — Yönetim analitiği: ikram sebebi, kişi başı harcama, garson performansı
-- =============================================================================
-- schema.sql'den sonra bir kez çalıştırın. Tekrar çalıştırılabilir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- İkram / indirim gerekçesi
-- orders.discount_reason zaten şemada vardı ama hiç yazılmıyordu. Artık sabit
-- bir sebep koduyla dolduruluyor; serbest açıklama ayrı sütunda tutulur ki
-- sebep alanı raporlanabilir kalsın.
-- ---------------------------------------------------------------------------
alter table orders add column if not exists discount_note text;

-- ---------------------------------------------------------------------------
-- Satış anındaki kategori adı (snapshot)
-- Rapor, ürünün BUGÜNKÜ kategorisine bakarsa kategori yeniden adlandırıldığında
-- veya ürün silindiğinde geçmiş bozulur. Fiyat ve maliyet gibi kategori de
-- satış anında donduruluyor.
-- ---------------------------------------------------------------------------
alter table order_items add column if not exists category_name text not null default '';

-- ---------------------------------------------------------------------------
-- Garson performansı — yönetim paneli için
-- Ciroya göre sıralama tek başına yanıltıcıdır (iyi masalara bakan kazanır),
-- bu yüzden adisyon sayısı, kişi başı harcama ve ikram oranı da veriliyor.
-- ---------------------------------------------------------------------------
create or replace view v_waiter_performance as
select
  o.business_id,
  date_trunc('day', o.paid_at)                        as gun,
  o.waiter_name                                       as garson,
  count(*)                                            as adisyon,
  sum(o.total)                                        as ciro,
  sum(o.guest_count) filter (where o.kind <> 'paket') as kisi,
  case when sum(o.guest_count) filter (where o.kind <> 'paket') > 0
       then round(sum(o.total) filter (where o.kind <> 'paket')
                / sum(o.guest_count) filter (where o.kind <> 'paket'), 2)
  end                                                 as kisi_basi,
  sum(o.discount_amount)                              as ikram,
  case when sum(o.subtotal) > 0
       then round(100 * sum(o.discount_amount) / sum(o.subtotal), 1)
  end                                                 as ikram_yuzde
from orders o
where o.status = 'paid'
group by 1, 2, 3;

-- ---------------------------------------------------------------------------
-- İkram / indirim dökümü — kâr sızıntısı analizi
-- ---------------------------------------------------------------------------
create or replace view v_discounts as
select
  o.business_id,
  date_trunc('day', o.paid_at)      as gun,
  coalesce(o.discount_reason, '—')  as sebep,
  o.discount_type                   as tip,
  count(*)                          as adet,
  sum(o.discount_amount)            as tutar
from orders o
where o.status = 'paid' and o.discount_amount > 0
group by 1, 2, 3, 4;
