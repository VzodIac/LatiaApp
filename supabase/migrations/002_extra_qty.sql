-- =============================================================================
-- Migration 002 — ekstralarda adet
-- =============================================================================
-- Ekmek üstü / sandviçe iliştirilen ekstralar birden fazla seçilebilsin
-- (ör. 2 porsiyon çırpılmış yumurta).
-- Tekrar çalıştırılabilir.
-- =============================================================================

alter table order_item_extras add column if not exists qty int not null default 1;
