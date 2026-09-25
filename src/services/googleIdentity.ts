/** Minimal typings for Google Identity Services (https://accounts.google.com/gsi/client). */
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, options: Record<string, string>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | undefined;

/** GIS must be loaded from Google at runtime; it cannot be bundled. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('GIS unavailable')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('تعذر تحميل تسجيل Google'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

let initializedFor = '';

/** Initializes GIS once per client id and renders the sign-in button into `el`. */
export async function renderGoogleButton(el: HTMLElement, clientId: string, onCredential: (credential: string) => void): Promise<void> {
  const gis = await loadGoogleIdentity();
  if (initializedFor !== clientId) {
    gis.initialize({ client_id: clientId, callback: r => onCredential(r.credential), auto_select: false });
    initializedFor = clientId;
  }
  el.replaceChildren();
  gis.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'ar' });
}
