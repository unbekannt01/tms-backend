class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || "groq" // Default to Groq (free)
    this.model = process.env.AI_MODEL || "llama-3.1-70b-versatile"
    this.maxTokens = Number.parseInt(process.env.AI_MAX_TOKENS) || 500
    this.temperature = Number.parseFloat(process.env.AI_TEMPERATURE) || 0.7

    // Initialize the appropriate client based on provider
    this.initializeClient()
  }

  initializeClient() {
    switch (this.provider) {
      case "groq":
        this.apiKey = process.env.GROQ_API_KEY
        this.baseURL = "https://api.groq.com/openai/v1"
        break
      case "gemini":
        this.apiKey = process.env.GOOGLE_API_KEY
        this.baseURL = "https://generativelanguage.googleapis.com/v1beta"
        break
      case "huggingface":
        this.apiKey = process.env.HUGGINGFACE_API_KEY
        this.baseURL = "https://api-inference.huggingface.co/models"
        break
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`)
    }

    if (!this.apiKey) {
      throw new Error(`API key not found for provider: ${this.provider}`)
    }
  }

  /**
   * Make API call to the selected AI provider
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} Generated text response
   */
  async generateText(prompt) {
    try {
      let response

      switch (this.provider) {
        case "groq":
          response = await this.callGroqAPI(prompt)
          break
        case "gemini":
          response = await this.callGeminiAPI(prompt)
          break
        case "huggingface":
          response = await this.callHuggingFaceAPI(prompt)
          break
        default:
          throw new Error(`Unsupported provider: ${this.provider}`)
      }

      return response
    } catch (error) {
      console.error(`[v0] ${this.provider} API Error:`, error)
      throw error
    }
  }

  async callGroqAPI(prompt) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async callGeminiAPI(prompt) {
    const response = await fetch(`${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  }

  async callHuggingFaceAPI(prompt) {
    const response = await fetch(`${this.baseURL}/${this.model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: this.maxTokens,
          temperature: this.temperature,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data[0].generated_text.replace(prompt, "").trim()
  }

  /**
   * Enhance task description using AI to make it more attractive and understandable
   * @param {string} originalDescription - The original task description
   * @param {string} title - Task title for context
   * @param {string} priority - Task priority for context
   * @returns {Promise<Object>} Enhanced description with summary and improvements
   */
  async enhanceTaskDescription(originalDescription, title = "", priority = "medium") {
    try {
      if (!originalDescription || originalDescription.trim().length === 0) {
        throw new Error("Original description is required")
      }

      const prompt = `You are a professional task management assistant. Your job is to enhance task descriptions to make them more attractive, clear, and actionable.

Task Title: "${title}"
Priority: ${priority}
Original Description: "${originalDescription}"

Please provide:
1. An enhanced, professional description that is clear and actionable
2. A brief summary (1-2 sentences)
3. Key action items or deliverables (if applicable)

Make the description:
- Professional and engaging
- Clear and specific
- Action-oriented
- Easy to understand
- Properly formatted

Respond in JSON format:
{
  "enhancedDescription": "Enhanced description here",
  "summary": "Brief summary here",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "estimatedComplexity": "low|medium|high"
}`

      const text = await this.generateText(prompt)

      // Parse the JSON response
      const result = JSON.parse(text)

      return {
        success: true,
        data: {
          original: originalDescription,
          enhanced: result.enhancedDescription,
          summary: result.summary,
          keyPoints: result.keyPoints || [],
          estimatedComplexity: result.estimatedComplexity || "medium",
          enhancedAt: new Date(),
        },
      }
    } catch (error) {
      console.error("[v0] AI Enhancement Error:", error)
      return {
        success: false,
        error: error.message,
        data: {
          original: originalDescription,
          enhanced: originalDescription, // Fallback to original
          summary: originalDescription.substring(0, 100) + "...",
          keyPoints: [],
          estimatedComplexity: "medium",
        },
      }
    }
  }

  /**
   * Generate task summary from detailed description
   * @param {string} description - Task description
   * @returns {Promise<Object>} Generated summary
   */
  async generateTaskSummary(description) {
    try {
      const prompt = `Summarize this task description in 1-2 clear, concise sentences that capture the main objective and key requirements:

"${description}"

Provide only the summary, no additional text.`

      const text = await this.generateText(prompt)

      return {
        success: true,
        summary: text.trim(),
      }
    } catch (error) {
      console.error("[v0] AI Summary Error:", error)
      return {
        success: false,
        error: error.message,
        summary: description.substring(0, 100) + "...",
      }
    }
  }

  /**
   * Suggest improvements for task descriptions
   * @param {string} description - Task description
   * @returns {Promise<Object>} Improvement suggestions
   */
  async suggestImprovements(description) {
    try {
      const prompt = `Analyze this task description and suggest specific improvements to make it clearer, more actionable, and better structured:

"${description}"

Provide suggestions in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "clarity_score": 1-10,
  "missing_elements": ["element 1", "element 2"]
}`

      const text = await this.generateText(prompt)
      const result = JSON.parse(text)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error("[v0] AI Suggestions Error:", error)
      return {
        success: false,
        error: error.message,
        data: {
          suggestions: [],
          clarity_score: 5,
          missing_elements: [],
        },
      }
    }
  }
}

module.exports = new AIService()
