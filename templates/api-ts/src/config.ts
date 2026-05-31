import { env, loadConfig } from '@getexp/core';
import { z } from 'zod';

const schema = z.object({
  SERVICE_NAME: z.string().default('__APP_NAME__'),
  NODE_ENV: env.nodeEnv(),
  LOG_LEVEL: env.logLevel().default('info'),
  PORT: env.port().default(8000),
});

export type Config = z.infer<typeof schema>;

export const config: Config = loadConfig(schema);
