const express = require("express");
const serverConfig = require("./config/server.config");
const pg = require("pg");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const { name } = require("ejs");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
//setting up the session for user authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.DB_USERNAME,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect();

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

app.get("/FAQ",(req,res) =>{
  res.render("faq.ejs")
})

app.get("/contactSuccess",(req,res) =>{
  res.render("contactSuccess.ejs");
})

app.get("/contact",(req,res) =>{
  res.render("contact.ejs")
})

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Log the request body for debugging
  console.log("Received registration request:", req.body);

  // Ensure password is a string before hashing
  if (typeof password !== "string") {
    console.error("Password is not a string:", password);
    return res.status(400).send({ message: "Invalid password format." });
  }

  try {
    // Hash the password asynchronously
    const hashedPassword = await bcrypt.hash(password, 8);
    console.log("Hashed password:", hashedPassword);

    // Check if the user already exists
    const userQuery = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userQuery.rows.length > 0) {
      console.log("User already exists:", userQuery.rows[0]);
      return res.redirect("/accountExists");
    } else {
      // Insert new user into the database
      const insertQuery = await db.query(
        "INSERT INTO users(username, email, password) VALUES($1, $2, $3)",
        [username, email, hashedPassword]
      );
      console.log("User registered:", insertQuery);
      return res.redirect("/");
    }
  } catch (err) {
    console.error("Error while registering the account:", err);
    return res.status(500).send({
      message: "There is some error while registering the account!",
    });
  }
});

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const input = await db.query("INSERT INTO contact(name,email,message) VALUES ($1, $2, $3)", [name, email, message]);
    console.log(input);
    res.redirect("/contactSuccess");
  } catch (err) {
    console.error("Error while saving feedback: ", err);
    res.status(500).send({
      message: "There is some internal error while saving your feedback"
    });
  }
});


app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/errorMessage",
  })
);

app.post("/booking", authCheck, async (req, res) => {
  const name = req.body.client_name;
  const address = req.body.client_address;
  const gender = req.body.gender;
  const location = req.body.client_location;
  const ContactNumber = req.body.client_number;

  try {
    const input = await db.query(
      "SELECT * FROM ambulance_booking WHERE name = $1 ",
      [name]
    );

    if (input.rows.length > 0) {
      res.status(200).send({
        message:
          "We have received your request we will reach to you very shortly",
      });
    } else {
      const insert = await db.query(
        "INSERT INTO ambulance_booking(name,address,gender,pickup_location,contact_number) VALUES($1,$2,$3,$4,$5)",
        [name, address, gender, location, ContactNumber]
      );
      console.log(insert);
      res.redirect("/");
    }
  } catch (err) {
    res.status(404).send({
      message: err,
    });
  }
});

app.post("/emergency_services",async (req,res) =>{
   const patient = req.body.patientName;
   const contact = req.body.contactNumber;
   const response = req.body.requestTime;
   const location = req.body.location;
   const condition = req.body.patientCondition;

   try{
     const input = await db.query("SELECT * FROM emergency_ambulance_requests WHERE contact_number = $1",[contact]);

     if(input.rows.length > 0){
       res.status(400).send({
        message : "Your response has already been recieved by us check for the status"
       })
     }else{
      let insert = await db.query("INSERT INTO emergency_ambulance_requests(patient_name,contact_number,request_time,location,condition) VALUES($1,$2,$3,$4,$5)",[patient,contact,response,location,condition]);

      console.log(insert);

      const answer = await db.query("SELECT request_id FROM emergency_ambulance_requests WHERE contact_number = $1",[contact]);
      let id = answer.rows[0].request_id
      res.render("emergencyConfirmation.ejs",{
        requestId : id
      })

     }


   }catch(err){
     console.log(err);
   }
})

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

passport.serializeUser((user, cb) => {
  cb(null, user.id); // Serialize user by user ID
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    cb(null, user.rows[0]); // Deserialize user by fetching from database
  } catch (err) {
    cb(err);
  }
});

async function authCheck(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.listen(serverConfig.PORT, () => {
  console.log(
    `Server is succcessfully running on the port ${serverConfig.PORT}`
  );
});
