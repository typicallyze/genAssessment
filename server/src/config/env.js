import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-me',
  geminiApiKey: process.env.GEMINI_API_KEY,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required env vars
const required = ['databaseUrl', 'jwtSecret'];
for (const key of required) {
  if (!config[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

export default config;
