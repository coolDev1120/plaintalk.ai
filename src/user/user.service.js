const addUser =
  (User) =>
  ({ password, username, email, billingID, plan, endDate }) => {
    if (!email || !username || !billingID || !plan) {
      throw new Error(
        "Missing Data. Please provide values for email, billingID, plan"
      );
    }

    const user = new User({ username, email, billingID, plan, endDate });
    return User.register(user, password);
  };

const getUsers = (User) => () => {
  return User.find({});
};

const getUserByUsername = (User) => async (username) => {
  return await User.findOne({ username });
};

const getUserByEmail = (User) => async (email) => {
  return await User.findOne({ email });
};

const getUserByBillingID = (User) => async (billingID) => {
  return await User.findOne({ billingID });
};

const updatePlan = (User) => (email, plan) => {
  return User.findOneAndUpdate({ email, plan });
};

module.exports = (User) => {
  return {
    addUser: addUser(User),
    getUsers: getUsers(User),
    getUserByUsername: getUserByUsername(User),
    getUserByEmail: getUserByEmail(User),
    updatePlan: updatePlan(User),
    getUserByBillingID: getUserByBillingID(User),
  };
};
