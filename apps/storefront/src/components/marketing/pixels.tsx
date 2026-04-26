'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface PixelConfig {
  gtmId?: string;
  gaTrackingId?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  clarityProjectId?: string;
  googleAdsConversionId?: string;
}

/**
 * Pixels marketing — script-injection client-side respeitando consent LGPD.
 *
 * Carrega apenas após cliente dar consentimento "marketing" no banner.
 * Sem consent: nenhum pixel dispara → loja continua funcionando.
 *
 * Configurado via tenants.config.pixels (admin /settings).
 */
export function Pixels({ config }: { config: PixelConfig }) {
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    // Lê consent do localStorage (alinhado com ConsentBanner)
    function readConsent() {
      try {
        const raw = localStorage.getItem('lojeo_consent');
        if (!raw) return false;
        const data = JSON.parse(raw) as { marketing?: boolean };
        return Boolean(data.marketing);
      } catch { return false; }
    }
    setMarketingConsent(readConsent());

    // Reage a mudanças de consent (ConsentBanner dispara storage event)
    function onStorage(e: StorageEvent) {
      if (e.key === 'lojeo_consent') setMarketingConsent(readConsent());
    }
    window.addEventListener('storage', onStorage);
    // Mesma janela: custom event do banner
    function onConsentChange() { setMarketingConsent(readConsent()); }
    window.addEventListener('lojeo:consent-change', onConsentChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lojeo:consent-change', onConsentChange);
    };
  }, []);

  if (!marketingConsent) return null;

  return (
    <>
      {/* Google Tag Manager (head) */}
      {config.gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.gtmId}');`}
        </Script>
      )}

      {/* Google Analytics 4 */}
      {config.gaTrackingId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${config.gaTrackingId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.gaTrackingId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {/* Meta Pixel */}
      {config.metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {/* TikTok Pixel */}
      {config.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${config.tiktokPixelId}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}

      {/* Microsoft Clarity */}
      {config.clarityProjectId && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${config.clarityProjectId}");`}
        </Script>
      )}

      {/* Google Ads Conversion */}
      {config.googleAdsConversionId && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAdsConversionId}`}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
