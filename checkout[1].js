// api/checkout.js
// Vercel Serverless Function — handles Stripe Checkout session creation

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  verify: {
    name: 'Trusty Verify',
    description: 'Full VIN audit, odometer fraud check, stolen vehicle search, AWD/4WD legality, and written certificate.',
    amount: 9900, // $99.00 NZD in cents
  },
  full: {
    name: 'Trusty Full Service',
    description: 'Verify + Negotiate + Glide. Pay $99 now; negotiate success fee applied only on savings made.',
    amount: 9900,
  },
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { service, name, contact, listing, from, to, notes } = req.body;

    const product = PRODUCTS[service] || PRODUCTS.verify;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'nzd',
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            unit_amount: product.amount,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: contact.includes('@') ? contact : undefined,
      metadata: {
        customer_name: name,
        customer_contact: contact,
        listing_url: listing || '',
        service,
        from_city: from || '',
        to_city: to || '',
        notes: notes || '',
      },
      success_url: `${req.headers.origin || process.env.NEXT_PUBLIC_URL}/?success=true`,
      cancel_url: `${req.headers.origin || process.env.NEXT_PUBLIC_URL}/#booking`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
