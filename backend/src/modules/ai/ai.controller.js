const axios = require('axios');
const config = require('../../config/env');
const apiResponse = require('../../utils/apiResponse');

class AiController {
  async generateLearningPath(req, res) {
    try {
      const { target_subject, weeks = 4 } = req.body;
      const response = await axios.post(`${config.ai.engineUrl}/learning-path`, {
        student_id: req.user._id.toString(),
        target_subject,
        weeks
      });
      return res.status(200).json(response.data);
    } catch (error) {
      return apiResponse.error(res, 'AI_ENGINE_ERROR', 'Failed to generate learning path from AI engine', 500);
    }
  }
}

module.exports = new AiController();
