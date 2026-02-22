/**
 * Full Exam Mode: question count and time limit (minutes) per subject.
 * If the subject has fewer questions in the DB than the target, we load all available.
 */
export const EXAM_QUESTION_COUNT: Record<string, number> = {
  Biology: 100,
  Chemistry: 80,
  Mathematics: 60,
  Physics: 60,
  English: 100,
};

export const EXAM_TIME_MINUTES: Record<string, number> = {
  Biology: 120,
  Chemistry: 120,
  Mathematics: 180,
  Physics: 120,
  English: 120,
};

export function getExamQuestionCount(subjectName: string): number {
  return EXAM_QUESTION_COUNT[subjectName] ?? 60;
}

export function getExamTimeMinutes(subjectName: string): number {
  return EXAM_TIME_MINUTES[subjectName] ?? 120;
}
