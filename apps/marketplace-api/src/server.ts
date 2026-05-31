import { buildApp } from './app.ts';
import { config } from './config.ts';

const app = buildApp();

app.listen({ port: config.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err, 'server.start_failed');
  process.exit(1);
});
