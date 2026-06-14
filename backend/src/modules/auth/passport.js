const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User } = require('./auth.model');
const config = require('../../config/env');
const walletService = require('../wallet/wallet.service');
const logger = require('../../utils/logger');

/**
 * Google OAuth2 Strategy
 * Enabled only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.
 */
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(null, false, { message: 'No email found in Google profile' });
          }

          // Optional: enforce college domain
          const domain = config.college.emailDomain;
          if (domain && !email.endsWith(domain)) {
            return done(null, false, {
              message: `Only ${domain} email addresses are allowed`,
            });
          }

          // Find existing user by google_id or email
          let user = await User.findOne({
            $or: [{ google_id: profile.id }, { email }],
          });

          if (user) {
            // Link google_id if not already linked
            if (!user.google_id) {
              user.google_id = profile.id;
              await user.save();
            }
            user.last_login = new Date();
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              email,
              name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
              google_id: profile.id,
              profile_photo_url: profile.photos?.[0]?.value || '',
              role: 'student',
              is_email_verified: true,
              is_active: true,
            });

            // Create wallet with welcome credits
            await walletService.createWallet(user._id);
            logger.info('New Google OAuth user created', { userId: user._id, email });
          }

          return done(null, user);
        } catch (error) {
          logger.error('Google OAuth error', { error: error.message });
          return done(error, null);
        }
      }
    )
  );

  logger.info('Google OAuth2 strategy configured');
} else {
  logger.warn('Google OAuth2 not configured — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

// Passport serialization (not using sessions, but required by passport)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
