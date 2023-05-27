const stripe = require("stripe");

require("dotenv").config();

const Stripe = stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const createCheckoutSession = async (customerID, price) => {
  const session = await Stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerID,
    line_items: [
      {
        price,
        quantity: 1,
      },
    ],

    success_url: `http://plaintalk.ai/account`,
    cancel_url: `http://plaintalk.ai`,
  });

  return session;
};

const createBillingSession = async (customer) => {
  const session = await Stripe.billingPortal.sessions.create({
    customer,
    return_url: "http://plaintalk.ai",
  });
  return session;
};

const getCustomerByID = async (id) => {
  const customer = await Stripe.customers.retrieve(id);
  return customer;
};

const addNewCustomer = async (email) => {
  const customer = await Stripe.customers.create({
    email,
    description: "New Customer",
  });

  return customer;
};

const createWebhook = (rawBody, sig, secret) => {
  const event = Stripe.webhooks.constructEvent(rawBody, sig, secret);
  return event;
};

module.exports = {
  getCustomerByID,
  addNewCustomer,
  createCheckoutSession,
  createBillingSession,
  createWebhook,
};
