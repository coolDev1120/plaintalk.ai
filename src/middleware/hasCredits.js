const UserService = require("../user");

module.exports = function hasCredits(amount) {
  return async function (req, res, next) {
    if (!req.session.email) {
      const message = `You are not a user!`;
      res.status(403).json({ message: message });
    } else {
      const email = req.session.email;
      const user = await UserService.getUserByEmail(email);
      const userCredits = user.credits;

      if (userCredits > amount) {
        // user has enough credits, proceed to next middleware
        next();
      } else {
        // user does not have enough credits, send error message
        const message = `No more credits. Please buy more credits through our pro plan by visiting /subscriptions, or by clicking "Buy Subscription" in the navbar above`;
        res.status(403).json({ message: message });
      }
    }
  };
};
