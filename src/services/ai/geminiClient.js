const config = require("../../config/config");
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function enhanceTaskDescription({ title = "", description = "" }) {
  const { enabled, apiKey } = config.ai?.gemini || {};

  if (!enabled) {
    const err = new Error("Gemini AI is disabled");
    err.code = "AI_DISABLED";
    err.status = 503;
    throw err;
  }
  if (!apiKey) {
    const err = new Error("Missing GEMINI_API_KEY");
    err.code = "AI_MISSING_API_KEY";
    err.status = 500;
    throw err;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt =
      "You are an assistant that rewrites task descriptions to be clear, concise, and actionable." +
      " Keep the user's intent. Use neutral, professional tone. Make it self-contained and easy to understand." +
      " If steps are implied, summarize them as bullet points. Do not add imaginary details.";

    const userPrompt = `Rewrite and enhance the following task description.
Return only the improved description text.

Title: ${title || "(no title provided)"}

Original Description:
${description}`;

    const result = await model.generateContent(
      `${systemPrompt}\n\n${userPrompt}`
    );
    const enhanced = result.response.text().trim();

    if (!enhanced) {
      const err = new Error("Gemini API returned no content");
      err.code = "AI_EMPTY_RESPONSE";
      err.status = 502;
      throw err;
    }

    return enhanced.slice(0, 8000);
  } catch (error) {
    const err = new Error(error.message || "Gemini API error");
    err.code = "AI_HTTP_ERROR";
    err.status = 500;
    throw err;
  }
}

module.exports = {
  enhanceTaskDescription,
};
