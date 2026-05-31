import { env, loadConfig } from '@getexp/core';
import { z } from 'zod';

const schema = z.object({
  SERVICE_NAME: z.string().default('reference-api-ts'),
  NODE_ENV: env.nodeEnv(),
  LOG_LEVEL: env.logLevel().default('info'),
  PORT: env.port().default(8000),
});

export type Config = z.infer<typeof schema>;

/** Validated at boot — the process refuses to start if the env is malformed. */
export const config: Config = loadConfig(schema);
