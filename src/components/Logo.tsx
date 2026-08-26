/**
 * La Tía kelime logosu.
 *
 * Gerçek marka logosu (el yazısı) bir PNG maskesi olarak tutulur ve rengi
 * CSS ile verilir — böylece açık/koyu temada ve farklı bağlamlarda (ör. mavi
 * zemin üzerinde krem) tek varlıkla doğru renkte görünür.
 *
 * variant: 'word' → sadece "LA TÍA" · 'full' → kemer yazısıyla birlikte
 */
const ASSETS = {
  word: { src: '/logo-word.png', ratio: 1021 / 260 },
  full: { src: '/logo-full.png', ratio: 891 / 420 },
} as const;

export function Logo({
  height = 34,
  variant = 'word',
  color = 'var(--accent)',
}: {
  height?: number;
  variant?: keyof typeof ASSETS;
  color?: string;
}) {
  const { src, ratio } = ASSETS[variant];
  const url = `url(${src})`;
  return (
    <div
      role="img"
      aria-label="La Tía"
      style={{
        height,
        width: height * ratio,
        flex: 'none',
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
