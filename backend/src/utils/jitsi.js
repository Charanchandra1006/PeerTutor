const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Jitsi Meet room URL generator
 * Uses public meet.jit.si for development
 * Can be configured for self-hosted Jitsi in production
 */

/**
 * Generate a unique Jitsi room URL for a session
 * @param {string} sessionId - MongoDB session ID
 * @param {string} subjectName - Subject for room naming
 * @returns {string} Full Jitsi room URL
 */
const generateJitsiLink = (sessionId, subjectName = 'Session') => {
  const safeId = sessionId ? sessionId.toString() : uuidv4();
  const safeName = subjectName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const roomName = `ptm-${safeName}-${safeId.slice(-8)}`;
  const baseUrl = config.jitsi.baseUrl || 'https://meet.jit.si';
  return `${baseUrl}/${roomName}`;
};

/**
 * Generate JWT token for Jitsi (if using self-hosted with authentication)
 */
const generateJitsiToken = (user, roomName) => {
  // Only needed for self-hosted Jitsi with JWT auth
  if (!config.jitsi.appId || !config.jitsi.secret) {
    return null;
  }

  const jwt = require('jsonwebtoken');
  const payload = {
    context: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.profile_photo_url || '',
      },
    },
    aud: 'jitsi',
    iss: config.jitsi.appId,
    sub: new URL(config.jitsi.baseUrl).hostname,
    room: roomName,
  };

  return jwt.sign(payload, config.jitsi.secret, {
    algorithm: 'HS256',
    expiresIn: '2h',
  });
};

module.exports = { generateJitsiLink, generateJitsiToken };
