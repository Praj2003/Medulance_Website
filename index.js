const express = require("express");
const serverConfig = require("./config/server.config");
const pg = require("pg");
const bodyParser = require("body-parser");
const path = require('path');
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
require('dotenv').config();

const app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret : process.env.SESSION_SECRET,
  resave : false,
  saveUninitialized: true,
  cookie : {maxAge : 100000} 
})); 

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// PostgreSQL client setup
const db = new pg.Client({
  user : process.env.DB_USERNAME,
  database : process.env.DB_DATABASE,
  host : process.env.DB_HOST,
  password : process.env.DB_PASSWORD,
  port : process.env.DB_PORT
});
db.connect();

// Routes
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/accountExists", (req, res) => {
  res.render("accountAware.ejs");
});
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/secrets", authCheck, (req, res) => {
  res.render("secrets.ejs");
});

app.get("/booking", authCheck, (req, res) => {
  res.render("booking.ejs");
});

app.get("/emergency_services", authCheck, (req, res) => {
  res.render("emergencyAmbulance.ejs");
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/errorMessage", (req, res) => {
  res.render("errorMessage.ejs");
});

// Registration endpoint
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // Check if user with the same email exists
    const userQuery = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userQuery.rows.length > 0) {
      return res.redirect("/accountExists");
    } else {
      await db.query("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", [username, email, hashedPassword]);
      return res.redirect("/");
    }
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send({ message: "Error registering user." });
  }
});

// Login endpoint
app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/errorMessage"
}));

// Booking endpoint
app.post("/booking", authCheck, async (req, res) => {
  const { client_name, client_address, gender, client_location, client_number } = req.body;

  try {
    const input = await db.query("SELECT * FROM ambulance_booking WHERE name = $1", [client_name]);

    if (input.rows.length > 0) {
      res.status(200).send({ message: "We have received your request and will reach out shortly." });
    } else {
      await db.query("INSERT INTO ambulance_booking(name, address, gender, pickup_location, contact_number) VALUES($1, $2, $3, $4, $5)", [client_name, client_address, gender, client_location, client_number]);
      res.redirect("/");
    }
  } catch (err) {
    console.error("Error processing booking:", err);
    res.status(404).send({ message: "Error processing booking." });
  }
});

// Passport local strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        return cb(null, user);
      } else {
        return cb(null, false, { message: "Incorrect password." });
      }
    } else {
      return cb(null, false, { message: "User not found." });
    }
  } catch (err) {
    console.error("Error finding user:", err);
    return cb(err);
  }
}));

// Serialize and deserialize user
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    cb(null, result.rows[0]);
  } catch (err) {
    cb(err);
  }
});

// Authentication check middleware
function authCheck(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Server start
const PORT = serverConfig.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
