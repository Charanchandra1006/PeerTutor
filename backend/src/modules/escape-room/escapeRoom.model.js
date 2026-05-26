const mongoose = require('mongoose');

const puzzleSchema = new mongoose.Schema({
  puzzle_id: { type: String, required: true }, // e.g. "server_boot", "fix_api"
  type: { 
    type: String, 
    enum: ['code_repair', 'debugging', 'terminal', 'logic_flow', 'network_routing'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  initial_state: { type: mongoose.Schema.Types.Mixed, required: true },
  solution: { type: mongoose.Schema.Types.Mixed, required: true }, // Not sent to client
  hints: [{ type: String }],
  max_score: { type: Number, default: 100 },
  order: { type: Number, required: true },
}, { _id: false });

const escapeRoomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    theme: { type: String, required: true }, // 'server_room', 'ai_lab'
    difficulty: { type: String, enum: ['beginner', 'advanced', 'nightmare'], required: true },
    time_limit_seconds: { type: Number, required: true },
    xp_reward: { type: Number, required: true, default: 50 },
    badge_key: { type: String }, // Awarded upon completion
    is_active: { type: Boolean, default: true },
    puzzles: [puzzleSchema],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const EscapeRoom = mongoose.model('EscapeRoom', escapeRoomSchema);

const puzzleResultSchema = new mongoose.Schema({
  puzzle_id: { type: String, required: true },
  solved: { type: Boolean, default: false },
  time_seconds: { type: Number, default: 0 },
  hints_used: { type: Number, default: 0 },
  mistakes: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
}, { _id: false });

const escapeRoomAttemptSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EscapeRoom', required: true, index: true },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    current_puzzle_index: { type: Number, default: 0 },
    puzzle_results: [puzzleResultSchema],
    total_score: { type: Number, default: 0 },
    coding_score: { type: Number, default: 0 },
    logic_score: { type: Number, default: 0 },
    speed_score: { type: Number, default: 0 },
    accuracy_score: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const EscapeRoomAttempt = mongoose.model('EscapeRoomAttempt', escapeRoomAttemptSchema);

module.exports = { EscapeRoom, EscapeRoomAttempt };
