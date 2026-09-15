import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';
import { getSiteSettings, upsertSiteSetting } from './database';

type BrandState = {
  logoUrl: string | null;
  faviconUrl: string | null;
  loading: boolean;
  uploadLogo: (file: File) => Promise<{ error: string | null }>;
  removeLogo: () => Promise<{ error: string | null }>;
};

const BrandContext = createContext<BrandState>({
  logoUrl: null,
  faviconUrl: null,
  loading: true,
  uploadLogo: async () => ({ error: 'Not initialized' }),
  removeLogo: async () => ({ error: 'Not initialized' }),
});

const LOGO_SETTING_KEY = 'brand_logo_url';
const FAVICON_SETTING_KEY = 'brand_favicon_url';

function setFaviconLink(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
  link.type = 'image/png';
}

function setOgImage(url: string) {
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  'meta[name="twitter:card"]',
  'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  'meta[name="description"]',
  'link[rel="apple-touch-icon"]',
  'link[rel="manifest"]',
  'meta[name="theme-color"]',
    'meta[name="application-name"]',
    'meta[name="apple-mobile-web-app-title"]',
    'meta[name="apple-mobile-web-app-capable"]',
    'meta[name="apple-mobile-web-app-status-bar-style"]',
    'meta[name="msapplication-TileColor"]',
    'meta[name="msapplication-TileImage"]',
  'meta[name="msapplication-square70x70logo"]',
    'meta[name="msapplication-square150x150logo"]',
    'meta[name="msapplication-wide310x150logo"]',
    'meta[name="msapplication-square310x310logo"]',
  'link[rel="icon"][type="image/x-icon"]',
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="icon"][sizes="16x16"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"][sizes="96x96"]',
    'link[rel="icon"][sizes="192x192"]',
    'link[rel="icon"][sizes="512x512"]',
    'link[rel="apple-touch-icon"][sizes="180x180"]',
    'link[rel="apple-touch-icon"][sizes="152x152"]',
    'link[rel="apple-touch-icon"][sizes="167x167"]',
    'link[rel="apple-touch-icon"][sizes="120x120"]',
    'link[rel="apple-touch-icon"][sizes="76x76"]',
    'link[rel="apple-touch-icon"][sizes="60x60"]',
  ];
  selectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.remove();
  });

  const favLink = document.createElement('link');
  favLink.rel = 'icon';
  favLink.type = 'image/png';
  favLink.href = url;
  document.head.appendChild(favLink);

  const favLink32 = document.createElement('link');
  favLink32.rel = 'icon';
  favLink32.type = 'image/png';
  favLink32.setAttribute('sizes', '32x32');
  favLink32.href = url;
  document.head.appendChild(favLink32);

  const favLink192 = document.createElement('link');
  favLink192.rel = 'icon';
  favLink192.type = 'image/png';
  favLink192.setAttribute('sizes', '192x192');
  favLink192.href = url;
  document.head.appendChild(favLink192);

  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = url;
  document.head.appendChild(appleLink);

  const ogMeta = document.createElement('meta');
  ogMeta.setAttribute('property', 'og:image');
  ogMeta.content = url;
  document.head.appendChild(ogMeta);

  const twitterMeta = document.createElement('meta');
  twitterMeta.setAttribute('name', 'twitter:image');
  twitterMeta.content = url;
  document.head.appendChild(twitterMeta);
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBrand = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const settings = await getSiteSettings();
      const logo = settings[LOGO_SETTING_KEY] || null;
      const favicon = settings[FAVICON_SETTING_KEY] || logo;
      setLogoUrl(logo);
      setFaviconUrl(favicon);
      if (favicon) {
        setFaviconLink(favicon);
      }
    } catch {
      // non-blocking
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const uploadLogo = useCallback(
    async (file: File): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !storage) {
        return { error: 'Storage is not configured. Please contact support.' };
      }
      if (!file.type.startsWith('image/')) {
        return { error: 'Please upload an image file (PNG, JPG, or SVG).' };
      }
      if (file.size > 2 * 1024 * 1024) {
        return { error: 'Image must be under 2 MB.' };
      }

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const safeExt = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico'].includes(ext) ? ext : 'png';
        const logoPath = `branding/logo-${Date.now()}.${safeExt}`;
        const logoRef = ref(storage, logoPath);
        await uploadBytes(logoRef, file, { contentType: file.type });
        const logo = await getDownloadURL(logoRef);

        const favPath = `branding/favicon-${Date.now()}.png`;
        const favRef = ref(storage, favPath);
        await uploadBytes(favRef, file, { contentType: file.type });
        const favicon = await getDownloadURL(favRef);

        await upsertSiteSetting(LOGO_SETTING_KEY, logo);
        await upsertSiteSetting(FAVICON_SETTING_KEY, favicon);

        setLogoUrl(logo);
        setFaviconUrl(favicon);
        setFaviconLink(favicon);
        setOgImage(favicon);

        return { error: null };
      } catch {
        return { error: 'Failed to upload logo. Please try again.' };
      }
    },
    []
  );

  const removeLogo = useCallback(async (): Promise<{ error: string | null }> => {
    if (!isFirebaseConfigured) {
      return { error: 'Storage is not configured.' };
    }
    try {
      await upsertSiteSetting(LOGO_SETTING_KEY, '');
      await upsertSiteSetting(FAVICON_SETTING_KEY, '');
      setLogoUrl(null);
      setFaviconUrl(null);
      setFaviconLink('/favicon.svg');
      return { error: null };
    } catch {
      return { error: 'Failed to remove logo. Please try again.' };
    }
  }, []);

  return (
    <BrandContext.Provider value={{ logoUrl, faviconUrl, loading, uploadLogo, removeLogo }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);
