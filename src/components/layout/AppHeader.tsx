import { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { showTimerDock } from '@/features/timer/timerController';
import { exportExcelBackup, importExcelBackup } from '@/features/backup/excelBackup';
import { signOut } from '@/features/auth/authFlow';
import { ROUTES, loginPath } from '@/routes/paths';

function AccountPill() {
  const user = useAuthStore(s => s.user);
  const local = useAuthStore(s => s.status === 'local');
  const label = user ? user.name || user.email : local ? 'محلي على هذا الجهاز' : 'غير مسجل';
  return (
    <span className="max-w-40 self-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[20px] bg-mint px-[10px] py-[7px] text-[11px] text-brand" title={label}>
      {label}
    </span>
  );
}

/** Hides button captions on small screens, like the original `.top-actions .btn span`. */
const Caption = ({ children }: { children: string }) => <span className="max-md:hidden">{children}</span>;

export function AppHeader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const signedIn = useAuthStore(s => !!s.user);

  return (
    <header className="mb-[26px] flex items-center justify-between gap-3">
      <Link to={ROUTES.courses} className="flex items-center gap-3 rounded-xl no-underline" aria-label="Study Planner">
        <BrandLogo size={44} priority />
        <div className="text-ink">
          <h1 className="m-0 whitespace-nowrap text-[21px] font-bold max-md:text-lg" dir="ltr">
            Study Planner
          </h1>
          <p className="mb-0 mt-0.5 text-[13px] text-muted max-md:hidden">خطتك الدراسية، على إيقاع يومك</p>
        </div>
      </Link>
      <div className="flex flex-wrap justify-end gap-[9px]">
        <Button onClick={showTimerDock} aria-label="مؤقت المذاكرة">
          <Icon name="timer" size={17} /> <Caption>مؤقت المذاكرة</Caption>
        </Button>
        <Button onClick={() => void exportExcelBackup()} aria-label="نسخة Excel">
          <Icon name="download" size={16} /> <Caption>نسخة Excel</Caption>
        </Button>
        <Button onClick={() => fileRef.current?.click()} aria-label="استعادة من Excel">
          <Icon name="upload" size={16} /> <Caption>استعادة من Excel</Caption>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={e => {
            const file = e.target.files?.[0];
            const input = e.target;
            if (file) void importExcelBackup(file).finally(() => (input.value = ''));
          }}
        />
        <AccountPill />
        {signedIn ? (
          <Button
            onClick={() => {
              void signOut().then(() => navigate(ROUTES.login, { replace: true }));
            }}
          >
            <span>تسجيل الخروج</span>
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate(loginPath({ next: ROUTES.app }))}>
            <span>تسجيل الدخول</span>
          </Button>
        )}
      </div>
    </header>
  );
}
