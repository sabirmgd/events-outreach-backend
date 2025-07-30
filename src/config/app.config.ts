import { registerAs } from '@nestjs/config';
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'dev',
  port: parseInt(process.env.PORT ?? '3000', 10),
  tavily: {
    apiKey: process.env.TAVILY_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
}));
