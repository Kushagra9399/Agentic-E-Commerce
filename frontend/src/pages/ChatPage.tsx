import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Product } from '../types';
import { useCommerceContext } from '../context/CommerceContext';

export const ChatPage: React.FC = () => {
  const {
    messages,
    isLoadingChat,
    sendMessage,
    addToCart,
    addingProductId,
  } = useCommerceContext();
  const navigate = useNavigate();

  const handleViewProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="app-main-layout">
      <ChatWindow
        messages={messages}
        isLoading={isLoadingChat}
        onSendMessage={sendMessage}
        onViewProductDetails={handleViewProduct}
        onAddToCart={addToCart}
        addingProductId={addingProductId}
      />
    </div>
  );
};
