import { useState } from 'react';
import { NotificationSetting } from '@/components/NotificationSetting';
import { useStore } from '@/store/useStore';
import { SectionLabel } from '@/components/Sheet';
import { Signature } from '@/components/Signature';
import { useT } from '@/i18n/useT';

export function SettingsTab() {
  const tr = useT();
  const theme = useStore((s) => s.settings.theme);
  const activeWaiter = useStore((s) => s.settings.activeWaiter);
  const waiters = useStore((s) => s.waiters);
  const businessName = useStore((s) => s.businessName);
  const menuCount = useStore((s) => s.menuItems.length);
  const setTheme = useStore((s) => s.setTheme);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const setActiveWaiter = useStore((s) => s.setActiveWaiter);
  const addWaiter = useStore((s) => s.addWaiter);
  const removeWaiter = useStore((s) => s.removeWaiter);
  const lockApp = useStore((s) => s.lockApp);
  const clearOrders = useStore((s) => s.clearOrders);
  const unlinkDevice = useStore((s) => s.unlinkDevice);
  const refresh = useStore((s) => s.refresh);
  const syncing = useStore((s) => s.syncing);
  const tables = useStore((s) => s.tables);
  const renameTable = useStore((s) => s.renameTable);
  const addTable = useStore((s) => s.addTable);
  const removeTable = useStore((s) => s.removeTable);

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  const confirmClearOrders = () => {
    if (window.confirm(tr('TÜM cihazlardaki siparişler ve gün sonu geçmişi silinecek. Menü ve garsonlar korunur. Devam edilsin mi?'))) {
      void clearOrders();
    }
  };
  const confirmUnlink = () => {
    if (window.confirm(tr('Bu cihazın işletme bağlantısı kesilecek. Tekrar kullanmak için e-posta ve şifre gerekir. Devam edilsin mi?'))) {
      void unlinkDevice();
    }
  };

  const submitWaiter = async () => {
    if (await addWaiter(newName, newPin)) {
      setNewName('');
      setNewPin('');
    }
  };

  const themeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 14,
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  const smallInput: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '11px 13px',
    fontSize: 13,
    color: 'var(--fg)',
    outline: 'none',
  };

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', margin: '2px 0 18px' }}>{tr('Ayarlar')}</div>

      <SectionLabel>{tr('Görünüm')}</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button onClick={() => setTheme('light')} style={themeBtn(theme === 'light')}>
          {tr('☀ Gündüz')}
        </button>
        <button onClick={() => setTheme('dark')} style={themeBtn(theme === 'dark')}>
          {tr('☾ Gece')}
        </button>
      </div>

      <SectionLabel>{tr('Dil')}</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button onClick={() => setLang('tr')} style={themeBtn(lang === 'tr')}>
          Türkçe
        </button>
        <button onClick={() => setLang('en')} style={themeBtn(lang === 'en')}>
          English
        </button>
      </div>

      <SectionLabel>{tr('Bildirimler')}</SectionLabel>
      <div style={{ marginBottom: 22 }}>
        <NotificationSetting />
      </div>

      <SectionLabel>{tr('Garsonlar')}</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
        {waiters.map((w) => {
          const active = activeWaiter === w.name;
          return (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
              <button onClick={() => setActiveWaiter(w.name)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', minWidth: 0 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flex: 'none',
                    borderRadius: '50%',
                    background: active ? 'var(--accent)' : 'var(--surface2)',
                    color: active ? '#fff' : 'var(--fg2)',
                    fontSize: 15,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {w.name[0]}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                    {w.name}
                    {active && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', marginLeft: 7 }}>{tr('AKTİF')}</span>}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>PIN {w.pin}</span>
                </span>
              </button>
              <button
                onClick={() => void removeWaiter(w.id)}
                aria-label={`${w.name} sil`}
                style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, color: 'var(--danger)', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tr('Garson adı')} style={{ ...smallInput, flex: 1 }} />
        <input
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="PIN"
          inputMode="numeric"
          style={{ ...smallInput, width: 72, textAlign: 'center', letterSpacing: '2px' }}
        />
        <button onClick={() => void submitWaiter()} style={{ background: 'var(--accent)', color: '#fff', padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          {tr('Ekle')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>{tr('Masalar')}</SectionLabel>
        <button onClick={() => void addTable()} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', marginBottom: 9 }}>
          {tr('+ Masa')}
        </button>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', marginBottom: 22 }}>
        {tables.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderBottom: '1px solid var(--line)' }}>
            <input
              defaultValue={t.name}
              onBlur={(e) => {
                if (e.target.value.trim() !== t.name) void renameTable(t.id, e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--fg)', padding: '4px 0' }}
            />
            <button
              onClick={() => void removeTable(t.id)}
              aria-label={`${t.name} sil`}
              style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, color: 'var(--danger)', fontSize: 18, fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        ))}
        {tables.length === 0 && <div style={{ padding: 13, fontSize: 13, color: 'var(--muted)' }}>{tr('Masa yok')}</div>}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{tr('Çoklu cihaz')}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: syncing ? 'var(--muted)' : 'var(--good)' }}>
            {syncing ? tr('Eşitleniyor…') : tr('● Bağlı')}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
          {tr('Siparişler buluta kaydedilir ve tüm cihazlarda (telefon, tablet, PC, mutfak ekranı) anında görünür.')}
        </div>
        <button
          onClick={() => void refresh()}
          style={{ marginTop: 12, width: '100%', padding: 11, borderRadius: 12, border: '1px solid var(--line)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, background: 'var(--surface2)' }}
        >
          {tr('Şimdi eşitle')}
        </button>
      </div>

      <button onClick={lockApp} style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
        {tr('Oturumu Kilitle / Garson Değiştir')}
      </button>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>{tr('Veri')}</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
            {tr('Gerçek kullanıma başlarken deneme siparişlerini temizle — menün ve garsonların korunur, sadece siparişler ve gün sonu geçmişi sıfırlanır. Bu işlem tüm cihazları etkiler.')}
          </div>
        </div>
        <button
          onClick={confirmClearOrders}
          style={{ width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, background: 'var(--surface)' }}
        >
          {tr('Siparişleri temizle')}
        </button>
        <button
          onClick={confirmUnlink}
          style={{ width: '100%', marginTop: 10, padding: 13, borderRadius: 14, border: '1px solid var(--line)', color: 'var(--danger)', fontSize: 13, fontWeight: 600, background: 'var(--surface)' }}
        >
          {tr('Cihaz bağlantısını kes')}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 26 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>
          La Tía · v{__APP_VERSION__}
          {/* Hangi işletme kaydına bağlandığımız görünür olmalı: veritabanında
              birden fazla işletme varsa uygulama sessizce yanlışına bağlanıp
              "menü boş" gibi anlaşılmaz bir sonuç veriyordu. */}
          {businessName && ` · ${businessName}`}
          {` · ${menuCount} ürün`}
        </div>
        <Signature />
      </div>
    </div>
  );
}
