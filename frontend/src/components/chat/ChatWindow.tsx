import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, Product } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Bot, Sparkles, ShieldCheck } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onViewProductDetails: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  addingProductId: string | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onViewProductDetails,
  onAddToCart,
  addingProductId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <section className="chat-section">
      <div className="chat-banner">
        <div className="chat-banner-text">
          <Sparkles size={15} color="var(--color-accent-purple)" />
          <span>
            <strong>AI Shopping Agent:</strong> Autonomous product search & recommendations.
            Financial decisions require your explicit approval.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <ShieldCheck size={14} color="var(--color-success)" />
          <span>Bounded Commerce Mode</span>
        </div>
      </div>

      <div className="chat-messages-container">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onViewProductDetails={onViewProductDetails}
            onAddToCart={onAddToCart}
            addingProductId={addingProductId}
          />
        ))}

        {isLoading && (
          <div className="message-row agent-message">
            <div className="avatar avatar-agent">
              <Bot size={18} />
            </div>
            <div className="bubble bubble-agent" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span>Searching verified catalog, checking compatibility & upgrades...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </section>
  );
};
