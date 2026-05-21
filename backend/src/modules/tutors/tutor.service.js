const { TutorProfile, Subject } = require('./tutor.model');
const { User } = require('../auth/auth.model');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

class TutorService {
  /**
   * Create tutor profile
   */
  async createProfile(userId, data) {
    // Check if profile already exists
    const existing = await TutorProfile.findOne({ user_id: userId });
    if (existing) {
      throw new AppError(errorCodes.TUTOR_PROFILE_EXISTS, 'Tutor profile already exists', 409);
    }

    // Validate subjects exist
    const subjects = await Subject.find({ _id: { $in: data.subjects }, is_active: true });
    if (subjects.length !== data.subjects.length) {
      throw new AppError(errorCodes.SUBJECT_NOT_FOUND, 'One or more subjects not found', 400);
    }

    const profile = await TutorProfile.create({
      user_id: userId,
      ...data,
      languages: data.languages || ['English'],
    });

    // Update user role if currently 'student'
    const user = await User.findById(userId);
    if (user.role === 'student') {
      user.role = 'both';
      await user.save();
    }

    logger.info('Tutor profile created', { userId, profileId: profile._id });
    return profile;
  }

  /**
   * Update tutor profile
   */
  async updateProfile(userId, data) {
    const profile = await TutorProfile.findOne({ user_id: userId });
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }

    // Validate subjects if being updated
    if (data.subjects) {
      const subjects = await Subject.find({ _id: { $in: data.subjects }, is_active: true });
      if (subjects.length !== data.subjects.length) {
        throw new AppError(errorCodes.SUBJECT_NOT_FOUND, 'One or more subjects not found', 400);
      }
    }

    Object.assign(profile, data);
    await profile.save();

    logger.info('Tutor profile updated', { userId });
    return profile;
  }

  /**
   * Get tutor profile by user ID
   */
  async getByUserId(userId) {
    const profile = await TutorProfile.findOne({ user_id: userId })
      .populate('user_id', 'name email profile_photo_url role year branch')
      .populate('subjects', 'name code department');
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }
    return profile;
  }

  /**
   * Get tutor profile by profile ID
   */
  async getById(profileId) {
    const profile = await TutorProfile.findById(profileId)
      .populate('user_id', 'name email profile_photo_url role year branch badges')
      .populate('subjects', 'name code department');
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }
    return {
      ...profile.toJSON(),
      completeness: profile.getProfileCompleteness(),
    };
  }

  /**
   * Search and filter tutors (discovery page)
   */
  async searchTutors({ subject, rating_min, credits_max, available_day, language, search, page, limit, sort }) {
    const filter = {};

    // Subject filter
    if (subject) {
      const { escapeRegex } = require('../../utils/sanitize');
      const safeSubject = escapeRegex(subject);
      const subjectDoc = await Subject.findOne({
        $or: [{ _id: subject }, { name: { $regex: safeSubject, $options: 'i' } }],
      });
      if (subjectDoc) {
        filter.subjects = subjectDoc._id;
      }
    }

    // Rating filter
    if (rating_min) {
      filter.avg_rating = { $gte: rating_min };
    }

    // Credit rate filter
    if (credits_max) {
      filter.rate_per_hour = { $lte: credits_max };
    }

    // Availability day filter
    if (available_day !== undefined) {
      filter['availability.day'] = available_day;
    }

    // Language filter
    if (language) {
      filter.languages = { $in: [language] };
    }

    // Full-text search on bio
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort options
    const sortMap = {
      rating: { avg_rating: -1 },
      rate: { rate_per_hour: 1 },
      sessions: { total_sessions: -1 },
      newest: { created_at: -1 },
    };

    const skip = (page - 1) * limit;

    const [tutors, total] = await Promise.all([
      TutorProfile.find(filter)
        .populate('user_id', 'name email profile_photo_url year branch is_active')
        .populate('subjects', 'name code')
        .sort(sortMap[sort] || { avg_rating: -1 })
        .skip(skip)
        .limit(limit),
      TutorProfile.countDocuments(filter),
    ]);

    // Filter out inactive users
    const activeTutors = tutors.filter((t) => t.user_id && t.user_id.is_active);

    return { tutors: activeTutors, total, page, limit };
  }

  /**
   * Update availability slots
   */
  async updateAvailability(userId, availability) {
    const profile = await TutorProfile.findOne({ user_id: userId });
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }

    profile.availability = availability;
    await profile.save();

    logger.info('Availability updated', { userId });
    return profile;
  }

  /**
   * Add portfolio item
   */
  async addPortfolioItem(userId, item) {
    const profile = await TutorProfile.findOne({ user_id: userId });
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }

    profile.portfolio.push(item);
    await profile.save();
    return profile;
  }

  /**
   * Add resource to library
   */
  async addResource(userId, resourceData) {
    const profile = await TutorProfile.findOne({ user_id: userId });
    if (!profile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor profile not found', 404);
    }

    profile.resources.push(resourceData);
    await profile.save();

    logger.info('Resource added', { userId, title: resourceData.title });
    return profile;
  }

  /**
   * Search resources across all tutors
   */
  async searchResources({ subject_id, search, page = 1, limit = 20 }) {
    const pipeline = [
      { $unwind: '$resources' },
    ];

    if (subject_id) {
      const mongoose = require('mongoose');
      pipeline.push({
        $match: { 'resources.subject_id': new mongoose.Types.ObjectId(subject_id) },
      });
    }

    if (search) {
      const { escapeRegex } = require('../../utils/sanitize');
      const safeSearch = escapeRegex(search);
      pipeline.push({
        $match: { 'resources.title': { $regex: safeSearch, $options: 'i' } },
      });
    }

    pipeline.push(
      { $sort: { 'resources.uploaded_at': -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'tutor',
        },
      },
      { $unwind: '$tutor' },
      {
        $project: {
          'resources.title': 1,
          'resources.description': 1,
          'resources.file_url': 1,
          'resources.credit_cost': 1,
          'resources.download_count': 1,
          'resources.uploaded_at': 1,
          'tutor.name': 1,
          'tutor.profile_photo_url': 1,
        },
      }
    );

    const resources = await TutorProfile.aggregate(pipeline);
    return resources;
  }

  // ── Subject CRUD ──

  async createSubject(data) {
    const existing = await Subject.findOne({ $or: [{ name: data.name }, { code: data.code }] });
    if (existing) {
      throw new AppError(errorCodes.SUBJECT_ALREADY_EXISTS, 'Subject already exists', 409);
    }
    return Subject.create(data);
  }

  async listSubjects({ department, search, is_active = true }) {
    const filter = { is_active };
    if (department) filter.department = department;
    if (search) {
      const { escapeRegex } = require('../../utils/sanitize');
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { code: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    return Subject.find(filter).sort({ department: 1, name: 1 });
  }

  async updateSubject(id, data) {
    return Subject.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteSubject(id) {
    return Subject.findByIdAndUpdate(id, { is_active: false }, { new: true });
  }
}

module.exports = new TutorService();
