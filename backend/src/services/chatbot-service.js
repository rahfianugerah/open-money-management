const env = require('../config/env');
const AppError = require('../utils/app-error');
const { requireNonEmptyString } = require('../utils/validation');

function extractResponseText(payload) {
  if (typeof payload.response === 'string') {
    return payload.response;
  }

  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    return payload.choices[0].message.content;
  }

  return null;
}

async function askLocalModel({ prompt, history = [] }) {
  const normalizedPrompt = requireNonEmptyString(prompt, 'prompt');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.llm.timeoutMs);

  try {
    const response = await fetch(env.llm.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: env.llm.model,
        prompt: normalizedPrompt,
        history,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(`Local LLM endpoint failed with status ${response.status}`, 502);
    }

    const payload = await response.json();
    const text = extractResponseText(payload);

    if (!text) {
      throw new AppError('Local LLM endpoint returned no response text', 502);
    }

    return {
      text,
      model: env.llm.model,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError('Local LLM request timed out', 504);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(`Could not reach local LLM endpoint: ${error.message}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  askLocalModel,
};
