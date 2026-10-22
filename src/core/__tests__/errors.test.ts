import { AppError, err, ok, tryAsync, unwrapOr } from '../errors';

describe('Result helpers', () => {
  it('wraps values and errors', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });

  it('unwrapOr returns fallback on error', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
    expect(unwrapOr(err(new AppError('unknown', 'boom')), 0)).toBe(0);
  });

  it('tryAsync captures thrown errors as AppError with code', async () => {
    const r = await tryAsync(async () => {
      throw new Error('disk full');
    }, 'storage');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(AppError);
      expect(r.error.code).toBe('storage');
      expect(r.error.message).toBe('disk full');
    }
  });

  it('AppError.from keeps existing AppErrors', () => {
    const e = new AppError('network', 'offline');
    expect(AppError.from(e)).toBe(e);
    expect(AppError.from('str').message).toBe('str');
  });
});
