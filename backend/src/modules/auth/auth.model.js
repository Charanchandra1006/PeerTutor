const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Collection: users
 * Per DB Schema doc — all fields, types, constraints, and indexes as specified.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: function () {
        return !this.google_id; // Not required for OAuth users
      },
      select: false, // Never returned in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    role: {
      type: String,
      enum: ['student', 'tutor', 'both', 'admin'],
      required: true,
      default: 'student',
      index: true,
    },
    year: {
      type: Number,
      min: 1,
      max: 5,
    },
    branch: {
      type: String,
      trim: true,
      index: true,
    },
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      index: true,
    },
    profile_photo_url: {
      type: String,
      default: '',
    },
    learning_style: {
      type: String,
      enum: ['visual', 'auditory', 'reading', 'kinesthetic', ''],
      default: '',
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_profile_complete: {
      type: Boolean,
      default: false,
    },
    google_id: {
      type: String,
      sparse: true,
    },
    last_login: {
      type: Date,
    },
    // Gamification fields
    xp_points: {
      type: Number,
      default: 0,
    },
    badges: [{
      type: {
        type: String,
        enum: ['quick_learner', 'session_streak', 'subject_master', 'top_rated', 'most_booked', 'community_pillar', 'first_session', 'bug_hunter', 'system_savior', 'master_debugger', 'escape_artist'],
      },
      earned_at: { type: Date, default: Date.now },
    }],
    saved_tutors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    timetable: {
      type: String, // CSV or JSON stored timetable for smart scheduling
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      transform(doc, ret) {
        delete ret.password_hash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
userSchema.index({ role: 1, is_active: 1 });
userSchema.index({ created_at: -1 });

/**
 * Hash password before saving (bcrypt cost 12)
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  if (this.password_hash) {
    this.password_hash = await bcrypt.hash(this.password_hash, 12);
  }
  next();
});

/**
 * Compare password for login
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

/**
 * Check if profile is complete
 */
userSchema.methods.checkProfileComplete = function () {
  return !!(this.name && this.year && this.branch);
};

const User = mongoose.model('User', userSchema);

/**
 * OTP Schema — stored with TTL index (10 minutes auto-delete)
 */
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 600, // TTL: 10 minutes
  },
});

const OTP = mongoose.model('OTP', otpSchema);

module.exports = { User, OTP };
