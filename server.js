const express = require("express");
const serverConfig = require("./config/server.config")
const pg = require("pg");
const bodyParser = require("body-parser");
const path = require('path');
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy  =require("passport-local").Strategy;
const session = require("express-session");
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
//setting up the session for user authentication
app.use(session({
  secret : process.env.SESSION_SECRET,
  resave : false,
  saveUninitialized : true,
  cookie : {maxAge : 100000}
}))

app.use(passport.initialize());
app.use(passport.session());


const db = new pg.Client({
    user : process.env.DB_USERNAME,
    database : process.env.DB_DATABASE,
    host : process.env.DB_HOST,
    password : process.env.DB_PASSWORD,
    port : process.env.DB_PORT,   
})

db.connect();

app.get("/login",(req,res) =>{
  res.render("login.ejs");
})

app.get("/accountExists",(req,res) =>{
  res.render("accountAware.ejs");
})

app.get("/register",(req,res) =>{
  res.render("register.ejs");
})

app.get("/",(req,res) =>{
  res.render("home.ejs")
})

app.get("/secrets",(req,res) =>{
  res.render("secrets.ejs")
})

app.get("/booking",authCheck,(req,res) =>{
  res.render("booking.ejs");
})

app.get("/emergency_services",authCheck,(req,res) =>{
  res.render("emergencyAmbulance.ejs");
})

app.get("/about",(req,res) =>{
  res.render("about.ejs");
});

app.get("/errorMessage",(req,res) =>{
  res.render("errorMessage.ejs");
})

app.post("/register", async (req, res) => {
  const { username, email, password} = req.body;

  // Log the request body for debugging
  console.log("Received registration request:", req.body);

  // Ensure password is a string before hashing
  if (typeof password !== 'string') {
    console.error("Password is not a string:", password);
    return res.status(400).send({ message: "Invalid password format." });
  }


  try {
    // Hash the password asynchronously
    const hashedPassword = await bcrypt.hash(password, 8);
    console.log("Hashed password:", hashedPassword);

    // Check if the user already exists
    const userQuery = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userQuery.rows.length > 0) {
      console.log('User already exists:', userQuery.rows[0]);
      return res.redirect("/accountExists");
    } else {
      // Insert new user into the database
      const insertQuery = await db.query("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", [username, email, hashedPassword]);
      console.log('User registered:', insertQuery);
      return res.redirect("/");
    }
  } catch (err) {
    console.error("Error while registering the account:", err);
    return res.status(500).send({
      message: "There is some error while registering the account!"
    });
  }
});

app.post("/login",passport.authenticate("local",{
  successRedirect : "/",
  failureRedirect : "/errorMessage"
}))

app.post("/booking",authCheck,async(req,res) =>{
  const name = req.body.client_name;
  const address = req.body.client_address;
  const gender = req.body.gender;
  const location = req.body.client_location;
  const ContactNumber = req.body.client_number;
  
  try{
    const input = await db.query("SELECT * FROM ambulance_booking where name = $1 ",[name]);

    if(input.rows.length > 0){
      res.status(200).send({
        message : "We have received your request we will reach to you very shortly"
      })
    }else{
      const insert = await db.query("INSERT INTO ambulance_booking(name,address,gender,pickup_location,contact_number) VALUES($1,$2,$3,$4,$5)",[name,address,gender,location,ContactNumber])
      console.log(insert);
      res.redirect("/");
    }
  }catch(err){
    res.status(404).send({
      message : err
    })
  }
  
})

passport.use("local", new LocalStrategy(async function verify(email, password, cb) {
  try {
    console.log("Verifying user with email:", email);

    const input = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (input.rows.length > 0) {
      const user = input.rows[0];
      const storedHashedPassword = user.password;

      bcrypt.compare(password, storedHashedPassword, (err, valid) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return cb(err);
        } else {
          if (valid) {
            console.log("Passwords match, user authenticated:", user);
            cb(null, user); // Passwords match, authenticate user
          } else {
            console.log("Passwords do not match");
            cb(null, false); // Passwords do not match, do not authenticate user
          }
        }
      });
    } else {
      console.log("User not found with email:", email);
      cb("User not Found"); // User with given email not found
    }
  } catch (err) {
    console.error("Error finding user:", err);
    cb(err); // Handle unexpected errors
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

async function authCheck(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login")
}

app.listen(serverConfig.PORT,() =>{
    console.log(`Server is succcessfully running on the port ${serverConfig.PORT}`);
})


