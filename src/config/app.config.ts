import { registerAs } from '@nestjs/config';
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'dev',
  port: parseInt(process.env.PORT ?? '3000', 10),
}));
