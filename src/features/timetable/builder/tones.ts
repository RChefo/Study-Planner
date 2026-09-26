import type { EntryColor } from '@/types';

/** Colour accents stay inside the Study Planner palette (night green, cream, gold + soft companions). */
export const TONES: Record<EntryColor | 'default', { card: string; bar: string; swatch: string; label: string }> = {
  default: { card: 'bg-brand-soft text-brand-night', bar: 'bg-brand', swatch: 'bg-brand', label: 'أخضر' },
  forest: { card: 'bg-brand-night text-dawn', bar: 'bg-[#8fd6b3]', swatch: 'bg-brand-night', label: 'ليلي' },
  gold: { card: 'bg-[#f6ecd6] text-[#4a340d]', bar: 'bg-[#c19a4f]', swatch: 'bg-[#c19a4f]', label: 'ذهبي' },
  clay: { card: 'bg-[#f8e8dc] text-[#5b2a12]', bar: 'bg-[#b56832]', swatch: 'bg-[#b56832]', label: 'طيني' },
  sky: { card: 'bg-[#e4eef3] text-[#1d3d4f]', bar: 'bg-[#4a7f99]', swatch: 'bg-[#4a7f99]', label: 'سماوي' },
  plum: { card: 'bg-[#efe6ef] text-[#3f2544]', bar: 'bg-[#7d5585]', swatch: 'bg-[#7d5585]', label: 'بنفسجي' },
  slate: { card: 'bg-[#e9ecec] text-[#2c3739]', bar: 'bg-[#667579]', swatch: 'bg-[#667579]', label: 'رمادي' },
};
