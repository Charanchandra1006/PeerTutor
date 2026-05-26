const { EscapeRoom, EscapeRoomAttempt } = require('./escapeRoom.model');
const gamificationService = require('../users/gamification.service');
const { AppError } = require('../../middleware/errorHandler');
const axios = require('axios');
const env = require('../../config/env');

class EscapeRoomService {
  async getRooms(filters = {}) {
    return EscapeRoom.find({ is_active: true, ...filters }).select('-puzzles.solution');
  }

  async getRoomById(roomId) {
    const room = await EscapeRoom.findById(roomId).select('-puzzles.solution');
    if (!room) throw new AppError('ROOM_NOT_FOUND', 'Escape room not found', 404);
    return room;
  }

  async startAttempt(userId, roomId) {
    // Check if there is already an active attempt
    const existing = await EscapeRoomAttempt.findOne({ user_id: userId, room_id: roomId, status: 'in_progress' });
    if (existing) return existing;

    const room = await EscapeRoom.findById(roomId);
    if (!room) throw new AppError('ROOM_NOT_FOUND', 'Escape room not found', 404);

    const attempt = await EscapeRoomAttempt.create({
      user_id: userId,
      room_id: roomId,
      started_at: new Date(),
      status: 'in_progress',
      current_puzzle_index: 0,
      puzzle_results: room.puzzles.map(p => ({
        puzzle_id: p.puzzle_id,
        solved: false,
        time_seconds: 0,
        hints_used: 0,
        mistakes: 0,
        score: 0
      }))
    });

    return attempt;
  }

  async getAttempt(attemptId, userId) {
    const attempt = await EscapeRoomAttempt.findOne({ _id: attemptId, user_id: userId });
    if (!attempt) throw new AppError('ATTEMPT_NOT_FOUND', 'Attempt not found', 404);
    return attempt;
  }

  async requestHint(attemptId, userId, puzzleId) {
    const attempt = await this.getAttempt(attemptId, userId);
    if (attempt.status !== 'in_progress') throw new AppError('GAME_OVER', 'Attempt is not in progress', 400);

    const room = await EscapeRoom.findById(attempt.room_id);
    const puzzle = room.puzzles.find(p => p.puzzle_id === puzzleId);
    if (!puzzle) throw new AppError('PUZZLE_NOT_FOUND', 'Puzzle not found', 404);

    const resultIndex = attempt.puzzle_results.findIndex(r => r.puzzle_id === puzzleId);
    const hintsUsed = attempt.puzzle_results[resultIndex].hints_used;

    if (hintsUsed >= puzzle.hints.length) {
      throw new AppError('NO_MORE_HINTS', 'No more hints available for this puzzle', 400);
    }

    attempt.puzzle_results[resultIndex].hints_used += 1;
    await attempt.save();

    return { hint: puzzle.hints[hintsUsed] };
  }

  async submitPuzzle(attemptId, userId, puzzleId, answerPayload) {
    const attempt = await this.getAttempt(attemptId, userId);
    if (attempt.status !== 'in_progress') throw new AppError('GAME_OVER', 'Attempt is not in progress', 400);

    const room = await EscapeRoom.findById(attempt.room_id);
    const puzzle = room.puzzles.find(p => p.puzzle_id === puzzleId);
    const resultIndex = attempt.puzzle_results.findIndex(r => r.puzzle_id === puzzleId);

    // Call AI Engine for validation depending on puzzle type, or do strict equality here for V1
    let isCorrect = false;

    if (puzzle.type === 'logic_flow') {
      isCorrect = JSON.stringify(answerPayload.order) === JSON.stringify(puzzle.solution.correct_order);
    } else if (puzzle.type === 'code_repair') {
      // Very basic validation for V1: remove whitespace and compare, or just exact string match
      const normalize = str => str.replace(/\s+/g, '');
      isCorrect = normalize(answerPayload.code) === normalize(puzzle.solution.code);
    } else if (puzzle.type === 'terminal') {
      // Check last command or sequence
      const isSequenceCorrect = JSON.stringify(answerPayload.command_sequence) === JSON.stringify(puzzle.solution.command_sequence);
      isCorrect = isSequenceCorrect || answerPayload.keyword === puzzle.solution.answer_keyword;
    }

    if (!isCorrect) {
      attempt.puzzle_results[resultIndex].mistakes += 1;
      await attempt.save();
      return { correct: false, message: 'Incorrect solution. Try again!' };
    }

    // Correct!
    attempt.puzzle_results[resultIndex].solved = true;
    
    // Calculate score
    const maxScore = puzzle.max_score;
    const mistakes = attempt.puzzle_results[resultIndex].mistakes;
    const hints = attempt.puzzle_results[resultIndex].hints_used;
    const deduction = (mistakes * 10) + (hints * 15);
    attempt.puzzle_results[resultIndex].score = Math.max(10, maxScore - deduction);

    // Move to next puzzle or complete
    if (attempt.current_puzzle_index < room.puzzles.length - 1) {
      attempt.current_puzzle_index += 1;
    } else {
      // Room completed
      attempt.status = 'completed';
      attempt.completed_at = new Date();
      attempt.total_score = attempt.puzzle_results.reduce((acc, curr) => acc + curr.score, 0);
      attempt.coding_score = attempt.total_score; // simplified for V1
      attempt.logic_score = attempt.total_score; // simplified for V1

      // Award XP & Badge
      await gamificationService.addXP(userId, room.xp_reward, `Completed Escape Room: ${room.title}`);
      if (room.badge_key) {
        await gamificationService.grantBadge(userId, room.badge_key);
      }
    }

    await attempt.save();

    return { 
      correct: true, 
      score: attempt.puzzle_results[resultIndex].score,
      status: attempt.status,
      next_puzzle_index: attempt.current_puzzle_index
    };
  }

  async getMyAttempts(userId) {
    return EscapeRoomAttempt.find({ user_id: userId })
      .populate('room_id', 'title theme difficulty')
      .sort({ created_at: -1 });
  }
}

module.exports = new EscapeRoomService();
