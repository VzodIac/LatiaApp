import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { Logo } from './components/Logo';
import { tabScroll } from './components/ui';
import { LockScreen } from './features/auth/LockScreen';
import { DeviceSetup } from './features/auth/DeviceSetup';
import { OrdersTab } from './features/orders/OrdersTab';
import { NewOrderSheet } from './features/orders/NewOrderSheet';
import { OrderDetail } from './features/order-detail/OrderDetail';
import { BrowseSheet } from './features/order-detail/BrowseSheet';
import { ItemEditSheet } from './features/order-detail/ItemEditSheet';
import { PaymentSheet } from './features/payment/PaymentSheet';
import { Receipt } from './features/payment/Receipt';
import { DashboardTab } from './features/dashboard/DashboardTab';
import { ManageOrderSheet } from './features/dashboard/OrderHistory';
import { MenuTab } from './features/menu/MenuTab';
import { MenuEditor } from './features/menu/MenuEditor';
import { SettingsTab } from './features/settings/SettingsTab';
import { KitchenScreen } from './features/kitchen/KitchenScreen';
import { Hub } from './features/hub/Hub';
import { ManagementScreen } from './features/management/ManagementScreen';
import { SetupNeeded } from './features/setup/SetupNeeded';
import { isConfigured } from './lib/supabase';

/**
 * Uygulamanın dört yüzü ayrı adreslerde durur ki her biri ayrı bir PWA olarak
 * kurulabilsin: /servis (garson), /kitchen (mutfak), /yonetim (yönetim) ve
 * / (seçim ekranı). Eski ?mode=kitchen bağlantıları da çalışır.
 */
const path = window.location.pathname;
const isKitchenMode =
  path.startsWith('/kitchen') || new URLSearchParams(window.location.search).get('mode') === 'kitchen';
const isManagement = path.startsWith('/yonetim');
const isHub = !isKitchenMode && !isManagement && !path.startsWith('/servis');

export function App() {
  const ready = useStore((s) => s.ready);
  const needsDeviceLogin = useStore((s) => s.needsDeviceLogin);
  const boot = useStore((s) => s.boot);
  const theme = useStore((s) => s.settings.theme);
  const tab = useStore((s) => s.tab);
  const locked = useStore((s) => s.locked);

  const orders = useStore((s) => s.orders);
  const orderOpen = useStore((s) => s.orderOpen);
  const newOrderOpen = useStore((s) => s.newOrderOpen);
  const browseOpen = useStore((s) => s.browseOpen);
  const itemEdit = useStore((s) => s.itemEdit);
  const payOpen = useStore((s) => s.payOpen);
  const receipt = useStore((s) => s.receipt);
  const editorOpen = useStore((s) => s.editor != null);
  const manageOrderId = useStore((s) => s.manageOrderId);
  const historyOrders = useStore((s) => s.historyOrders);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Telefon çerçevesi olmayan ekranlarda (seçim sayfası, mutfak) gövde arka
  // planı tema rengini alsın — aşırı kaydırmada masaüstü grisi sızmasın.
  useEffect(() => {
    if (!isHub && !isKitchenMode && !isManagement) return;
    const prev = document.body.style.background;
    document.body.style.background = theme === 'dark' ? '#1A1513' : '#F7F2EC';
    return () => {
      document.body.style.background = prev;
    };
  }, [theme]);

  const curOrder = orderOpen ? orders.find((o) => o.id === orderOpen) : undefined;
  const manageOrder = manageOrderId ? historyOrders.find((o) => o.id === manageOrderId) : undefined;

  // Bağlantı bilgileri girilmemişse ne yapılması gerektiğini anlat
  if (!isConfigured) {
    return (
      <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`}>
        <SetupNeeded />
      </div>
    );
  }

  // Kök adres: hangi bölümün nerede olduğunu gösteren seçim ekranı
  if (isHub) {
    return (
      <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`} style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Hub />
      </div>
    );
  }

  // Yönetim paneli: maliyet, marj, bahşiş havuzu ve tedarikçi fiyatları
  // burada durur — salondaki cihazlarda görünmemesi için ayrı adres.
  if (isManagement) {
    if (!ready) {
      return (
        <div className="app light" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <Logo height={44} variant="full" />
        </div>
      );
    }
    if (needsDeviceLogin) {
      return (
        <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`} style={{ minHeight: '100dvh', position: 'relative', background: 'var(--bg)' }}>
          <DeviceSetup onDone={() => void boot()} />
        </div>
      );
    }
    return (
      <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`}>
        <ManagementScreen />
        <Toast />
      </div>
    );
  }

  // Mutfak ekranı: telefon çerçevesi yok, tam ekran. Cihaz kurulumu yine gerekli.
  if (isKitchenMode) {
    if (!ready) {
      return (
        <div className="app light" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <Logo height={44} variant="full" />
        </div>
      );
    }
    if (needsDeviceLogin) {
      return (
        <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`} style={{ minHeight: '100dvh', position: 'relative', background: 'var(--bg)' }}>
          <DeviceSetup onDone={() => void boot()} />
        </div>
      );
    }
    return (
      <>
        <KitchenScreen />
        <Toast />
      </>
    );
  }

  return (
    <div className={`app ${theme === 'dark' ? 'dark' : 'light'} stage`}>
      <div className="phone">
        <div className="screen">
          {!ready ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <Logo height={40} variant="full" />
            </div>
          ) : needsDeviceLogin ? (
            <DeviceSetup onDone={() => void boot()} />
          ) : (
            <>
              <StatusBar />

              <div className="scr" style={tabScroll}>
                {tab === 'orders' && <OrdersTab />}
                {tab === 'dash' && <DashboardTab />}
                {tab === 'menu' && <MenuTab />}
                {tab === 'settings' && <SettingsTab />}
              </div>

              <TabBar />

              {/* Overlaylar */}
              {newOrderOpen && <NewOrderSheet />}

              {curOrder && <OrderDetail order={curOrder} />}
              {curOrder && browseOpen && <BrowseSheet order={curOrder} />}
              {curOrder && itemEdit && <ItemEditSheet order={curOrder} />}
              {curOrder && payOpen && <PaymentSheet order={curOrder} />}

              {receipt && <Receipt data={receipt} />}

              {editorOpen && <MenuEditor />}

              {manageOrder && <ManageOrderSheet order={manageOrder} />}

              {locked && <LockScreen />}

              <Toast />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
