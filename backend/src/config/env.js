const Joi = require('joi');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri().required(),
  CORS_ORIGIN: Joi.string().required(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  // MongoDB
  MONGODB_URI: Joi.string().required().description('MongoDB connection string with replica set'),

  // Redis
  REDIS_URL: Joi.string().required().description('Redis connection URL'),

  // JWT
  JWT_SECRET: Joi.string().required().description('HS256 secret key'),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  // College
  COLLEGE_EMAIL_DOMAIN: Joi.string().default('@vardhaman.org'),
  COLLEGE_NAME: Joi.string().default('Vardhaman College of Engineering'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  // SendGrid
  SENDGRID_API_KEY: Joi.string().allow('').default(''),
  SENDGRID_FROM_EMAIL: Joi.string().allow('').default('noreply@ptm.local'),
  SENDGRID_FROM_NAME: Joi.string().default('Peer Tutoring Marketplace'),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().default('http://localhost:3000/api/v1/auth/google/callback'),

  // Calendly
  CALENDLY_API_KEY: Joi.string().allow('').default(''),
  CALENDLY_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // Jitsi
  JITSI_BASE_URL: Joi.string().default('https://meet.jit.si'),
  JITSI_APP_ID: Joi.string().allow('').default(''),
  JITSI_SECRET: Joi.string().allow('').default(''),

  // AI Engine
  AI_ENGINE_URL: Joi.string().default('http://localhost:8000'),
  OLLAMA_BASE_URL: Joi.string().default('http://localhost:11434'),
  OLLAMA_MODEL: Joi.string().default('llama3.2:3b'),

  // Business Rules
  PLATFORM_FEE_PERCENT: Joi.number().min(0).max(100).default(10),
  WELCOME_CREDITS: Joi.number().min(0).default(50),
  CREDITS_EXPIRY_DAYS: Joi.number().min(1).default(180),
  MAX_GROUP_SESSION_SIZE: Joi.number().min(2).max(20).default(8),
  GROUP_DISCOUNT_PERCENT: Joi.number().min(0).max(100).default(60),

  // Rate Limiting
  RATE_LIMIT_PUBLIC: Joi.number().default(100),
  RATE_LIMIT_AUTHENTICATED: Joi.number().default(1000),
  RATE_LIMIT_AUTH_ENDPOINTS: Joi.number().default(5),

  // Monitoring
  SENTRY_DSN: Joi.string().allow('').default(''),
  PROMETHEUS_PORT: Joi.number().default(9090),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const missingVars = error.details.map(d => `  - ${d.message}`).join('\n');
  console.error(`\n❌ Environment validation failed:\n${missingVars}\n`);
  console.error('Copy .env.example to .env and fill in all required values.\n');
  process.exit(1);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  frontendUrl: envVars.FRONTEND_URL,
  corsOrigin: envVars.CORS_ORIGIN,
  logLevel: envVars.LOG_LEVEL,

  mongo: {
    uri: envVars.MONGODB_URI,
  },

  redis: {
    url: envVars.REDIS_URL,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpires: envVars.JWT_ACCESS_EXPIRES,
    refreshExpires: envVars.JWT_REFRESH_EXPIRES,
  },

  college: {
    emailDomain: envVars.COLLEGE_EMAIL_DOMAIN,
    name: envVars.COLLEGE_NAME,
  },

  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },

  sendgrid: {
    apiKey: envVars.SENDGRID_API_KEY,
    fromEmail: envVars.SENDGRID_FROM_EMAIL,
    fromName: envVars.SENDGRID_FROM_NAME,
  },

  google: {
    clientId: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    callbackUrl: envVars.GOOGLE_CALLBACK_URL,
  },

  calendly: {
    apiKey: envVars.CALENDLY_API_KEY,
    webhookSecret: envVars.CALENDLY_WEBHOOK_SECRET,
  },

  jitsi: {
    baseUrl: envVars.JITSI_BASE_URL,
    appId: envVars.JITSI_APP_ID,
    secret: envVars.JITSI_SECRET,
  },

  ai: {
    engineUrl: envVars.AI_ENGINE_URL,
    ollamaBaseUrl: envVars.OLLAMA_BASE_URL,
    ollamaModel: envVars.OLLAMA_MODEL,
  },

  business: {
    platformFeePercent: envVars.PLATFORM_FEE_PERCENT,
    welcomeCredits: envVars.WELCOME_CREDITS,
    creditsExpiryDays: envVars.CREDITS_EXPIRY_DAYS,
    maxGroupSessionSize: envVars.MAX_GROUP_SESSION_SIZE,
    groupDiscountPercent: envVars.GROUP_DISCOUNT_PERCENT,
  },

  rateLimit: {
    public: envVars.RATE_LIMIT_PUBLIC,
    authenticated: envVars.RATE_LIMIT_AUTHENTICATED,
    authEndpoints: envVars.RATE_LIMIT_AUTH_ENDPOINTS,
  },

  sentry: {
    dsn: envVars.SENTRY_DSN,
  },
};
