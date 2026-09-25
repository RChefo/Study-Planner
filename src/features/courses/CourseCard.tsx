import type { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { MiniButton } from '@/components/ui/Button';

interface CourseCardProps {
  course: Course;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CourseCard({ course, onOpen, onEdit, onDelete }: CourseCardProps) {
  const lectures = course.topics ?? [];
  const done = lectures.filter(t => t.done).length;
  const pct = lectures.length ? Math.round((done / lectures.length) * 100) : 0;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`فتح مجلد ${course.name}`}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer rounded-2xl border border-line bg-card p-[15px] shadow-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_#1b302116]"
    >
      <div className="flex justify-between gap-2">
        <div className="flex-1">
          <h3 className="mb-1 mt-0 flex items-center gap-1.5 text-base font-bold">
            <Icon name="folder" size={20} /> {course.name}
          </h3>
          <p className="m-0 text-xs text-muted">اضغط لفتح مجلد المحاضرات</p>
        </div>
        <MiniButton
          aria-label="تعديل اسم المادة"
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Icon name="edit" size={15} />
        </MiniButton>
        <MiniButton
          aria-label="حذف المادة"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="close" size={15} />
        </MiniButton>
      </div>
      <div className="mt-[13px] flex items-baseline gap-2">
        <strong className="text-[29px] font-bold leading-none text-brand">
          {done}
          <span className="text-[21px] text-[#a0aaa4]">/{lectures.length}</span>
        </strong>
        <span className="text-[13px] text-muted">محاضرة مذاكرة</span>
      </div>
      <div className="mb-2 mt-[15px] h-[9px] overflow-hidden rounded-lg bg-[#edf0ed]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <i className="block h-full rounded-lg bg-[#5c9b79]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[13px] font-semibold text-muted">
        <span className="text-accent">{lectures.length - done} متبقية</span>
        <b>{pct}% مكتمل</b>
      </div>
    </article>
  );
}
