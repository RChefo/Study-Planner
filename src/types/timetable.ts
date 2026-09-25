export type Weekday = 'Friday' | 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

export interface TimetableSubject {
  title: string;
  meta: string;
}

/** One cell spanning `span` of the 8 group columns. Empty cells have no subjects. */
export interface TimetableCell {
  span: number;
  subjects: TimetableSubject[];
}

export interface TimetableRow {
  period: number;
  time: string;
  cells: TimetableCell[];
}

export type TimetableDays = Partial<Record<Weekday, TimetableRow[]>>;
