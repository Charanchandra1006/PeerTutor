const axios = require('axios');
const config = require('../../config/env');
const apiResponse = require('../../utils/apiResponse');

class AiController {
  async generateLearningPath(req, res) {
    try {
      const { target_subject, weeks = 4 } = req.body;
      if (!target_subject) {
        return apiResponse.error(res, 'VALIDATION_ERROR', 'target_subject is required', 400);
      }
      try {
        const response = await axios.post(`${config.ai.engineUrl}/learning-path`, {
          student_id: req.user._id.toString(),
          target_subject,
          weeks
        }, { timeout: 3000 });
        return res.status(200).json(response.data);
      } catch (err) {
        // Fallback mock if AI engine is not running
        const mockResponse = {
          summary: `Personalized ${weeks}-week learning path for ${target_subject}.`,
          plan: Array.from({ length: weeks }).map((_, i) => ({
            title: `Week ${i + 1}: Core Concepts`,
            hours: 5,
            topics: [
              { title: 'Introduction & Fundamentals', description: 'Basic terminology and principles.' },
              { title: 'Practical Applications', description: 'Hands-on practice exercises.' }
            ],
            resources: ['Official Documentation', 'Video Tutorial']
          }))
        };
        return res.status(200).json(mockResponse);
      }
    } catch (error) {
      return apiResponse.error(res, 'AI_ENGINE_ERROR', 'Failed to generate learning path', 500);
    }
  }
}

module.exports = new AiController();
