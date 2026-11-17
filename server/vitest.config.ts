import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 180000,
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      ADMIN_USER: 'demo',
      ADMIN_PASS: 'demo1234',
      JWT_SECRET: 'test-secret-test-secret',
      JWT_EXPIRES_IN: '1h',
      CLIENT_ORIGIN: 'http://localhost:3030',
      APP_TIMEZONE: 'UTC',
      BCRYPT_ROUNDS: '4',
      LOG_LEVEL: 'silent',
      LOG_TO_FILE: 'false',
      LOG_PRETTY: 'false',
      PORT: '5050',
    },
  },
});
