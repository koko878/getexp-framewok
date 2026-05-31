import { env, loadConfig } from '@getexp/core';
import { z } from 'zod';

const schema = z.object({
  SERVICE_NAME: z.string().default('marketplace-api'),
  NODE_ENV: env.nodeEnv(),
  LOG_LEVEL: env.logLevel().default('info'),
  PORT: env.port().default(8787),
  // The Anthropic key stays server-side. Optional so the service boots without
  // it; LLM endpoints return a 503 Problem Details when it is missing.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),
  ANTHROPIC_EFFORT: z.string().default('xhigh'),
});

export type Config = z.infer<typeof schema>;

export const config: Config = loadConfig(schema);
