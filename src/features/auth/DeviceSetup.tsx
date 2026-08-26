import { useState } from 'react';
import { signInDevice } from '@/lib/supabase';
import { Signature } from '@/components/Signature';
import { Logo } from '@/components/Logo';
import { NotificationSetting } from '@/components/NotificationSetting';
import { inputStyle, primaryBtn } from '@/components/ui';
import { useT } from '@/i18n/useT';

/**
 * Cihaz kurulumu — her cihazda bir kez yapılır.
 * İşletme hesabıyla giriş yapılır, oturum cihazda saklanır. Garson PIN'i
 * bunun üzerinde ayrı bir katmandır (kim çalışıyor sorusu).
 */
export function DeviceSetup({ onDone }: { onDone: () => void }) {
  const tr = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Giriş başarılı olduktan sonra bildirim izni adımı gösterilir
  const [step, setStep] = useState<'login' | 'notify'>('login');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(tr('E-posta ve şifre gerekli'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await signInDevice(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes('invalid')
          ? tr('E-posta veya şifre hatalı')
          : tr('Giriş yapılamadı: {msg}', { msg: error.message }),
      );
      return;
    }
    setStep('notify');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn .25s',
      }}
    >
      <div className="scr" style={{ flex: 1, overflowY: 'auto', padding: '60px 26px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo height={56} variant="full" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg2)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>
            {step === 'notify' ? tr('Bildirimler') : tr('Cihaz Girişi')}
          </div>
        </div>

        {step === 'notify' ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', textAlign: 'center', marginBottom: 6 }}>
              ✓ {tr('Cihaz bağlandı')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5, textAlign: 'center', marginBottom: 16 }}>
              {tr('Sipariş hazır olduğunda haberdar olmak için bildirimlere izin ver. Bunu sonradan Ayarlar\'dan da açıp kapatabilirsin.')}
            </div>

            <NotificationSetting compact />

            <button onClick={onDone} style={{ ...primaryBtn, marginTop: 16 }}>
              {tr('Devam Et')}
            </button>
          </>
        ) : (
          <>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 15, marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
            {tr('Bu cihazı işletmeye bağlamak için bir kez giriş yap. Sonrasında uygulama doğrudan açılır ve diğer cihazlarla senkron çalışır.')}
          </div>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={tr('İşletme e-postası')}
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder={tr('Şifre')}
          type="password"
          style={{ ...inputStyle, marginBottom: 14 }}
        />

        {error && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button onClick={() => void submit()} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? tr('Bağlanıyor…') : tr('Cihazı Bağla')}
        </button>
          </>
        )}
      </div>
      <Signature style={{ flex: 'none', padding: '0 0 30px' }} />
    </div>
  );
}
