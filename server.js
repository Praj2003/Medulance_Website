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

app.get("/internSuccess",(req,res) =>{
  res.render("internSuccess.ejs",{
    requestId : null
  })
})

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

app.get("/FAQ", (req, res) => {
  res.render("faq.ejs");
});

app.get("/contactSuccess", (req, res) => {
  res.render("contactSuccess.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.get("/teleConfirm", (req, res) => {
  res.render("telemedicineConfirm.ejs", {
    requestId: null,
  });
});


app.get("/checkStatus", async (req, res) => {
  res.render("checkStatus.ejs", {
    statusMessage: null,
  });
});

app.get("/internStatus",(req,res) =>{
  res.render("checkInternStatus.ejs",{
    statusMessage : null
  })
})

app.get("/tele", (req, res) => {
  res.render("telemedicineDetails.ejs");
});

app.get("/internship", (req, res) => {
  res.render("intern.ejs");
});

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

app.post("/internStatus",async(req,res) =>{
  let message = "";
  const id = req.body.applicationNumber;

  try{
    const input = await db.query("SELECT * FROM internship_applications WHERE application_id = $1",[id]);

    if(input.rows.length > 0){
      let result = input.rows[0].status;

      if (result == "Approved") {
        message += `The Status for the Application Number ${id} is : ${result}, Internship Letter would be provided by us within 48 hours.`;
      }

      if (result == "Pending") {
        message += `The Status for the Application Number ${id} is : ${result}, We will inform you when approaved`;
      }
    }

    res.render("checkInternStatus.ejs",{
      statusMessage : message
    })

    
  }catch(err){
    res.render("checkInternStatus.ejs",{
      statusMessage : "Provided application number is not found on our records please crosscheck",
    })

  }
})
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const input = await db.query(
      "INSERT INTO contact(name,email,message) VALUES ($1, $2, $3)",
      [name, email, message]
    );
    console.log(input);
    res.redirect("/contactSuccess");
  } catch (err) {
    console.error("Error while saving feedback: ", err);
    res.status(500).send({
      message: "There is some internal error while saving your feedback",
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

app.post("/internship", async (req, res) => {
  const { studentName, age, contactNumber, email, course } = req.body;

  console.log(req.body);
  try {
    const input = await db.query(
      "SELECT * FROM internship_applications WHERE contact_number = $1",
      [contactNumber]
    );

    if (input.rows.length > 0) {
      res.status(200).send({
        message: "Your request is already there",
      });
    } else {
      let result = await db.query(
        "INSERT INTO internship_applications (student_name, age, contact_number, email, course) VALUES ($1, $2, $3, $4, $5) RETURNING application_id",
        [studentName, age, contactNumber, email, course]
      );

     const requestId = await result.rows[0].application_id;
     
     console.log(requestId);

     res.render("internSuccess.ejs",{
      requestId : requestId
     })
     

    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "There is some error in uploading!",
    });
  }
});

app.post("/emergency_services", async (req, res) => {
  const patient = req.body.patientName;
  const contact = req.body.contactNumber;
  const response = req.body.requestTime;
  const location = req.body.location;
  const condition = req.body.patientCondition;

  try {
    const input = await db.query(
      "SELECT * FROM emergency_ambulance_requests WHERE contact_number = $1",
      [contact]
    );

    if (input.rows.length > 0) {
      res.status(400).send({
        message:
          "Your response has already been recieved by us check for the status",
      });
    } else {
      let insert = await db.query(
        "INSERT INTO emergency_ambulance_requests(patient_name,contact_number,request_time,location,condition) VALUES($1,$2,$3,$4,$5)",
        [patient, contact, response, location, condition]
      );

      console.log(insert);

      const answer = await db.query(
        "SELECT request_id FROM emergency_ambulance_requests WHERE contact_number = $1",
        [contact]
      );
      let id = answer.rows[0].request_id;
      res.render("emergencyConfirmation.ejs", {
        requestId: id,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/checkStatus", async (req, res) => {
  let statusMessage = "";
  try {
    const id = req.body.applicationNumber;
    let input = await db.query(
      "SELECT * FROM emergency_ambulance_requests WHERE request_id = $1",
      [id]
    );
    if (input.rows.length > 0) {
      const status = input.rows[0].status;

      if (status == "Approved") {
        statusMessage += `The Status for the Application Number ${id} is : ${status}, Ambulance is coming to your location in 10 mins.`;
      }

      if (status == "Pending") {
        statusMessage += `The Status for the Application Number ${id} is : ${status}.`;
      }
      res.render("checkStatus.ejs", {
        statusMessage: statusMessage,
      });
    } else {
      res.render("checkStatus.ejs", {
        statusMessage:
          "Provided application number is not found on our records please crosscheck",
      });
    }
  } catch (err) {
    res.render("checkStatus.ejs", {
      statusMessage: "There is some error while checking your status!",
    });
  }
});

app.post("/tele", async (req, res) => {
  const {
    patient_name,
    age,
    gender,
    contact_number,
    symptoms,
    consultation_method,
    consultation_purpose,
  } = req.body;

  try {
    const existingRequest = await db.query(
      "SELECT * FROM tele WHERE contact_number = $1",
      [contact_number]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).send({
        message: "We have already received your request",
      });
    } else {
      const insertQuery = `
        INSERT INTO tele (patient_name, age, gender, contact_number, symptoms, consultation_method, consultation_purpose) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const values = [
        patient_name,
        age,
        gender,
        contact_number,
        symptoms,
        consultation_method,
        consultation_purpose,
      ];

      const result = await db.query(insertQuery, values);

      console.log("Insert Result:", result); // Add this line to debug
      if (result.rows.length > 0) {
        const requestId = result.rows[0].request_id;

        res.render("telemedicineConfirm.ejs", {
          requestId: requestId,
        });
      } else {
        throw new Error("Insert query did not return request_id");
      }
    }
  } catch (err) {
    console.error("Error inserting telemedicine request:", err);
    return res.status(500).send({
      message:
        "There was an error while storing your information. Please try again later.",
    });
  }
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

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
    }
  )
);

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
