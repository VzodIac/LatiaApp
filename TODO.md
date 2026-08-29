# La Tía — Yapılacaklar / Future Works

Bu dosya, bilinen eksikleri ve planlanan işleri tutar. Öncelik sırasına göre
yazılmıştır; her madde neden gerektiğini de açıklar ki sonradan bakan kişi
kararı yeniden düşünmek zorunda kalmasın.

Durum: `v0.1` · Around tabanından kopyalandı, kurulum bekliyor

---

## 🚀 Önce yapılacak (kurulum)

- [ ] Supabase projesi aç (bölge: Frankfurt)
- [ ] `supabase/schema.sql` → `seed.sql` → `migrations/*.sql` çalıştır
- [ ] İşletme hesabı oluştur (Authentication → Users, Auto Confirm açık)
- [ ] `src/lib/supabase.ts` içine Project URL ve publishable anahtarı yaz
- [ ] **La Tía'nın gerçek menüsünü gir** — seed'deki ürünler örnektir
- [ ] Masa adlarını ve sayısını ayarla (Ayarlar → Masalar)
- [ ] Vercel'e bağla ve yayınla
- [ ] Logonun ikinci/üçüncü sayfasındaki varyantları incele (tek renk marka
      işareti varsa ikonlarda kullanılabilir)

---

## 🔴 Öncelikli

### 1. Rol bazlı hesaplar ve veri izolasyonu

**Sorun:** Şu anda tüm cihazlar **tek bir işletme hesabını** paylaşıyor. Mutfak
tabletindeki oturumla `/servis` adresi açılırsa ciro, kâr ve gün sonu verileri
görülebiliyor. Küçük bir ekipte pratik bir sorun çıkarmayabilir ama yetki
ayrımı olmaması yapısal bir açık.

**Yapılacak:**
- Supabase Auth'ta rol başına ayrı hesap: `servis`, `mutfak`, `yonetim`
- Kullanıcı ↔ rol eşlemesi için tablo (ör. `device_roles`) veya JWT özel iddiası
- RLS politikalarını role göre daraltmak:
  - **mutfak:** açık siparişleri okuma + `order_items.status` güncelleme. Tutar,
    ödeme ve rapor tablolarına erişim yok.
  - **servis:** sipariş/ödeme tam yetki, maliyet ve kârlılık alanları kapalı
  - **yonetim:** tam okuma + menü/malzeme/personel yönetimi
- Cihaz girişi ekranında rolün otomatik seçilmesi (hangi adresten açıldıysa)

**Not:** Şema bunu destekliyor (RLS açık, politikalar `authenticated` rolüne
geniş verilmiş durumda). Yapılacak iş yeni tablo değil, politika yazımı.
Aşama 3'te yönetim paneliyle birlikte ele alınması mantıklı — o noktada rol
ayrımı zaten zorunlu hale geliyor.

---

## 🟡 Aşama 3 — Yönetim paneli

Kök adres (`/`) bu panel için ayrıldı; şu an bölüm seçim ekranı duruyor.
Veri bugünden doğru toplandığı için panel **geriye dönük** çalışacak.

- **Menü mühendisliği:** popülerlik × kârlılık dörtlüsü (yıldız / iş atı /
  bilmece / köpek). Hangi ürünün fiyatı artırılmalı, hangisi menüde öne
  çıkarılmalı sorusunu cevaplar.
- **Ürün kârlılığı:** `v_item_performance` görünümü hazır — ciro, maliyet,
  brüt kâr, marj yüzdesi
- **Malzeme maliyet takibi:** `ingredient_price_history` üzerinden zam etkisi;
  "şu malzemeye gelen zam kârımı ne kadar düşürdü"
- **Personel performansı:** garson başına ciro, ortalama adisyon, kişi başı
  harcama
- **Mutfak performansı:** `v_prep_times` görünümü hazır — ürün başına ortalama
  ve en uzun hazırlık süresi
- **Kâr sızıntısı:** indirim/ikram sebepleri, iptal edilen adisyonlar
- **Ödeme kırılımı:** nakit/kart dağılımı, kısmi ödeme oranı (`v_payments`)

---

## 🟢 Veritabanında hazır, arayüzü eksik

Bu alanlar şemada ve veri modelinde mevcut; sadece ekranı yapılmadı. Ucuz
kazançlar.

| Ne | Nerede duruyor | Neden gerekli |
|---|---|---|
| **Alerjen ve kalori düzenleme** | `menu_items.allergens`, `kcal` | Seed'de dolu ama menüden düzenlenemiyor |
| **Ekstra reçetesi** | `recipe_items.extra_id` | Ekstraların maliyeti şu an 0; marj eksik hesaplanıyor |
| **Vardiya / kasa** | `shifts` tablosu | Gün sonu nakit mutabakatı (açılış/kapanış kasası) |
| **Masa bölümü** | `tables.section` | "İç Salon / Teras" ayrımı, kalabalık salonda gerekli |
| **Ürün istasyon istisnası** | `menu_items.station` | Kategoriden farklı istasyona düşmesi gereken ürünler |
| **Satır bazlı iptal sebebi** | `order_items.void_reason` | Şu an yalnızca adisyon bazında iptal var |
| **Servis sırası (course)** | `order_items.course` | Önce içecek, sonra yemek gibi akışlar |

---

## 🟠 İşletmeci geri bildiriminden gelen sıradaki işler

Sahadan gelen değerlendirmenin uygulanmayan maddeleri. v0.2.0'da 1, 5, 6 ve 7
karşılandı; kalanlar aşağıda.

| Ne | Neden | Önce cevaplanmalı |
|---|---|---|
| **Bahşiş** | Kartlı ödemede garsonlar için kritik | Havuz mu, masaya bakana mı? Mutfak pay alıyor mu? Uygulama yalnızca *beyan edileni* kaydedebilir; gerçek tahsilat POS tarafında |
| **Giriş akışı** | Açılışta garson sorulması personel devri yüksek ekipte zahmetli | Cihaz oturumu açık kalmalı, uygulama Masalar'a düşmeli, garson **ilk ürün eklenirken** seçilmeli. Atıf korunmalı — ikram sorumluluğu ve garson raporu buna dayanıyor |
| **Rezervasyon** | Akşam servisi rezervasyonla doluyorsa gerekli | Günde kaç rezervasyon? 5'in altındaysa masaya not alanı yeter, modül israf |
| **e-Fatura → maliyet** | Reçete kârlılığının beslenmesi | Hangi muhasebe programı/entegratör? Önce manuel + fiş girişi ve tedarikçi-ürün sözlüğü yapılmalı; asıl zorluk fatura satırını malzemeye eşleştirmek |

---

## 🔵 Dayanıklılık ve altyapı

- **Çevrimdışı yazma kuyruğu:** Şu an yazma işlemleri internet gerektiriyor.
  Bağlantı kesildiğinde siparişler yerelde birikip bağlantı gelince
  senkronlanmalı. (Okuma tarafı zaten önbellekli.)
- **Bağlantı durumu göstergesi:** Ayarlar'da var; ana ekranda da görünmeli ki
  garson bağlantısızlığı fark etsin
- **Veri yedeği:** Supabase otomatik yedekliyor; düzenli dışa aktarım
  (`pg_dump`) alışkanlığı ve geri yükleme provası
- **Sürüm bildirimi:** Yeni sürüm yayınlandığında kullanıcıya "yenile" uyarısı

---

## ⚪️ İyileştirmeler

- **Bildirim hedefleme:** Şu an "hazır" uyarısı tüm servis cihazlarına gidiyor.
  Siparişi alan garsonun cihazına öncelik verilebilir (`orders.waiter` biliniyor).
- **Yazıcı ayarları:** Kağıt genişliği (58/80 mm), işletme adı ve adres fiş
  altlığı şu an kodda sabit — Ayarlar'dan düzenlenebilir olmalı
- **Menü sıralama:** Ürün ve kategori sırası sürükle-bırak ile değiştirilebilsin
- **Ürün görselleri:** Menüde fotoğraf (Supabase Storage)
- **Toplu menü içe aktarma:** CSV ile fiyat güncelleme
- **Çoklu şube:** Şema `business_id` ile hazır; şube seçimi ve şubeler arası
  karşılaştırma raporu

---

## 📌 Kararlar (neden böyle yapıldı)

Sonradan sorgulanmaması için not düşülmüş kararlar:

- **Satış anı snapshot'ı:** Fiyat *ve* maliyet sipariş satırına yazılır. Zam
  yapıldığında geçmiş kâr marjı bozulmaz. Bu, sonradan eklenemeyecek bir veridir.
- **Dil ve tema cihaz tercihidir:** İşletme geneli olsaydı mutfağın seçimi
  patronun telefonunu da değiştirirdi.
- **Üç ayrı sayfa (`/`, `/servis`, `/kitchen`):** Her biri ayrı PWA olarak
  kurulabilsin diye. Manifest HTML'de sabit olmalı — iOS, çalışma anında JS ile
  değiştirilen manifesti "Ana Ekrana Ekle" sırasında dikkate almıyor.
- **Veri erişimi tek kapıdan (`src/data/remote.ts`):** Backend değiştirilmek
  istenirse dokunulacak tek dosya burasıdır.
