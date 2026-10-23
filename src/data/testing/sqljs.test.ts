import { createTestDatabase } from './sqljs';

it('runs real SQLite in Jest', async () => {
  const db = await createTestDatabase();
  await db.execAsync('create table t (id integer primary key, v text)');
  await db.runAsync('insert into t (v) values (?)', ['a']);
  expect(await db.getAllAsync('select * from t')).toEqual([{ id: 1, v: 'a' }]);
  await expect(
    db.withTransactionAsync(async () => {
      await db.runAsync('insert into t (v) values (?)', ['b']);
      throw new Error('boom');
    }),
  ).rejects.toThrow('boom');
  expect(await db.getAllAsync('select * from t')).toHaveLength(1);
});
