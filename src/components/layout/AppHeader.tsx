import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { showTimerDock } from '@/features/timer/timerController';
import { exportExcelBackup, importExcelBackup } from '@/features/backup/excelBackup';
import { signOut } from '@/features/auth/authFlow';

function AccountPill() {
  const user = useAuthStore(s => s.user);
  const localMode = useAuthStore(s => s.localMode);
  const label = user ? user.name || user.email : localMode ? 'محلي على هذا الجهاز' : 'غير مسجل';
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
  const signedIn = useAuthStore(s => !!s.user);

  return (
    <header className="mb-[26px] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="m-0 text-[21px] font-bold">رفيق الدراسة</h1>
          <p className="mb-0 mt-0.5 text-[13px] text-muted">خطتك الدراسية، على إيقاع يومك</p>
        </div>
      </div>
      <div className="flex gap-[9px]">
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
        {signedIn && (
          <Button onClick={() => void signOut()}>
            <span>تسجيل الخروج</span>
          </Button>
        )}
      </div>
    </header>
  );
}
