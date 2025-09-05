import OpenAI from "openai";

const useAPI = import.meta.env.VITE_OPENROUTE_API_KEY;

if (!useAPI) {
  throw new Error("No API specified. Set VITE_OPENROUTE_API_KEY in your .env file");
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: useAPI,
  dangerouslyAllowBrowser: true,
});

export const aihelper = async (prompt) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-8b-instruct:free",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI study assistant.",
        },
        {
          role: "user",
          content: `Please help me understand this: ${prompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const explanation = completion.choices[0].message.content;

    return { 
      explanation: explanation || "I apologize, but I couldn't generate a proper response. Please try rephrasing your question." 
    };

  } catch (error) {
    console.error("OpenAI API Error:", error);
    
    if (error.status === 401) {
      throw new Error("Invalid API key. Please check your VITE_OPENROUTE_API_KEY.");
    } else if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    } else if (error.status >= 500) {
      throw new Error("OpenRouter service is temporarily unavailable. Please try again later.");
    } else {
      throw new Error(error.message || "Failed to get AI response. Please try again.");
    }
  }
};