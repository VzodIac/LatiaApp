# La Tía

La Tía için **yönetim sistemi**. Kağıt adisyonun yerine geçer: garson siparişi telefondan alır, mutfak hazırlığı ekrandan takip eder, masanın ödeyeceği tutar anında görünür, gün sonu ciro ve maliyet geçmişi kayıt altına alınır.

**v2 ile birlikte çok cihazlı ve bulut senkronlu:** telefonlar, tabletler, PC ve mutfak ekranı aynı veriyi gerçek zamanlı paylaşır. Her cihaz tarayıcıdan çalışır (PWA — "Ana Ekrana Ekle" ile uygulama gibi açılır), App Store gerekmez.

> 👉 Son kullanıcı için adım adım rehber: **[KULLANIM.md](KULLANIM.md)**
> 🗺️ Yapılacaklar ve bilinen eksikler: **[TODO.md](TODO.md)**

## Durum

⚠️ **Bu proje henüz kuruluma hazır bir kopyadır.** Çalışması için kendi Supabase
projesi ve Vercel dağıtımı gerekir — adımlar aşağıdaki *Kurulum* bölümünde.
Bağlantı bilgileri girilene kadar uygulama bir kurulum ekranı gösterir.

Kurulduktan sonra üç bölüm ayrı birer PWA olarak eklenebilir:
`/` (bölüm seçimi) · `/servis` (garson) · `/kitchen` (mutfak)

---

## Özellikler

**Sipariş / servis**
- Masa, isim ve paket adisyonları; masa adları işletmeye göre değiştirilebilir ("Masa 3" → "Teras 1")
- Menüden ürün ekleme, adet, ürün notu, ürüne iliştirilen ekstralar (ör. ekmek üstüne 2 yumurta)
- Ekstralar aynı zamanda tek başına satılabilen menü kategorisi olarak da mevcut

**Ödeme**
- Tüm hesabı kapatma **veya kişi bazlı kısmi ödeme**: adisyondaki ürünler seçilerek ayrı ayrı ödenir, kalan açık kalır
- İndirim/ikram (%10 / %15 / ikram) — kısmi ödemelerde oransal yansır
- **İkram gerekçesi zorunlu:** sabit sebep listesi (tanıdık, şikayet, personel yemeği…) + serbest açıklama; gerekçesiz hesap kapanmaz
- **Kişi sayısı:** adisyon başına misafir sayısı — kişi başı harcama analizinin girdisi
- Eşit bölme, nakit/kart, fiş ekranı

**Menü & maliyet**
- Ürün, kategori, fiyat yönetimi; "tükendi" işareti; ondalıklı fiyat desteği
- **Malzeme (reçete) tabanlı maliyet:** malzeme birim maliyetinden ürün maliyeti otomatik hesaplanır
- **Malzeme fiyat geçmişi** — zam/indirim tarihçesi saklanır
- Alerjen ve kalori bilgisi (veride tutulur; düzenleme arayüzü [TODO](TODO.md))

**Raporlama**
- Gün Sonu: ciro, ortalama adisyon, **kişi başı harcama**, kapanan/kişi/aktif/ürün sayıları, saatlik ve günlük grafik
- **En çok satanlar** — Tümü / Yiyecek / İçecek kırılımı, satış anındaki kategori adıyla
- **Garson performansı** — ciro sıralaması, adisyon sayısı, kişi başı harcama ve ikram oranı birlikte
- **İkram & indirim dökümü** — gerekçe bazında tutar ve pay (kâr sızıntısı takibi)
- Bugün / Dün / Bu Hafta + serbest tarih aralığı
- Veritabanında hazır analiz görünümleri: ürün kârlılığı, günlük özet, hazırlık süreleri

**Mutfak ekranı (KDS)**
- `/kitchen` adresinden açılır; **ayrı bir PWA** olarak kurulur (kendi manifesti, adı ve ters renkli ikonu)
- Bekleme süresine göre renklenen sipariş kartları, ürün bazlı durum akışı (Bekliyor → Hazırlanıyor → Hazır)
- Mutfak/bar istasyon filtresi, toplu üretim için bekleyen ürün sayacı, ürün reçetesini görüntüleme
- Cihaz bazlı dil ve tema ayarı; yatay ve dikey yerleşim

**Bildirim & çıktı**
- Yeni sipariş mutfağa, hazır sipariş garsona: sesli uyarı + ekran bildirimi + arka planda sistem bildirimi
- 80 mm termal yazıcı fiş çıktısı (fiş ekranından ve geçmiş adisyondan yeniden yazdırma)

**Sistem**
- Cihaz girişi (işletme hesabı) + garson PIN'i olmak üzere iki katmanlı kimlik
- Gerçek zamanlı senkron, Türkçe/İngilizce, açık/koyu tema (dil ve tema cihaz tercihidir)
- iOS güvenli alan uyumu

---

## Kullanılan teknolojiler

| Katman | Teknoloji | Rolü |
|--------|-----------|------|
| Derleme / dil | **Vite + TypeScript** | Hızlı geliştirme, üretim derlemesi, tip güvenliği |
| Arayüz | **React 18** | Bileşen tabanlı UI |
| Global durum | **Zustand** | Uygulama state'i ve iş mantığı |
| Veritabanı | **Supabase (PostgreSQL)** | Tüm veri; SQL ile analiz |
| Senkron | **Supabase Realtime** | Cihazlar arası anlık güncelleme (websocket) |
| Kimlik | **Supabase Auth** | Cihazın veriye erişim yetkisi |
| PWA | **vite-plugin-pwa (Workbox)** | manifest, service worker, "ana ekrana ekle" |
| İkon üretimi | **sharp** (yalnız geliştirmede) | Marka ikonlarının üretilmesi |
| Barındırma | **Vercel** | Statik dosyalar + otomatik dağıtım |

---

## Mimari

```
                    Supabase (PostgreSQL + Realtime + Auth)
                    ┌────────────────────────────────────┐
                    │  Tek doğruluk kaynağı               │
                    │  siparişler · menü · reçete · ödeme │
                    └──────────────┬─────────────────────┘
                                   │ realtime (anlık push)
       ┌───────────┬───────────────┼──────────────┬──────────────┐
   Garson tel.  Garson tel.   PC (yönetim)    Tabletler    Mutfak ekranı
                        — hepsi aynı PWA, tarayıcıdan —
```

### Veri erişiminin tek kapısı

Arayüz veritabanını doğrudan tanımaz; her okuma/yazma `src/data/remote.ts` üzerinden geçer. Bu katman, Postgres'teki **normalize tablolar** (analiz için) ile uygulamanın **gömülü sipariş modeli** (arayüz için) arasındaki çeviriyi yapar. Backend değiştirmek gerekirse dokunulacak tek yer burasıdır.

### Kâr analizi için kritik tasarım kararları

- **Satış anı snapshot'ı:** Her sipariş satırına o günkü fiyat *ve* maliyet yazılır. Sonradan zam yapılsa bile geçmiş kâr marjı bozulmaz.
- **Satırlar ayrı tabloda:** `order_items` normalize olduğu için ürün bazlı ciro/kâr/adet sorguları doğrudan SQL ile çalışır.
- **Maliyet zinciri otomatik:** Malzeme fiyatı değişince hem fiyat geçmişine kayıt düşer hem o malzemeyi kullanan ürünlerin maliyeti tetikleyiciyle yeniden hesaplanır.
- **KDS durumu korunur:** Sipariş satırları `uid` ile upsert edilir; garson yeni ürün eklediğinde mutfağın "hazır" işareti kaybolmaz.

### Kimlik modeli

```
Cihaz hesabı (e-posta + şifre)  → cihazın veriye erişim izni, bir kez girilir
        └─ Garson PIN'i          → vardiyada kim sipariş aldı, hızlı geçiş
```

Bu ayrım sayesinde garson eklemek/çıkarmak uygulama içinden yapılır; cihaz kaybolursa erişimi Supabase panelinden kesilir.

---

## Proje yapısı

```
src/
  i18n/         # Türkçe/İngilizce sözlük (Türkçe metin = anahtar)
  types/        # domain modelleri
  data/remote.ts# Supabase veri katmanı (tek veri erişim noktası)
  lib/          # supabase istemcisi, para/tarih/hesap/rapor yardımcıları
  store/        # Zustand global state + iş mantığı
  theme/        # renk tokenları (açık/koyu) + global stiller
  components/   # paylaşılan UI (Sheet, TabBar, Toast, ...)
  features/     # auth, orders, order-detail, payment, menu, dashboard, settings
supabase/
  schema.sql            # veritabanı şeması + tetikleyiciler + analiz görünümleri
  seed.sql              # işletme, personel, menü başlangıç verisi
  migrations/           # sonradan eklenen şema değişiklikleri
index.html      # bölüm seçimi (ileride yönetim paneli)
servis.html     # servis uygulaması (ayrı PWA girişi)
kitchen.html    # mutfak ekranı (ayrı PWA girişi)
public/         # ikonlar, kitchen.webmanifest
scripts/        # gen-brand.mjs (logo ve ikon üretimi)
design/         # ilk tasarım prototipi (referans)
brand/          # La Tía logosu (ikon üretiminin kaynağı)
TODO.md         # yapılacaklar ve bilinen eksikler
```

---

## Kurulum (yeni bir işletme için)

1. [supabase.com](https://supabase.com) üzerinde proje oluştur (bölge: Frankfurt)
2. **SQL Editor**'da sırayla çalıştır: `supabase/schema.sql` → `supabase/seed.sql` → `supabase/migrations/*.sql`
3. **Authentication → Users**'tan bir işletme hesabı oluştur (Auto Confirm açık)
4. `src/lib/supabase.ts` içindeki proje URL'i ve publishable anahtarı güncelle (veya `.env` ile geçersiz kıl)
5. Vercel'e bağla — `main`'e her push otomatik yayınlanır

> Not: Publishable anahtar tarayıcıda çalışmak üzere tasarlanmıştır ve derlenen JS içinde zaten görünür. Veriyi koruyan şey bu anahtar değil, veritabanındaki RLS kurallarıdır: giriş yapmamış hiçbir istek veri okuyamaz/yazamaz.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # üretim derlemesi (dist/)
npm run preview
npm run typecheck
```

Logo ve ikonları yeniden üretmek için: `node scripts/gen-brand.mjs`

---

## Sürüm geçmişi

- **v0.1** — Around Yönetim Sistemi tabanından kopyalandı; La Tía markası,
  renk paleti ve başlangıç menüsü uyarlandı. Supabase kurulumu bekliyor.

## Yol haritası

Ayrıntılı liste **[TODO.md](TODO.md)** dosyasındadır. Başlıklar:

1. **Rol bazlı hesaplar ve veri izolasyonu** — mutfak cihazı ciroyu görmemeli (öncelikli)
2. **Aşama 3: Yönetim paneli** — menü mühendisliği, ürün kârlılığı, maliyet takibi
3. Veritabanında hazır olup arayüzü eksik alanlar (kişi sayısı, vardiya, alerjen düzenleme…)
4. Çevrimdışı yazma kuyruğu
