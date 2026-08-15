require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();

// Allow requests from your website's domain(s). Update this list once you
// know your live domain — for now it's wide open so testing is easy.
app.use(cors());
app.use(express.json());

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn(
    '⚠️  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. ' +
    'Copy .env.example to .env and fill in your real keys before going live.'
  );
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// In-memory log of orders for this session (swap for a real database later).
const orders = [];

// Health check — useful for confirming the server deployed correctly.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * Create a Razorpay order.
 * Body: { amount: number (rupees), courseName: string, customerName?, customerPhone?, customerEmail? }
 * Returns: { orderId, amount (paise), currency, keyId }
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, courseName, customerName, customerPhone, customerEmail } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'A valid numeric amount (in rupees) is required.' });
    }
    if (!courseName) {
      return res.status(400).json({ error: 'courseName is required.' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: 'tst_' + Date.now(),
      notes: {
        courseName,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
      },
    };

    const order = await razorpay.orders.create(options);

    orders.push({
      orderId: order.id,
      courseName,
      amount: options.amount,
      status: 'created',
      createdAt: new Date().toISOString(),
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

/**
 * Verify a completed payment's signature.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns: { verified: boolean }
 */
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields.' });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;

  const record = orders.find((o) => o.orderId === razorpay_order_id);
  if (record) {
    record.status = isValid ? 'paid' : 'verification_failed';
    record.paymentId = razorpay_payment_id;
  }

  // TODO once this is working: save the paid enrollment to a real database,
  // and/or send yourself a notification (email/WhatsApp API) here.
  if (isValid) {
    console.log('✅ Payment verified:', razorpay_payment_id, 'for order', razorpay_order_id);
  } else {
    console.warn('❌ Payment signature mismatch for order', razorpay_order_id);
  }

  res.json({ verified: isValid });
});

// Simple endpoint to peek at recent orders while testing (remove/secure before production).
app.get('/api/orders', (req, res) => {
  res.json(orders.slice(-50).reverse());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Thrive Skill Tech backend running on port ${PORT}`);
});
