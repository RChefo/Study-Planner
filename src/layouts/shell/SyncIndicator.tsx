import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { retrySyncNow } from '@/services/cloudSync';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

const timeFormat = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });

/** Shows where the user's data stands: synced / syncing / waiting / offline / failed / on-device. */
export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const local = useAuthStore(s => s.status === 'local');
  const status = useSyncStore(s => s.status);
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);

  let icon = <Icon name="checkCircle" size={15} />;
  let label = 'متزامن';
  let tone = 'text-subtle';
  let detail = lastSyncedAt ? `آخر مزامنة ${timeFormat.format(lastSyncedAt)}` : 'بياناتك محفوظة في حسابك';

  if (local) {
    icon = <Icon name="device" size={15} />;
    label = 'على هذا الجهاز';
    detail = 'البيانات محفوظة محليًا فقط؛ سجّل الدخول لمزامنتها';
  } else if (status === 'syncing') {
    icon = <Spinner className="size-3.5" />;
    label = 'جارٍ المزامنة';
  } else if (status === 'pending') {
    icon = <Icon name="clock" size={15} />;
    label = 'بانتظار المزامنة';
    detail = 'التغييرات محفوظة على هذا الجهاز وستُرفع تلقائيًا';
  } else if (status === 'offline') {
    icon = <Icon name="cloudOff" size={15} />;
    label = 'غير متصل';
    tone = 'text-[#8a4a12]';
    detail = 'تعمل دون اتصال؛ ستتم المزامنة عند عودة الإنترنت';
  } else if (status === 'error') {
    icon = <Icon name="alert" size={15} />;
    label = 'تعذرت المزامنة';
    tone = 'text-[#a23b24]';
    detail = 'التغييرات محفوظة على هذا الجهاز';
  }

  const content = (
    <>
      {icon}
      <span className={cn(compact && 'sr-only')}>{label}</span>
    </>
  );

  if (status === 'error' || status === 'offline') {
    return (
      <button
        type="button"
        onClick={retrySyncNow}
        title={`${detail} — اضغط لإعادة المحاولة`}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors hover:bg-ink/5', tone)}
      >
        {content}
        {!compact && <Icon name="refresh" size={14} />}
      </button>
    );
  }
  return (
    <span role="status" title={detail} className={cn('inline-flex h-9 items-center gap-1.5 px-2 text-[13px]', tone)}>
      {content}
    </span>
  );
}
