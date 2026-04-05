const chatbotService = require('../services/chatbot-service');

async function query(req, res) {
  const response = await chatbotService.askLocalModel({
    prompt: req.body?.prompt,
    history: req.body?.history || [],
  });

  res.status(200).json({ data: response });
}

module.exports = {
  query,
};
