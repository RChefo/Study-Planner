import { create } from 'zustand';
import { emptyPlannerData, type Commitment, type Lecture, type PlannerData, type StudyLogEntry } from '@/types';
import { persistPlanner } from '@/services/persistence';
import { uid } from '@/lib/id';

type Mutator = (data: PlannerData) => PlannerData;
export type PlannerCollection = 'courses' | 'commitments' | 'sessions';

interface PlannerState {
  data: PlannerData;
  /** Replace data without saving (used when loading from storage or the cloud). */
  replace: (data: PlannerData) => void;
  /** Apply an immutable update, save locally and schedule a cloud sync. */
  commit: (mutate: Mutator) => Promise<void>;

  saveCourse: (id: string | null, name: string) => Promise<void>;
  addLecture: (courseId: string, lecture: Lecture) => Promise<void>;
  toggleLecture: (courseId: string, index: number) => Promise<void>;
  deleteLecture: (courseId: string, index: number) => Promise<void>;
  setLectureFile: (courseId: string, index: number, file: { pdf: string; pdfName: string } | null) => Promise<void>;
  setDailyGoal: (minutes: number) => Promise<void>;
  saveCommitment: (commitment: Commitment) => Promise<void>;
  setCommitmentDone: (id: string, done: boolean) => Promise<void>;
  deleteItem: (collection: PlannerCollection, id: string) => Promise<void>;
  addStudyLog: (entry: StudyLogEntry) => Promise<void>;
}

const mapLectures = (data: PlannerData, courseId: string, fn: (lectures: Lecture[]) => Lecture[]): PlannerData => ({
  ...data,
  courses: data.courses.map(c => (c.id === courseId ? { ...c, topics: fn(c.topics ?? []) } : c)),
});

export const usePlannerStore = create<PlannerState>((set, get) => ({
  data: emptyPlannerData(),
  replace: data => set({ data }),
  commit: mutate => {
    const data = mutate(get().data);
    set({ data });
    return persistPlanner(data);
  },

  saveCourse: (id, name) =>
    get().commit(d =>
      id && d.courses.some(c => c.id === id)
        ? { ...d, courses: d.courses.map(c => (c.id === id ? { ...c, name } : c)) }
        : { ...d, courses: [...d.courses, { id: uid(), name, topics: [] }] },
    ),
  addLecture: (courseId, lecture) => get().commit(d => mapLectures(d, courseId, ts => [...ts, lecture])),
  toggleLecture: (courseId, index) =>
    get().commit(d => mapLectures(d, courseId, ts => ts.map((t, i) => (i === index ? { ...t, done: !t.done } : t)))),
  deleteLecture: (courseId, index) => get().commit(d => mapLectures(d, courseId, ts => ts.filter((_, i) => i !== index))),
  setLectureFile: (courseId, index, file) =>
    get().commit(d =>
      mapLectures(d, courseId, ts =>
        ts.map((t, i) => {
          if (i !== index) return t;
          const { pdf: _pdf, pdfName: _name, ...rest } = t;
          return file ? { ...rest, ...file } : rest;
        }),
      ),
    ),
  setDailyGoal: minutes => get().commit(d => ({ ...d, preferences: { ...d.preferences, dailyGoalMinutes: minutes } })),
  saveCommitment: commitment =>
    get().commit(d => ({
      ...d,
      commitments: d.commitments.some(c => c.id === commitment.id)
        ? d.commitments.map(c => (c.id === commitment.id ? commitment : c))
        : [...d.commitments, commitment],
    })),
  setCommitmentDone: (id, done) =>
    get().commit(d => ({ ...d, commitments: d.commitments.map(c => (c.id === id ? { ...c, done } : c)) })),
  deleteItem: (collection, id) =>
    get().commit(d => {
      switch (collection) {
        case 'courses':
          return { ...d, courses: d.courses.filter(x => x.id !== id) };
        case 'commitments':
          return { ...d, commitments: d.commitments.filter(x => x.id !== id) };
        case 'sessions':
          return { ...d, sessions: d.sessions.filter(x => x.id !== id) };
      }
    }),
  // Idempotent: a round logged by another tab (same deterministic id) is never duplicated.
  addStudyLog: entry =>
    get().data.studyLog.some(l => l.id === entry.id) ? Promise.resolve() : get().commit(d => ({ ...d, studyLog: [entry, ...d.studyLog] })),
}));

export const plannerData = () => usePlannerStore.getState().data;
