import React, { useState, FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onQuickPrompt?: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  'Search 4K Smart TVs under ₹60,000',
  'Recommend compatible soundbars',
  'Find high-speed HDMI cables',
  'Show my cart summary',
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onQuickPrompt,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div>
      <div className="quick-prompts-container">
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Sparkles size={12} color="var(--color-primary)" /> Quick queries:
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="quick-prompt-chip"
            onClick={() => {
              if (onQuickPrompt) onQuickPrompt(prompt);
              else onSendMessage(prompt);
            }}
            disabled={isLoading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-input-wrapper">
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ask AI agent for products, specs, budget recommendations, or cart review..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn-send"
            disabled={!text.trim() || isLoading}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
