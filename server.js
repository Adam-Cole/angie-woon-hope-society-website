require("dotenv").config();

const express = require("express");
const Stripe = require("stripe");
const path = require("path");

const products = require("./data/products.json");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BASE_URL = process.env.BASE_URL;

// Webhook route must be registered before express.json()
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      return res.status(400).send("Invalid webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status === "paid") {
        // TODO: Persist the paid order in a database,
        // exactly once, using session.id.
        console.log("Payment received:", session.id);
      }
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      // TODO: Fulfill the associated order once.
    }

    res.sendStatus(200);
  }
);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/create-checkout-session", async (req, res) => {
  try {
    const cart = req.body.cart;

    if (!Array.isArray(cart) ||
        cart.length === 0 ||
        cart.length > 50) {
      return res.status(400).json({
        error: "Invalid shopping cart."
      });
    }

    const line_items = cart.map(item => {
      let name;
      let amount;

      if (item.type === "donation") {
        // Donation amount is supplied by the customer.
        // Validate it independently of merchandise prices.
        if (item.quantity !== 1) {
          throw new Error("Invalid donation quantity");
        }

        amount = Math.round(Number(item.price) * 100);

        if (!Number.isSafeInteger(amount) ||
            amount < 100 || amount > 10000000) {
          throw new Error("Invalid donation amount");
        }

        name = "Donation to Angie Woon Hope Society";
      } else {
        const product = products.find(
          p => String(p.id) === String(item.productId)
        );

        if (!product || product.available === false) {
          throw new Error("Product unavailable");
        }

        const sizes = Array.isArray(product.sizes)
          ? product.sizes : [];

        if (sizes.length && !sizes.includes(item.size)) {
          throw new Error("Invalid product size");
        }

        const price = Number(product.price);
        amount = Math.round(price * 100);

        if (!Number.isSafeInteger(amount) || amount < 1) {
          throw new Error("Invalid product price");
        }

        name = product.name +
          (item.size ? ` - ${item.size}` : "");
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) ||
          quantity < 1 || quantity > 10) {
        throw new Error("Invalid quantity");
      }

      return {
        price_data: {
          currency: "cad",
          product_data: { name },
          unit_amount: amount
        },
        quantity
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted_page",
      line_items,
      billing_address_collection: "auto",
      success_url: `${BASE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/#cart`
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("Checkout error:", error.message);

    res.status(400).json({
      error: "Unable to start checkout. Please review your cart."
    });
  }
});

// Get all available products
app.get("/api/products", (req, res) => {
  res.json(products.filter(p => p.available !== false));
});

// Get events
app.get("/api/events", (req, res) => {
  res.json(require("./data/events.json"));
});

// Get prize donations
app.get("/api/prizes", (req, res) => {
  res.json(require("./data/prizes.json"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Website server started");
});