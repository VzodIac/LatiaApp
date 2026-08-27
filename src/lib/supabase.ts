import { createClient } from '@supabase/supabase-js';

/**
 * Supabase istemcisi.
 *
 * La Tía'nın kendi Supabase projesine bağlıdır — Around'un veritabanıyla
 * hiçbir ilgisi yoktur. Her işletmenin veritabanı ayrıdır.
 *
 * Buradaki "publishable" anahtar tarayıcıda çalışmak üzere tasarlanmıştır ve
 * derlenen JS içinde zaten görünür. Veriyi koruyan şey bu anahtar değil,
 * veritabanındaki RLS kurallarıdır: giriş yapmamış hiçbir istek veri
 * okuyamaz/yazamaz.
 */
const RAW_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://rmoswcyylususkyeumxd.supabase.co';
const RAW_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_zRx987QZfkImTx6YxISaqg_NhaxCK-6';

/** Bağlantı bilgileri girilmiş mi — girilmemişse uygulama kurulum ekranı gösterir */
export const isConfigured = /^https:\/\/.+\.supabase\.co\/?$/.test(RAW_URL) && RAW_KEY.length > 20;

// Bilgiler girilmemişken de geçerli bir URL veriyoruz: createClient geçersiz
// URL'de hata fırlatıp uygulamayı komple çökertiyor, ekran bembeyaz kalıyordu.
const SUPABASE_URL = isConfigured ? RAW_URL : 'https://placeholder.supabase.co';
const SUPABASE_KEY = isConfigured ? RAW_KEY : 'placeholder-key-not-configured-yet';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** Cihaz bu işletmeye giriş yapmış mı? */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Cihaz kurulumu: işletme hesabıyla bir kez giriş yapılır, oturum saklanır */
export async function signInDevice(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutDevice() {
  return supabase.auth.signOut();
}
