import { registerAs } from '@nestjs/config';
export default registerAs('db', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  name: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true',
}));
