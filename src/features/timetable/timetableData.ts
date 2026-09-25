import type { TimetableCell, TimetableDays, TimetableSubject } from '@/types';

/**
 * University timetable — Cyber Security Technology, 3rd year, term 1 2026/2027.
 * Each row covers the 8 group columns; a cell's `span` is how many groups share it.
 * Converted verbatim from the original university-timetable.html.
 */

const c = (span: number, ...subjects: Array<[string, string]>): TimetableCell => ({
  span,
  subjects: subjects.map(([title, meta]): TimetableSubject => ({ title, meta })),
});
const empty = (span: number): TimetableCell => ({ span, subjects: [] });

export const TIMETABLE: TimetableDays = {
  Friday: [
    { period: 1, time: '09:00 - 10:00', cells: [c(4, ["Privacy and Anonymity", "Dr. Hany Muhammed / A303"]), empty(4)] },
    { period: 2, time: '10:00 - 11:00', cells: [c(4, ["Big Data", "Dr. Finan Nagy / A202"]), c(4, ["Privacy and Anonymity", "Dr. Hany Muhammed / A303"])] },
    { period: 3, time: '11:00 - 12:00', cells: [empty(4), c(4, ["Big Data", "Dr. Finan Nagy / A202"])] },
    { period: 4, time: '02:00 - 03:00', cells: [c(4, ["Monitoring & Protecting Companies", "Dr. Hany Muhammed / A303"]), c(4, ["Work Ethic and Ethical Hacking", "Dr. Reda Ahmed / A202"])] },
    { period: 5, time: '03:00 - 04:00', cells: [c(4, ["Work Ethic and Ethical Hacking", "Dr. Reda Ahmed / A202"]), c(4, ["Monitoring & Protecting Companies", "Dr. Hany Muhammed / A303"])] },
    { period: 6, time: '04:00 - 05:00', cells: [empty(8)] },
    { period: 7, time: '05:00 - 06:00', cells: [empty(8)] },
    { period: 8, time: '06:00 - 07:00', cells: [empty(8)] },
    { period: 9, time: '07:00 - 08:00', cells: [empty(8)] },
  ],
  Saturday: [
    { period: 1, time: '09:00 - 10:00', cells: [c(8, ["Principles of Management and Leadership", "Dr. Naglaa Abdulmohsen / O.L"])] },
    { period: 2, time: '10:00 - 11:00', cells: [empty(3), c(1, ["(2) Work Ethic and Ethical Hacking", "Eng. Mariz / A02"]), empty(4)] },
    { period: 3, time: '11:00 - 12:00', cells: [empty(8)] },
    { period: 4, time: '12:00 - 01:00', cells: [c(4, ["Statistics I", "Dr. Shaimaa Muhran / F-Seminar"]), empty(4)] },
    { period: 5, time: '01:00 - 02:00', cells: [empty(4), c(4, ["Statistics I", "Dr. Shaimaa Muhran / A202"])] },
    { period: 6, time: '02:00 - 03:00', cells: [empty(8)] },
    { period: 7, time: '03:00 - 04:00', cells: [empty(1), c(1, ["(1) Privacy and Anonymity", "Eng. Reem / A01"]), c(1, ["(2) Work Ethic and Ethical Hacking", "Eng. Mariz / A02"]), empty(5)] },
    { period: 8, time: '04:00 - 05:00', cells: [empty(8)] },
    { period: 9, time: '05:00 - 06:00', cells: [empty(8)] },
    { period: 10, time: '06:00 - 07:00', cells: [empty(8)] },
    { period: 11, time: '07:00 - 08:00', cells: [empty(8)] },
  ],
  Sunday: [
    { period: 1, time: '09:00 - 10:00', cells: [empty(8)] },
    { period: 2, time: '10:00 - 11:00', cells: [c(1, ["(1) Privacy and Anonymity", "Eng. Reem / A02"]), empty(1), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / D101"]), empty(1), c(1, ["(2) Hacking Methods and Detection", "Eng. Mohannad / D104"]), empty(2), c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"])] },
    { period: 3, time: '11:00 - 12:00', cells: [empty(3), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / D103"]), c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"]), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Rodina / A01"]), empty(2)] },
    { period: 4, time: '12:00 - 01:00', cells: [c(1, ["(1) Hacking Methods and Detection", "Eng. Mario / D101"]), c(1, ["(2) Hacking Methods and Detection", "Eng. Mario / D101"]), empty(2), c(1, ["(2) Big Data", "Eng. Abdulaziz / A305"]), c(1, ["(1&2) Big Data", "Eng. Abdulaziz / A01 & A305"]), empty(2)] },
    { period: 5, time: '01:00 - 02:00', cells: [c(6, ["Hacking Methods and Their Detection", "Dr. Alaa Al-Shenhaby / A304"]), c(1, ["(1&2) Big Data", "Eng. Abdulaziz / A01 & A305"]), c(1, ["(2) Big Data", "Eng. Abdulaziz / A305"])] },
    { period: 6, time: '02:00 - 03:00', cells: [empty(1), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Mariz / A01"]), c(6, ["Hacking Methods and Their Detection", "Dr. Alaa Al-Shenhaby / A304"])] },
    { period: 7, time: '03:00 - 04:00', cells: [c(1, ["(1) Monitoring and Protecting Companies", "Eng. Mariz / A01"], ["(2) Hacking Methods and Detection", "Eng. Mario / G105"]), empty(1), c(2, ["(1&2) Statistics 1", "Eng. Rodina / G205"]), empty(4)] },
    { period: 8, time: '04:00 - 05:00', cells: [c(2, ["(1&2) Statistics 1", "Eng. Rodina / A202"]), empty(2), c(1, ["(2) Privacy and Anonymity", "Eng. Mario / G204"]), c(1, ["(1) Big Data", "Eng. Omnia / A01"], ["(2) Privacy and Anonymity", "Eng. Mario / G204"]), c(1, ["(1) Privacy and Anonymity", "Eng. Mario / G201"], ["(2) Big Data", "Eng. Omnia / A01"]), empty(1)] },
    { period: 9, time: '05:00 - 06:00', cells: [c(2, ["(2) Privacy and Anonymity", "Eng. Reem / G202"]), empty(1), c(1, ["(2) Monitoring and Protecting Companies", "Eng. Mariz / A02"]), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Rodina / A02"], ["(2) Monitoring and Protecting Companies", "Eng. Omnia / G205"]), c(1, ["(2) Monitoring and Protecting Companies", "Eng. Omnia / G205"]), c(2, ["(1) Monitoring and Protecting Companies", "Eng. Omnia / G204"])] },
    { period: 10, time: '06:00 - 07:00', cells: [empty(1), c(1, ["(1) Monitoring and Protecting Companies", "Eng. Mariz / A02"]), empty(1), c(1, ["(2) Privacy and Anonymity", "Eng. Reem / A01"]), empty(4)] },
    { period: 11, time: '07:00 - 08:00', cells: [c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Mariz / A01"]), empty(7)] },
  ],
  Monday: [
    { period: 1, time: '09:00 - 10:00', cells: [c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"]), empty(7)] },
    { period: 2, time: '10:00 - 11:00', cells: [empty(1), c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"]), empty(6)] },
    { period: 3, time: '11:00 - 12:00', cells: [empty(2), c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"]), empty(4), c(1, ["(2) Privacy and Anonymity", "Eng. Mario / A01"])] },
    { period: 4, time: '12:00 - 01:00', cells: [c(2, ["(2) Big Data", "Eng. Abdulaziz / A202"]), empty(1), c(1, ["(1) Big Data", "Eng. Abdulaziz / A01"]), empty(3), c(1, ["(2) Monitoring and Protecting Companies", "Eng. Omnia / A01"])] },
    { period: 5, time: '01:00 - 02:00', cells: [empty(2), c(2, ["(2) Big Data", "Eng. Abdulaziz / A202"]), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / D102"]), empty(1), c(1, ["(2) Monitoring and Protecting Companies", "Eng. Omnia / A01"]), c(1, ["(2) Hacking Methods and Detection", "Eng. Mohannad / D104"])] },
    { period: 6, time: '02:00 - 03:00', cells: [empty(5), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / G203"]), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / G203"], ["(2) Hacking Methods and Detection", "Eng. Mohannad / D101"]), c(1, ["(2) Work Ethic and Ethical Hacking", "Eng. Rodina / A01"])] },
    { period: 7, time: '03:00 - 04:00', cells: [c(1, ["(2) Monitoring and Protecting Companies", "Eng. Mariz / G203"]), c(1, ["(1) Hacking Methods and Detection", "Eng. Mario / A304"], ["(2) Monitoring and Protecting Companies", "Eng. Mariz / G203"]), empty(2), c(2, ["(1&2) Statistics 1", "Eng. Omar / G204"]), c(1, ["(2) Work Ethic and Ethical Hacking", "Eng. Rodina / A01"]), c(1, ["(1) Hacking Methods and Detection", "Eng. Mohannad / G201"])] },
    { period: 8, time: '04:00 - 05:00', cells: [empty(2), c(1, ["(1) Privacy and Anonymity", "Eng. Reem / A02"], ["(2) Monitoring and Protecting Companies", "Eng. Mariz / A01"]), empty(1), c(1, ["(1) Monitoring and Protecting Companies", "Eng. Omnia / A01"], ["(2) Work Ethic and Ethical Hacking", "Eng. Rodina / A01"]), c(1, ["(2) Work Ethic and Ethical Hacking", "Eng. Rodina / G201"]), c(2, ["(1&2) Statistics 1", "Eng. Omar / G205"])] },
    { period: 9, time: '05:00 - 06:00', cells: [empty(2), c(1, ["(2) Hacking Methods and Detection", "Eng. Mohannad / G202"]), c(1, ["(1) Privacy and Anonymity", "Eng. Reem / F-Seminar"], ["(2) Hacking Methods and Detection", "Eng. Mohannad / G202"]), c(1, ["(1) Privacy and Anonymity", "Eng. Reem / F-Seminar"]), c(1, ["(1) Monitoring and Protecting Companies", "Eng. Omnia / A01"]), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Rodina / G204"], ["(2) Big Data", "Eng. Omnia / A303"]), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Rodina / G204"])] },
    { period: 10, time: '06:00 - 07:00', cells: [c(2, ["(2) Work Ethic and Ethical Hacking", "Eng. Mariz / G201"]), c(2, ["(1) Monitoring and Protecting Companies", "Eng. Mariz / F-Seminar"]), c(1, ["(2) Privacy and Anonymity", "Eng. Reem / A02"]), c(1, ["(1) Privacy and Anonymity", "Eng. Mario / A01"]), empty(2)] },
    { period: 11, time: '07:00 - 08:00', cells: [empty(2), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Mariz / G201"], ["(2) Privacy and Anonymity", "Eng. Reem / A307"]), c(1, ["(1) Work Ethic and Ethical Hacking", "Eng. Mariz / G201"]), c(1, ["(2) Hacking Methods and Detection", "Eng. Mohannad / G104"]), c(1, ["(1) Privacy and Anonymity", "Eng. Mario / A01"]), c(1, ["(1) Big Data", "Eng. Omnia / G208"]), c(1, ["(2) Big Data", "Eng. Abdulaziz / A202"])] },
  ],
};
