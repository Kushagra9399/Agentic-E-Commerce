import razorpay

from app.core.config import settings


class PaymentService:

    def __init__(self):

        self.client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET
            )
        )

    def create_payment_order(
        self,
        order_id: str,
        amount: float,
        currency: str = "INR"
    ):

        amount_paise = int(
            round(amount * 100)
        )

        razorpay_order = self.client.order.create(
            {
                "amount": amount_paise,
                "currency": currency,
                "receipt": order_id,
                "notes": {
                    "internal_order_id": order_id
                },
                "payment_capture": 1
            }
        )

        return razorpay_order
    
    
    def verify_payment(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ):

        self.client.utility.verify_payment_signature(
            {
                "razorpay_order_id":
                    razorpay_order_id,

                "razorpay_payment_id":
                    razorpay_payment_id,

                "razorpay_signature":
                    razorpay_signature
            }
        )

        return True

    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ):
        self.client.utility.verify_webhook_signature(
            payload.decode("utf-8"),
            signature,
            settings.RAZORPAY_WEBHOOK_SECRET,
        )

        return True