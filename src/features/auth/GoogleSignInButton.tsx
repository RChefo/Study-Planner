import { useEffect, useRef, useState } from 'react';
import { renderGoogleButton } from '@/services/googleIdentity';
import { GoogleIcon } from '@/components/brand/ProviderIcons';

interface Props {
  clientId: string;
  locale: string;
  label: string;
  onCredential: (credential: string) => void;
  onLoadError: () => void;
}

/**
 * Google's official "Continue with Google" button (rendered by Google Identity Services,
 * as Google's branding rules require). A same-sized placeholder is shown until it loads.
 */
export function GoogleSignInButton({ clientId, locale, label, onCredential, onLoadError }: Props) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const handlers = useRef({ onCredential, onLoadError });
  useEffect(() => {
    handlers.current = { onCredential, onLoadError };
  });

  // GIS buttons have a fixed pixel width; follow the card width (e.g. on rotation).
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = slotRef.current;
    if (!el || !width) return;
    let cancelled = false;
    renderGoogleButton(el, clientId, c => handlers.current.onCredential(c), { width, locale })
      .then(() => !cancelled && setReady(true))
      .catch(err => {
        console.error(err);
        if (!cancelled) handlers.current.onLoadError();
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, locale, width]);

  return (
    <div className="relative h-10 w-full">
      {!ready && (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white text-sm font-medium text-[#3c4043]">
          <GoogleIcon className="size-[18px]" />
          {label}
        </div>
      )}
      {/* Google injects its button (an accessible iframe) here. */}
      <div ref={slotRef} className="flex h-10 w-full justify-center [color-scheme:light]" />
    </div>
  );
}
