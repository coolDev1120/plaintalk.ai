const publishableKey =
  "pk_test_51Mh3mpCfHvKNkCEv3YFiwQzmVdwxmTjaVrcpRBU3MHIBhqY4boPDkWU6xmOrKarjv6bugsBh3Rg97MaS4Jsh8gga00s9RfkSW0";

const stripe = Stripe(publishableKey);

const checkout = function () {
  const product = "pro";

  fetch("/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      email: customer.email,
    },
    body: JSON.stringify({
      product,
      customerID: customer.billingID,
    }),
  })
    .then((result) => result.json())
    .then(({ sessionId }) =>
      stripe.redirectToCheckout({ sessionId: sessionId })
    );
};

const billing = function () {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      email: customer.email,
    },
    body: JSON.stringify({
      customer: customer.billingID,
    }),
  };

  fetch("/billing", requestOptions)
    .then((response) => response.json())
    .then((result) => window.location.replace(result.url))
    .catch((error) => console.log("error", error));
};
