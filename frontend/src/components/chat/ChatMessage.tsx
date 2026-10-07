import React from 'react';
import { ChatMessage as ChatMessageType, Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { UpsellCard } from '../recommendation/UpsellCard';
import { CrossSellCard } from '../recommendation/CrossSellCard';
import { Bot, User } from 'lucide-react';
import { PaymentButton } from '../checkout/PaymentButton';
import { useCommerceContext } from '../../context/CommerceContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TableView from '../common/TableView';


interface ChatMessageProps {
  message: ChatMessageType;
  onViewProductDetails: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  addingProductId: string | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onViewProductDetails,
  onAddToCart,
  addingProductId,
}) => {
  const isUser = message.sender === 'user';
  const { updateOrderStatus, addAuditLog, setOrderId, orders } = useCommerceContext();

  // Check if the order associated with this payment message has already been paid
  const isOrderAlreadyPaid = React.useMemo(() => {
    if (!message.payment) return false;
    const orderId = message.payment?.order_id || (message.payment as any).order_id;
    if (!orderId) return false;
    const order = orders.find((o) => o.order_id === orderId);
    return order && (order.status === 'paid' || order.payment_status === 'paid');
  }, [message.payment, orders]);

  return (
    <div className={`message-row ${isUser ? 'user-message' : 'agent-message'}`}>
      <div className={`avatar ${isUser ? 'avatar-user' : 'avatar-agent'}`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="bubble-wrapper" style={{ maxWidth: '100%' }}>
        <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-agent'}`}>
          {(() => {
            const lines = (message.text || '').split('\n');
            // find first pipe-table block
            let tableStart = -1;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim().startsWith('|')) {
                tableStart = i;
                break;
              }
            }

            if (tableStart === -1) {
              return (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              );
            }

            // collect contiguous table lines (including separator lines)
            let tableEnd = tableStart;
            for (let i = tableStart + 1; i < lines.length; i++) {
              const l = lines[i].trim();
              if (l === '' || l.startsWith('|') || /^\|?\s*:-/.test(l) || /^:-/.test(l)) {
                tableEnd = i;
                continue;
              }
              // stop when non-table line encountered
              break;
            }

            const before = lines.slice(0, tableStart).join('\n');
            const tableText = lines.slice(tableStart, tableEnd + 1).join('\n');
            const after = lines.slice(tableEnd + 1).join('\n');

            return (
              <>
                {before && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown>
                )}

                <TableView tableMarkdown={tableText} />

                {after && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown>
                )}
              </>
            );
          })()}
        </div>


        {/* Structured Product Results */}
        {message.products && message.products.length > 0 && (
          <div className="products-grid-chat">
            {(() => {
              const seen = new Set<string>();
              const unique = message.products!.filter((p) => {
                const name = (p.name || '').trim().toLowerCase();
                if (!name) return true;
                if (seen.has(name)) return false;
                seen.add(name);
                return true;
              });

              return unique.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onViewDetails={onViewProductDetails}
                  onAddToCart={onAddToCart}
                  isAddingToCart={addingProductId === prod.id}
                />
              ));
            })()}
          </div>
        )}

        {/* Upsell Recommendation */}
        {message.upsell && message.upsell.available && (
          <UpsellCard
            upsell={message.upsell}
            onSelectUpgrade={(upgradedProduct) => onAddToCart(upgradedProduct)}
            onViewProduct={onViewProductDetails}
          />
        )}

        {/* Cross-Sell Recommendations */}
        {message.crossSell && message.crossSell.length > 0 && (
          <CrossSellCard
            products={(() => {
              const seen = new Set<string>();
              return message.crossSell!.filter((p) => {
                const name = (p.name || '').trim().toLowerCase();
                if (!name) return true;
                if (seen.has(name)) return false;
                seen.add(name);
                return true;
              });
            })()}
            onAddToCart={onAddToCart}
            onViewProduct={onViewProductDetails}
            addingProductId={addingProductId}
          />
        )}

        {/* Payment UI (shown when backend/agent provides payment payload) */}
        {message.payment && !isOrderAlreadyPaid && (
          <div style={{ marginTop: 12 }}>
            <PaymentButton
              paymentData={message.payment}
              onPaymentSuccess={(verified) => {
                const oid = message.payment?.order_id || (message.payment as any).order_id;
                if (oid) {
                  updateOrderStatus(oid, 'paid', verified.payment_id || verified.razorpay_payment_id);
                  setOrderId(oid);
                }
                addAuditLog(
                  'Payment Verified',
                  'Backend verified Razorpay signature',
                  'Backend System',
                  `Payment ${verified.payment_id || verified.razorpay_payment_id} confirmed for order ${oid}`,
                  'completed'
                );
              }}
              onPaymentFailure={(reason) => {
                const oid = message.payment?.order_id;
                if (oid) updateOrderStatus(oid, 'payment_failed');
                addAuditLog('Payment Failed', 'Gateway declined or verification failed', 'Razorpay Gateway', reason || 'Payment failed', 'failed');
              }}
            />
          </div>
        )}

        {/* Show status if payment is already completed */}
        {message.payment && isOrderAlreadyPaid && (
          <div style={{ 
            marginTop: 12, 
            padding: '8px 12px', 
            backgroundColor: 'var(--color-success)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            ✓ Payment completed successfully for order {message.payment?.order_id || (message.payment as any).order_id}
          </div>
        )}

        <div className="message-timestamp">{message.timestamp}</div>
      </div>
    </div>
  );
};
