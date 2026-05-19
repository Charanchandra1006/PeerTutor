const reviewService = require('./review.service');
const apiResponse = require('../../utils/apiResponse');

class ReviewController {
  async submitReview(req, res) {
    const review = await reviewService.submitReview(req.user._id, req.body);
    return apiResponse.created(res, review);
  }

  async getReviewsForTutor(req, res) {
    const { reviews, total, page, limit } = await reviewService.getReviewsForUser(
      req.params.id,
      req.query
    );
    return apiResponse.paginated(res, reviews, page, limit, total);
  }

  async getPendingReviews(req, res) {
    const sessions = await reviewService.getPendingReviews(req.user._id);
    return apiResponse.success(res, sessions);
  }

  async moderateReview(req, res) {
    const review = await reviewService.moderateReview(req.params.id, req.body);
    return apiResponse.success(res, review);
  }

  async getModerationQueue(req, res) {
    const { reviews, total, page, limit } = await reviewService.getModerationQueue(req.query);
    return apiResponse.paginated(res, reviews, page, limit, total);
  }
}

module.exports = new ReviewController();
