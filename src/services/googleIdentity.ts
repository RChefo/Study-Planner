/** Minimal typings for Google Identity Services (https://accounts.google.com/gsi/client). */
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (r: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_button?: boolean;
  }) => void;
  renderButton: (el: HTMLElement, options: GoogleButtonOptions) => void;
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
      script.remove();
      reject(new Error('Google Identity Services failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

let initializedFor = '';
// GIS keeps the callback given at initialize(); route it to whichever page rendered the button last.
let credentialHandler: ((credential: string) => void) | null = null;

/** Renders Google's official sign-in button into `el` (initializing GIS once per client id). */
export async function renderGoogleButton(
  el: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
  options: { width: number; locale: string },
): Promise<void> {
  const gis = await loadGoogleIdentity();
  credentialHandler = onCredential;
  if (initializedFor !== clientId) {
    gis.initialize({ client_id: clientId, callback: r => credentialHandler?.(r.credential), auto_select: false, ux_mode: 'popup' });
    initializedFor = clientId;
  }
  el.replaceChildren();
  gis.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'center',
    width: Math.max(200, Math.min(400, Math.floor(options.width))),
    locale: options.locale,
  });
}
