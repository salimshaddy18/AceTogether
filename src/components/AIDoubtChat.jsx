import React, { useEffect, useRef, useState } from "react";
import { aihelper } from "../helper/AskAI";

export default function AIDoubtChat({
  placeholder = "Ask a doubt...",
  initialMessage = "Hi! I'm your AI study assistant. Ask your doubt and I'll help you understand it better!",
}) {
  const [messages, setMessages] = useState([
    { id: "bot-welcome", sender: "bot", text: initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: input.trim(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    const currentInput = input.trim();
    setInput("");

    try {
      const result = await aihelper(currentInput);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: result.explanation || "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.",
        },
      ]);
    } catch (err) {
      console.error("AI Helper Error:", err);
      const errorMessage = err.message?.includes('API') 
        ? "Sorry, I'm having trouble connecting to my knowledge base. Please try again in a moment."
        : "I encountered an error while processing your question. Please try again.";
      
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear error when user starts typing
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (error) setError(null); 
  };

  const spinnerStyle = {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #666",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="max-w-xl w-full bg-white/90 dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 flex flex-col">

        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Study Assistant
          </h3>
        </div>

        {/* message */}
        <div className="flex-1 overflow-auto space-y-3 mb-3" style={{ maxHeight: "60vh", minHeight: "300px" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-xl ${
                  m.sender === "user"
                    ? "bg-blue-500 text-white rounded-br-none shadow-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-none dark:bg-slate-800 dark:text-gray-100 shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <div style={spinnerStyle}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-slate-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={1}
            disabled={loading}
          />

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <div style={{ ...spinnerStyle, borderTopColor: "white" }}></div>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            )}
            <span className="text-sm">Send</span>
          </button>
        </div>
      </div>
    </>
  );
}
