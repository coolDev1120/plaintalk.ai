const { Configuration, OpenAIApi } = require("openai");

require("dotenv").config();
require("./src/connect/mongodb");
const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");
const session = require("express-session");
var MemoryStore = require("memorystore")(session);
const UserService = require("./src/user");
const QuestionModel = require("./src/question/question.model");
const MemoModel = require("./src/question/memo.model");
const Stripe = require("./src/connect/stripe");
const setCurrentUser = require("./src/middleware/setCurrentUser");
const ejsMate = require("ejs-mate");
const ejs = require("ejs");

const hasPlan = require("./src/middleware/hasPlan");
const hasCredits = require("./src/middleware/hasCredits");

const flash = require("connect-flash");
const cors = require("cors");

const User = require("./src/user/user.model");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;

const MongoStore = require("connect-mongo");
const questionModel = require("./src/question/question.model");

const app = express();
app.use(
  session({
    store: MongoStore.create({ mongoUrl: process.env.MONGODB }),
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    resave: false,
    secret: "keyboard cat",
  })
);
app.use(flash());
app.use(cors());

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "assets")));

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// GOOGLE MIDDLEWARE
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // Check if user with email exists
        const user = await UserService.getUserByEmail(profile.emails[0].value);

        if (user) {
          // User already exists, log them in
          done(null, user);
        } else {
          // User does not exist, create new user and customer
          const customerInfo = await Stripe.addNewCustomer(
            profile.emails[0].value
          );

          const newUser = await UserService.addUser({
            password: "@ME40#sUidYgf@.,.87gec(*wyqd", // Password not used for OAuth2 users
            username: profile.displayName,
            email: customerInfo.email,
            billingID: customerInfo.id,
            plan: "none",
            endDate: null,
          });

          done(null, newUser);
        }
      } catch (err) {
        done(err);
      }
    }
  )
);
// MICROSOFT MIDDLEWARE
passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: "http://localhost:4242/auth/microsoft/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // Handle the user's information here
      try {
        const email = profile.emails[0].value;
        console.log(`Microsoft ${email}`);

        // Check if the user already exists in the database
        const user = await UserService.getUserByEmail(email);

        if (user) {
          // User already exists, log them in and redirect to account page
          done(null, user);
        } else {
          // User doesn't exist, create a new account for them
          const customerInfo = await Stripe.addNewCustomer(email);

          const newUser = await UserService.addUser({
            password: "@ME40#sUidYgf@.,.87gec(*wyqd", //Not actually used (placeholder)
            username: profile.displayName,
            email: customerInfo.email,
            billingID: customerInfo.id,
            plan: "none",
            endDate: null,
          });

          console.log(
            `A new user signed up and added to DB. The ID for ${email} is ${JSON.stringify(
              customerInfo
            )}`
          );

          done(null, newUser);
        }
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use("/webhook", bodyParser.raw({ type: "application/json" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);

const productToPriceMap = {
  basic: process.env.PRODUCT_BASIC,
  pro: process.env.PRODUCT_PRO,
};

app.get("/", (req, res) => {
  res.render("landing.ejs");
});

app.get(
  "/none",
  [setCurrentUser, hasPlan("none")],
  async function (req, res, next) {
    res.status(200).render("none.ejs");
  }
);

app.get(
  "/basic",
  [setCurrentUser, hasPlan("basic")],
  async function (req, res, next) {
    res.status(200).render("basic.ejs");
  }
);

app.get(
  "/pro",
  [setCurrentUser, hasPlan("pro")],
  async function (req, res, next) {
    res.status(200).render("pro.ejs");
  }
);

app.get("/subscriptions", async (req, res) => {
  let { email } = req.session;
  let customer = await UserService.getUserByEmail(email);
  if (!customer) {
    req.flash("error", "You do not have an account yet!");
    res.redirect("/register");
  } else {
    res.render("subscription.ejs", { customer });
  }
});

// GOOGLE AUTH

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
// Route for handling Google callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    req.session.email = req.user.email;
    res.redirect("/account");
  }
);

// Route for Microsoft authentication
app.get(
  "/auth/microsoft",
  passport.authenticate("microsoft", {
    scope: ["openid", "profile", "email", "User.Read"],
  })
);

// Callback route for Microsoft authentication
app.get(
  "/auth/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/login" }),
  function (req, res) {
    req.session.email = req.user.email;
    res.redirect("/account");
  }
);

app.get("/login", function (req, res) {
  res.render("kit8-login.ejs");
});

app.get("/register", (req, res) => {
  res.render("kit8-signup.ejs");
});

app.get("/usersUtils", async (req, res) => {
  let { email } = req.session;
  let customer = await UserService.getUserByEmail(email);
  res.send(customer);
});

app.get("/account", async function (req, res) {
  let { email } = req.session;
  let customer = await UserService.getUserByEmail(email);
  const questionHistory = await questionModel.find({ email: email });
  const memo = await MemoModel.find({ email: email });
  if (memo.length == 0) {
    memo.push({ memo: '' })
  }
  if (!customer) {
    req.flash("error", "Not Registered!");
    res.redirect("/register");
  } else {
    res.render("account.ejs", { 'customer': customer, 'question': questionHistory, 'memo': memo });
  }
});

app.post("/removehisttory", hasCredits(0), async (req, res) => {
  questionModel.deleteMany({ mainID: 1 }, function(err) {
    if (err) {
      // Handle error here
    } else {
      // Handle success here
    }
  });
});

app.post("/register", async function (req, res) {
  let customerInfo = {};

  const { username, email, password } = req.body;
  console.log(req.body);
  try {
    console.log(`email ${email} does not exist. Making one. `);

    customerInfo = await Stripe.addNewCustomer(email);

    customer = await UserService.addUser({
      password: password,
      username: username,
      email: customerInfo.email,
      billingID: customerInfo.id,
      plan: "none",
      endDate: null,
    });

    console.log(
      `A new user signed up and addded to DB. The ID for ${email} is ${JSON.stringify(
        customerInfo
      )}`
    );

    console.log(`User also added to DB. Information from DB: ${customer}`);

    req.session.email = email;
    res.redirect("/account");
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/register");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  async function (req, res) {
    const { username } = req.body;
    console.log(username);

    let customer = await UserService.getUserByUsername(username);
    const email = customer.email;
    let customerInfo = {};

    customerInfo = await Stripe.getCustomerByID(customer.billingID);
    console.log(
      `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
    );

    req.session.email = email;

    // res.render('account.ejs', {
    //   customer,
    //   customerInfo,
    //   email
    // })

    res.redirect("/account");
  }
);

app.post("/checkout", setCurrentUser, async (req, res) => {
  const customer = req.user;
  const { customerID } = req.body;

  const price = productToPriceMap["pro"];

  try {
    const session = await Stripe.createCheckoutSession(customerID, price);
    console.log("AHHHHHHHHHHHH" + session.id);

    const ms = new Date().getTime();
    const n = new Date();
    n.setTime(ms);

    customer.plan = "none";
    customer.hasTrial = false;
    customer.endDate = n;
    await customer.save();

    res.send({
      sessionId: session.id,
    });
  } catch (e) {
    console.log(e);
    res.status(400);
    return res.send({
      error: {
        message: e.message,
      },
    });
  }
});

app.post("/billing", setCurrentUser, async (req, res) => {
  const { customer } = req.body;
  console.log("customer", customer);

  const session = await Stripe.createBillingSession(customer);
  console.log("session", session);

  res.json({ url: session.url });
});

app.post("/webhook", async (req, res) => {
  let event;
  const sig = req.headers["stripe-signature"];

  try {
    event = Stripe.createWebhook(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(err);
    return res.sendStatus(400);
  }

  const data = event.data.object;

  console.log(event.type, data);
  switch (event.type) {
    case "customer.created":
      console.log(JSON.stringify(data));
      break;
    case "invoice.paid":
      break;
    case "customer.subscription.created": {
      const user = await UserService.getUserByBillingID(data.customer);

      if (data.plan.id == process.env.PRODUCT_BASIC) {
        console.log("You are talking about basic product");
        user.plan = "basic";
        user.credits = 200;
      }

      if (data.plan.id == process.env.PRODUCT_PRO) {
        console.log("You are talking about pro product");
        user.credits = 250;
      }

      user.endDate = new Date(data.current_period_end * 1000);

      await user.save();

      break;
    }
    case "customer.subscription.updated": {
      // started trial
      const user = await UserService.getUserByBillingID(data.customer);

      if (data.plan.id == process.env.PRODUCT_BASIC) {
        console.log("You are talking about basic product");
        user.plan = "basic";
        user.credits = 3;
      }

      if (data.plan.id === process.env.PRODUCT_PRO) {
        console.log("You are talking about pro product");
        user.plan = "pro";
        user.credits = 250;
      }

      const isOnTrial = data.status === "trialing";

      if (isOnTrial) {
        user.hasTrial = false;
        user.endDate = new Date(data.current_period_end * 1000);
      } else if (data.status === "active") {
        user.hasTrial = false;
        user.endDate = new Date(data.current_period_end * 1000);
      }

      if (data.canceled_at) {
        // cancelled
        console.log("You just canceled the subscription" + data.canceled_at);
        user.plan = "none";
        user.hasTrial = false;
        user.endDate = null;
      }
      console.log("actual", user.hasTrial, data.current_period_end, user.plan);

      await user.save();

      console.log("customer changed", JSON.stringify(data));
      break;
    }
    default:
  }
  res.sendStatus(200);
});

let credits;

app.post("/memoChange", async function (req, res) {
  var check = await MemoModel.find({ email: req.session.email, mainID: req.body.mainID });
  var memoValue = req.body.memo;
  if (check.length == 0) {
    const memo = new MemoModel({
      email: req.session.email,
      memo: memoValue,
      mainID: req.body.mainID
    });
    await memo.save();
    res.send({ message: "save" })
  }
  else {
    MemoModel.findOneAndUpdate({ email: req.session.email, mainID: req.body.mainID }, { $set: { memo: memoValue } }, { new: true }, function (err, doc) {
      if (err) throw err;
      console.log(doc);
    });
    res.send({ message: "update" })
  }
});

app.post("/el5", hasCredits(0), async (req, res) => {
  const response = openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Explain in depth like i'm 5 years old and seperate into as many short paragraphs possible with line breaks my prompt.
    My prompt: "Guided by the history and tradition that map the essential components of the Nation’s concept of ordered liberty, the Court finds the Fourteenth Amendment clearly does not protect the right to an abortion. Until the latter part of the 20th century, there was no support in American law for a constitutional right to obtain an abortion. No state constitutional provision had recognized such a right. Until a few years before Roe, no federal or state court had recognized such a right. Nor had any scholarly treatise. Indeed, abortion had long been a crime in every single State. At common law, abortion was criminal in at least some stages of pregnancy and was regarded as unlawful and could have very serious consequences at all stages. American law followed the common law until a wave of statutory restrictions in the 1800s expanded criminal liability for abortions. By the time the Fourteenth Amendment was adopted, three-quarters of the States had made abortion a crime at any stage of pregnancy. This consensus endured until the day Roe was decided. Roe either ignored or misstated this history, and Casey declined to reconsider Roe’s faulty historical analysis."
    You : The court is talking about the rules around when people can have an abortion. the Fourteenth Amendment is part of the US Constituation that talks about people's rights. The court says that the fourteenth amendment does not protect the right to have an abortion. 
    They also say that for a long time in the United States, it was illegal to have an abortion. This means that it was a crime to do it. No court or important book said that people had a right to have an abortion until the 20th century. This was a big change from before. 
    The court thinks that the Roe v. Wade decision, which said that people did have a right to an abortion, was wrong. They say that Roe did not look at the history of abortion being illegal in the United States. Another court case, called Casey, also didn't look at this history.
    My prompt:"${req.body.prompt}" You:`,
    temperature: 0.2,
    top_p: 0.1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 3000,
  });

  let chatHistory = req.session.chatHistory || [];

  response.then(async (data) => {
    const question = new QuestionModel({
      email: req.session.email,
      question: req.body.prompt,
      answer: data.data.choices[0].text,
      mainID: 1
    });
    await question.save();

    if (!chatHistory.includes(req.body.prompt)) {
      chatHistory.push(req.body.prompt);
      req.session.chatHistory = chatHistory;
      let { email } = req.session;
      let customer = await UserService.getUserByEmail(email);
      customer.credits -= 1;
      await customer.save();
      res.send({ message: data.data.choices[0].text });
    } else {
      res.send({ message: data.data.choices[0].text });
    }
  });
});

app.post("/simplytext", hasCredits(0), async (req, res) => {
  const response = openai.createCompletion({
    model: "text-davinci-003",
    prompt: `${req.body.prompt}. Can you please explain simply that to me like I am 5 years old? Here's what I want you to do: Please break your explanation into short paragraphs with line breaks.`,
    temperature: 0.2,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    max_tokens: 3000,
  });

  response.then(async (data) => {
    let { email } = req.session;
    let customer = await UserService.getUserByEmail(email);
    customer.credits -= 1;
    await customer.save();

    res.send({ message: data.data.choices[0].text });
  });
});

app.post("/clarifytext", hasCredits(0), async (req, res) => {
  const response = openai.createCompletion({
    model: "text-davinci-003",
    prompt: `${req.body.prompt}. Explain in depth but in layman term and separate into as many short paragraphs possible with line breaks my prompt.`,
    temperature: 0.2,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    max_tokens: 3000,
  });

  response.then(async (data) => {
    let { email } = req.session;
    let customer = await UserService.getUserByEmail(email);
    customer.credits -= 1;
    await customer.save();

    res.send({ message: data.data.choices[0].text });
  });
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.clearCookie("connect.sid", { maxAge: -1 });
    res.redirect("/");
  });
});

const token = process.env.API_TOKEN;
const configuration = new Configuration({ apiKey: token });
const openai = new OpenAIApi(configuration);

app.post("/layman", hasCredits(0), (req, res) => {
  const response = openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Explain in depth but in layman term and seperate into as many short paragraphs possible with line breaks my prompt. My prompt:"Guided by the history and tradition that map the essential components of the Nation’s concept of ordered liberty, the Court finds the Fourteenth Amendment clearly does not protect the right to an abortion. Until the latter part of the 20th century, there was no support in American law for a constitutional right to obtain an abortion. No state constitutional provision had recognized such a right. Until a few years before Roe, no federal or state court had recognized such a right. Nor had any scholarly treatise. Indeed, abortion had long been a crime in every single State. At common law, abortion was criminal in at least some stages of pregnancy and was regarded as unlawful and could have very serious consequences at all stages. American law followed the common law until a wave of statutory restrictions in the 1800s expanded criminal liability for abortions. By the time the Fourteenth Amendment was adopted, three-quarters of the States had made abortion a crime at any stage of pregnancy. This consensus endured until the day Roe was decided. Roe either ignored or misstated this history, and Casey declined to reconsider Roe’s faulty historical analysis."
    You:The statement is about a court ruling that says the US Constitution's Fourteenth Amendment doesn't protect the right to have an abortion. The court bases this decision on the fact that historically, there was no legal support  for a constitutional right to have an abortion in the United States until the 20th century. 
    Prior to this time, there was no state or federal court that recognised such a right. In fact, abortion was considered a crime in every state and was regarded as illegal throughout pregnancy. 
    This belief that abortion was a crime was reflected in the common law, which guided American law until the 1800s when statutory restrictions expanded criminal liability for abortions. By the time the Fourteenth Amendment was adopted, abortion was considered a crime in 75% of states.  
    The court believes that the Roe v. Wade decision, which recognised the right to an abortion, was wrong because it did not consider this history of abortion being illegal. Similarly, the Casey decision, which upheld Roe, also ignored or misstated this history 
    
    My prompt:"${req.body.prompt}" You:`,
    temperature: 0.2,
    top_p: 0.1,
    frequency_penalty: 0,
    presence_penalty: 1,
    max_tokens: 1024,
  });

  let chatHistory = req.session.chatHistory || [];
  console.log(chatHistory);

  response.then(async (data) => {
    if (!chatHistory.includes(req.body.prompt)) {
      chatHistory.push(req.body.prompt);
      req.session.chatHistory = chatHistory;
      let { email } = req.session;
      let customer = await UserService.getUserByEmail(email);
      customer.credits -= 1;
      await customer.save();
      res.send({ message: data.data.choices[0].text });
    } else {
      res.send({ message: data.data.choices[0].text });
    }
  });
});

app.get("/privacy", (req, res) => {
  res.render("privacy.ejs");
});

const port = process.env.PORT || 4242;

app.listen(port, () => console.log(`Listening on port ${port}!`));
