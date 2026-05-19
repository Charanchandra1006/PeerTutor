const { User } = require('../auth/auth.model');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

class UserService {
  /**
   * Get user profile by ID
   */
  async getById(userId) {
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const allowedFields = ['name', 'year', 'branch', 'learning_style', 'profile_photo_url', 'timetable'];
    const filteredData = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    }).select('-password_hash');

    if (!user) {
      throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    // Check profile completeness
    if (user.checkProfileComplete() && !user.is_profile_complete) {
      user.is_profile_complete = true;
      await user.save();
    }

    logger.info('Profile updated', { userId });
    return user;
  }

  /**
   * Get all users (admin — paginated)
   */
  async listUsers({ page = 1, limit = 20, role, search, is_active }) {
    const filter = {};
    if (role) filter.role = role;
    if (typeof is_active === 'boolean') filter.is_active = is_active;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash').sort({ created_at: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Save/unsave a tutor
   */
  async toggleSaveTutor(userId, tutorId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);

    const index = user.saved_tutors.indexOf(tutorId);
    if (index > -1) {
      user.saved_tutors.splice(index, 1);
    } else {
      user.saved_tutors.push(tutorId);
    }
    await user.save();
    return { saved: index === -1, saved_tutors: user.saved_tutors };
  }

  /**
   * Get saved tutors list
   */
  async getSavedTutors(userId) {
    const user = await User.findById(userId).populate('saved_tutors', 'name email profile_photo_url');
    if (!user) throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    return user.saved_tutors;
  }

  /**
   * Suspend/activate user (admin)
   */
  async setUserActive(userId, isActive) {
    const user = await User.findByIdAndUpdate(
      userId,
      { is_active: isActive },
      { new: true }
    ).select('-password_hash');
    if (!user) throw new AppError(errorCodes.USER_NOT_FOUND, 'User not found', 404);
    logger.info(`User ${isActive ? 'activated' : 'suspended'}`, { userId });
    return user;
  }
}

module.exports = new UserService();
