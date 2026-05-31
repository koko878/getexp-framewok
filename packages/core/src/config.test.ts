import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConfigError, env, loadConfig } from './config.ts';

const schema = z.object({
  NODE_ENV: env.nodeEnv(),
  PORT: env.port(),
});

describe('config', () => {
  it('parses and coerces a valid environment', () => {
    const cfg = loadConfig(schema, { NODE_ENV: 'production', PORT: '8080' });
    expect(cfg).toEqual({ NODE_ENV: 'production', PORT: 8080 });
  });

  it('fails fast with a readable summary', () => {
    expect(() => loadConfig(schema, { PORT: 'not-a-number' })).toThrow(ConfigError);
  });
});
