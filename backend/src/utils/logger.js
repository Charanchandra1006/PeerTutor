const winston = require('winston');
const config = require('../config/env');

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

/**
 * Custom format for development console output
 */
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

/**
 * Winston structured logger
 * - Production: JSON format for log aggregation (Loki/ELK)
 * - Development: Colorized console output
 * - No console.log anywhere in production code
 */
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  defaultMeta: { service: 'ptm-api' },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    splat()
  ),
  transports: [],
  exitOnError: false,
});

if (config.env === 'production') {
  // JSON logs for production (compatible with Loki, ELK, etc.)
  logger.add(
    new winston.transports.Console({
      format: combine(json()),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
} else {
  // Colorized dev output
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), devFormat),
    })
  );
}

module.exports = logger;
