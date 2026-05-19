const { User } = require('../auth/auth.model');
const { Notification } = require('../notifications/notification.model');
const logger = require('../../utils/logger');

// Gamification constraints & rules
const XP_RULES = {
  SESSION_COMPLETED_STUDENT: 10,
  SESSION_COMPLETED_TUTOR: 20,
  REVIEW_SUBMITTED: 5,
  FIVE_STAR_RECEIVED: 15,
};

const BADGES = {
  TUTOR_NOVICE: { name: 'Novice Tutor', reqSessions: 5 },
  TUTOR_PRO: { name: 'Pro Tutor', reqSessions: 20 },
  TUTOR_EXPERT: { name: 'Expert Tutor', reqSessions: 50 },
  RISING_STAR: { name: 'Rising Star', reqAvgRating: 4.8, reqRatings: 10 },
  AVID_LEARNER: { name: 'Avid Learner', reqSessionsAsStudent: 10 },
};

class GamificationService {
  /**
   * Add XP to user and check for level-ups/badges
   */
  async addXP(userId, amount, reason) {
    const user = await User.findById(userId);
    if (!user) return;

    user.xp_points = (user.xp_points || 0) + amount;
    await user.save();

    logger.info('XP added', { userId, amount, reason, totalXp: user.xp_points });
    return user;
  }

  /**
   * Grant a badge if not already owned
   */
  async grantBadge(userId, badgeKey) {
    const badgeConfig = BADGES[badgeKey];
    if (!badgeConfig) return;

    const user = await User.findById(userId);
    if (!user) return;

    const badgeExists = user.badges?.find((b) => b.type === badgeKey);
    if (badgeExists) return; // Already has badge

    user.badges = user.badges || [];
    user.badges.push({
      type: badgeKey,
      awarded_at: new Date(),
    });
    
    await user.save();

    // Notify user
    await Notification.create({
      user_id: userId,
      type: 'badge_earned',
      title: 'New Badge Earned! 🏆',
      message: `Congratulations! You've earned the "${badgeConfig.name}" badge.`,
    });

    logger.info('Badge granted', { userId, badgeKey });
  }

  /**
   * Evaluate if a user should receive any new badges
   * Should be called after sessions/reviews
   */
  async evaluateTutorBadges(tutorUserId, tutorProfile) {
    const sessions = tutorProfile.total_sessions || 0;
    
    if (sessions >= BADGES.TUTOR_EXPERT.reqSessions) await this.grantBadge(tutorUserId, 'TUTOR_EXPERT');
    else if (sessions >= BADGES.TUTOR_PRO.reqSessions) await this.grantBadge(tutorUserId, 'TUTOR_PRO');
    else if (sessions >= BADGES.TUTOR_NOVICE.reqSessions) await this.grantBadge(tutorUserId, 'TUTOR_NOVICE');

    if (tutorProfile.avg_rating >= BADGES.RISING_STAR.reqAvgRating && tutorProfile.total_ratings >= BADGES.RISING_STAR.reqRatings) {
      await this.grantBadge(tutorUserId, 'RISING_STAR');
    }
  }

  async evaluateStudentBadges(studentUserId, completedSessionsCount) {
    if (completedSessionsCount >= BADGES.AVID_LEARNER.reqSessionsAsStudent) {
      await this.grantBadge(studentUserId, 'AVID_LEARNER');
    }
  }
}

module.exports = new GamificationService();
module.exports.XP_RULES = XP_RULES;
