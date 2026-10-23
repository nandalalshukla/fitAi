import { DEFAULT_REMINDERS, planReminders } from '../domain/planReminders';

const at = (h: number, m = 0) => new Date(2026, 9, 23, h, m);

describe('planReminders', () => {
  it('schedules nothing when everything is off', () => {
    expect(
      planReminders(
        { ...DEFAULT_REMINDERS, streakNudge: false },
        { now: at(9), trainedToday: false, streak: 3 },
      ),
    ).toEqual([]);
  });

  it('adds the daily reminder at the chosen time', () => {
    expect(
      planReminders(
        { ...DEFAULT_REMINDERS, enabled: true, hour: 7, minute: 30 },
        { now: at(9), trainedToday: true, streak: 0 },
      ),
    ).toEqual([{ id: 'daily', kind: 'daily', hour: 7, minute: 30 }]);
  });

  it('nudges at 20:00 when a streak is at risk, never after training', () => {
    const r = planReminders(DEFAULT_REMINDERS, { now: at(9), trainedToday: false, streak: 4 });
    expect(r).toEqual([{ id: 'streak', kind: 'streak', at: at(20), streak: 4 }]);
    expect(planReminders(DEFAULT_REMINDERS, { now: at(9), trainedToday: true, streak: 4 })).toEqual(
      [],
    );
    expect(
      planReminders(DEFAULT_REMINDERS, { now: at(9), trainedToday: false, streak: 0 }),
    ).toEqual([]);
  });

  it('moves the nudge after a late daily reminder (hour capped at 21) and skips past times', () => {
    const late = { ...DEFAULT_REMINDERS, enabled: true, hour: 19, minute: 15 };
    expect(planReminders(late, { now: at(9), trainedToday: false, streak: 2 })[1]).toMatchObject({
      at: at(21, 15),
    });
    expect(
      planReminders(DEFAULT_REMINDERS, { now: at(20, 30), trainedToday: false, streak: 2 }),
    ).toEqual([]);
  });
});
