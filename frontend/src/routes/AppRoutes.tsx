import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { HomePage } from '../pages/HomePage';
import { ChatPage } from '../pages/ChatPage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { UpgradePage } from '../pages/UpgradePage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { PaymentPage } from '../pages/PaymentPage';
import { PaymentSuccessPage } from '../pages/PaymentSuccessPage';
import { PaymentFailedPage } from '../pages/PaymentFailedPage';
import { OrdersPage } from '../pages/OrdersPage';
import { AuditPage } from '../pages/AuditPage';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <main className="app-content-wrapper" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/products/:productId" element={<ProductDetailsPage />} />
            <Route path="/products/:productId/upgrade" element={<UpgradePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/payment/:orderId/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/:orderId/failed" element={<PaymentFailedPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
