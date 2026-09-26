import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NAV_ITEMS, ROUTES, coursePath } from '@/routes/paths';
import { usePlannerStore } from '@/stores/plannerStore';
import { matchesQuery } from '@/lib/search';
import { lecturesPhrase } from '@/lib/format';
import { langOf } from '@/lib/text';
import { cn } from '@/lib/cn';

interface Result {
  id: string;
  group: string;
  icon: IconName;
  title: string;
  detail?: string;
  to: string;
}

const MAX_PER_GROUP = 6;

/** Search across pages, courses, lectures and commitments — the user's real data only. */
function useResults(query: string): Result[] {
  const courses = usePlannerStore(s => s.data.courses);
  const commitments = usePlannerStore(s => s.data.commitments);
  return useMemo(() => {
    const q = query.trim();
    const pages: Result[] = [...NAV_ITEMS, { to: ROUTES.timer, label: 'المؤقت', icon: 'timer' as IconName }]
      .filter(p => !q || matchesQuery(p.label, q))
      .map(p => ({ id: `page-${p.to}`, group: 'الصفحات', icon: p.icon, title: p.label, to: p.to }));
    if (!q) return pages;
    const courseHits: Result[] = courses
      .filter(c => matchesQuery(c.name, q))
      .slice(0, MAX_PER_GROUP)
      .map(c => ({ id: `course-${c.id}`, group: 'المواد', icon: 'folder', title: c.name, detail: c.topics?.length ? (c.topics.length === 1 ? 'محاضرة واحدة' : lecturesPhrase(c.topics.length)) : 'لا محاضرات', to: coursePath(c.id) }));
    const lectureHits: Result[] = courses
      .flatMap(c => (c.topics ?? []).map((t, i) => ({ c, t, i })))
      .filter(({ t }) => matchesQuery(t.name, q))
      .slice(0, MAX_PER_GROUP)
      .map(({ c, t, i }) => ({ id: `lecture-${c.id}-${i}`, group: 'المحاضرات', icon: t.done ? 'checkCircle' : 'book', title: t.name, detail: c.name, to: coursePath(c.id) }));
    const commitmentHits: Result[] = commitments
      .filter(c => matchesQuery(`${c.name} ${c.description}`, q))
      .slice(0, MAX_PER_GROUP)
      .map(c => ({ id: `commitment-${c.id}`, group: 'الالتزامات', icon: 'clipboard', title: c.name || 'بدون عنوان', detail: c.done ? 'منجز' : c.dueDate || 'بدون موعد', to: ROUTES.commitments }));
    return [...courseHits, ...lectureHits, ...commitmentHits, ...pages];
  }, [query, courses, commitments]);
}

/** Ctrl/⌘+K palette (combobox + listbox): arrows move, Enter opens, Escape closes. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useResults(query);
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  if (!open) return null;

  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };
  const choose = (r: Result | undefined) => {
    if (!r) return;
    close();
    navigate(r.to);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive(i => Math.min(results.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActive(i => Math.max(0, i - 1));
    else if (e.key === 'Enter') choose(results[active]);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') e.preventDefault(); // focus stays in the palette
    else return;
    e.preventDefault();
  };

  const groups = results.reduce<Array<{ name: string; items: Array<{ r: Result; i: number }> }>>((acc, r, i) => {
    const last = acc[acc.length - 1];
    if (last?.name === r.group) last.items.push({ r, i });
    else acc.push({ name: r.group, items: [{ r, i }] });
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center bg-[#0f1f1a55] px-3 pt-[12vh] backdrop-blur-[2px]" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="البحث" className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_#0f1f1a66] motion-safe:animate-enter">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={18} className="text-subtle" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="ابحث في المواد والمحاضرات والالتزامات"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="ابحث عن مادة أو محاضرة أو التزام…"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#9aa6a1]"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-[11px] text-subtle sm:inline">Esc</kbd>
        </div>
        <div id={listId} role="listbox" aria-label="النتائج" className="max-h-[55vh] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="m-0 px-3 py-8 text-center text-sm text-subtle">لا توجد نتائج لـ «{query}»</p>}
          {groups.map(g => (
            <div key={g.name} role="group" aria-labelledby={`${listId}-g-${g.name}`}>
              <div id={`${listId}-g-${g.name}`} className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold text-muted">
                {g.name}
              </div>
              {g.items.map(({ r, i }) => (
                <div
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm', i === active ? 'bg-brand-soft text-brand-night' : 'text-ink')}
                >
                  <Icon name={r.icon} size={16} className={i === active ? 'text-brand' : 'text-subtle'} />
                  <span lang={langOf(r.title)} className="min-w-0 flex-1 truncate">
                    {r.title}
                  </span>
                  {r.detail && (
                    <span lang={langOf(r.detail)} className="max-w-[40%] shrink-0 truncate text-xs text-subtle">
                      {r.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
