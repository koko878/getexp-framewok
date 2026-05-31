import { describe, expect, it } from 'vitest';
import {
  err,
  fromPromise,
  fromThrowable,
  isErr,
  isOk,
  map,
  ok,
  unwrap,
  unwrapOr,
} from './result.ts';

describe('result', () => {
  it('constructs ok and err', () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isErr(err('boom'))).toBe(true);
  });

  it('unwraps and falls back', () => {
    expect(unwrap(ok(42))).toBe(42);
    expect(unwrapOr(err('x'), 7)).toBe(7);
    expect(() => unwrap(err(new Error('nope')))).toThrow('nope');
  });

  it('maps only success', () => {
    expect(map(ok(2), (n) => n * 2)).toEqual(ok(4));
    expect(map(err('e'), (n: number) => n * 2)).toEqual(err('e'));
  });

  it('captures throwing functions', () => {
    expect(
      fromThrowable(() => {
        throw new Error('bad');
      }),
    ).toEqual(err(new Error('bad')));
    expect(fromThrowable(() => 5)).toEqual(ok(5));
  });

  it('captures rejected promises', async () => {
    expect(await fromPromise(Promise.resolve(1))).toEqual(ok(1));
    const r = await fromPromise(Promise.reject(new Error('rejected')));
    expect(isErr(r)).toBe(true);
  });
});
