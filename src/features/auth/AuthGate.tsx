import { useEffect, useRef } from 'react';
import { useAuthStore, patchAuth } from '@/stores/authStore';
import { renderGoogleButton } from '@/services/googleIdentity';
import { continueLocalMode, handleGoogleCredential } from './authFlow';

/** Full-screen sign-in overlay (Google or continue with on-device data). */
export function AuthGate() {
  const open = useAuthStore(s => s.gateOpen);
  const message = useAuthStore(s => s.message);
  const clientId = useAuthStore(s => s.googleClientId);
  const signedIn = useAuthStore(s => !!s.user);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !clientId || signedIn || !buttonRef.current) return;
    renderGoogleButton(buttonRef.current, clientId, credential => void handleGoogleCredential(credential)).catch(err => {
      console.error(err);
      patchAuth({ message: 'تعذر تحميل تسجيل Google. راجع الاتصال أو تابع محليًا.' });
    });
  }, [open, clientId, signedIn]);

  if (!open) return null;
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#f5f6f2ee] p-5 backdrop-blur-[8px]"
    >
      <div className="w-[min(430px,100%)] rounded-[22px] border border-line bg-white p-[30px] text-center shadow-[0_18px_60px_#162a2018]">
        <div className="mx-auto mb-[14px] grid size-11 place-items-center rounded-[14px] bg-brand text-[23px] text-white" aria-hidden="true">
          ر
        </div>
        <h2 id="auth-title" className="mb-[7px] mt-0 text-[21px] font-bold">
          رفيق الدراسة
        </h2>
        <p className="mb-[18px] mt-0 text-[13px] leading-[1.7] text-muted">سجّل الدخول بحساب Google لمزامنة جدولك وموادك والتزاماتك بين أجهزتك.</p>
        <div ref={buttonRef} className="flex justify-center" />
        <p className="mb-[18px] mt-3 min-h-5 text-[13px] leading-[1.7] text-muted" aria-live="polite">
          {message}
        </p>
        <button type="button" onClick={continueLocalMode} className="mt-3 cursor-pointer border-0 bg-transparent text-xs text-muted underline">
          المتابعة بالبيانات المحلية على هذا الجهاز
        </button>
      </div>
    </section>
  );
}
