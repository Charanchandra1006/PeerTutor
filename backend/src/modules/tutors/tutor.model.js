const mongoose = require('mongoose');

/**
 * Subject Schema
 * Collection: subjects
 */
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      unique: true,
      trim: true,
      index: { unique: true, collation: { locale: 'en', strength: 2 } },
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Text index for search
subjectSchema.index({ name: 'text', code: 'text' });

const Subject = mongoose.model('Subject', subjectSchema);

/**
 * Tutor Profile Schema
 * Collection: tutor_profiles
 */
const tutorProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    }],
    bio: {
      type: String,
      required: [true, 'Bio is required'],
      minlength: [10, 'Bio must be at least 10 characters'],
      maxlength: [500, 'Bio must be at most 500 characters'],
      trim: true,
    },
    rate_per_hour: {
      type: Number,
      required: [true, 'Rate per hour is required'],
      min: [1, 'Rate must be at least 1 credit'],
      max: [500, 'Rate must be at most 500 credits'],
    },
    total_sessions: {
      type: Number,
      default: 0,
    },
    avg_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    total_ratings: {
      type: Number,
      default: 0,
    },
    is_verified_badge: {
      type: Boolean,
      default: false,
    },
    portfolio: [{
      title: { type: String, required: true, maxlength: 100 },
      file_url: { type: String, required: true },
      type: { type: String, enum: ['pdf', 'image', 'link'], default: 'pdf' },
      uploaded_at: { type: Date, default: Date.now },
    }],
    availability: [{
      day: { type: Number, min: 0, max: 6, required: true }, // 0=Sunday, 6=Saturday
      start_time: { type: String, required: true }, // HH:MM format
      end_time: { type: String, required: true },
    }],
    languages: [{
      type: String,
      trim: true,
    }],
    calendly_link: {
      type: String,
      trim: true,
    },
    // Resource Library
    resources: [{
      title: { type: String, required: true },
      description: { type: String },
      file_url: { type: String, required: true },
      subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
      credit_cost: { type: Number, min: 0, max: 10, default: 0 },
      download_count: { type: Number, default: 0 },
      uploaded_at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for search and discovery
tutorProfileSchema.index({ subjects: 1, avg_rating: -1 });
tutorProfileSchema.index({ rate_per_hour: 1 });
tutorProfileSchema.index({ is_verified_badge: 1, avg_rating: -1 });
tutorProfileSchema.index({ 'availability.day': 1, 'availability.start_time': 1 });

// Text index for bio search
tutorProfileSchema.index({ bio: 'text' });

// Virtual: populate user info
tutorProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true,
});

/**
 * Check and award verification badge
 * Criteria: 5+ sessions AND avg rating >= 4.0
 */
tutorProfileSchema.methods.checkVerificationBadge = function () {
  if (this.total_sessions >= 5 && this.avg_rating >= 4.0) {
    this.is_verified_badge = true;
  }
  return this.is_verified_badge;
};

/**
 * Calculate profile completeness percentage
 */
tutorProfileSchema.methods.getProfileCompleteness = function () {
  let score = 0;
  const total = 7;
  if (this.bio && this.bio.length >= 10) score++;
  if (this.subjects && this.subjects.length > 0) score++;
  if (this.rate_per_hour > 0) score++;
  if (this.availability && this.availability.length > 0) score++;
  if (this.languages && this.languages.length > 0) score++;
  if (this.portfolio && this.portfolio.length > 0) score++;
  if (this.calendly_link) score++;
  return Math.round((score / total) * 100);
};

const TutorProfile = mongoose.model('TutorProfile', tutorProfileSchema);

module.exports = { TutorProfile, Subject };
