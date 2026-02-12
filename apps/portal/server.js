require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');
const BROADCAST_API_BASE = process.env.BROADCAST_API_BASE || "http://127.0.0.1:8000";
const BROADCAST_CACHE = path.join(__dirname, "backend", "broadcast.json");
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* -----------------------------------------------------------
   EXPRESS + STATIC + SESSION
----------------------------------------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.get("/", (req, res) => res.redirect("/login.html"));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

/* -----------------------------------------------------------
   READ + WRITE USERS TO JSON
----------------------------------------------------------- */
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE)); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/* -----------------------------------------------------------
   MULTER STORAGE FOR PROFILE PICTURES
----------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeId = req.user?.id || Date.now().toString();
    cb(null, `pfp_${safeId}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

/* -----------------------------------------------------------
   GOOGLE HELPERS
----------------------------------------------------------- */
function findUserByProviderId(providerId) {
  return readUsers().find(u => u.providerId === providerId);
}

function createUserFromGoogle(profile) {
  const users = readUsers();

  const email = profile.emails?.[0]?.value || "";
  let username = email ? email.split("@")[0] : profile.displayName.replace(/\s+/g, "").toLowerCase();

  // Unique username
  let base = username;
  let n = 1;
  while (users.find(u => u.username === username)) {
    username = base + n;
    n++;
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    provider: "google",
    providerId: profile.id,
    isAdmin: false
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

/* -----------------------------------------------------------
   PASSPORT (Google OAuth)
----------------------------------------------------------- */
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  const user = readUsers().find(u => u.id === id);
  done(null, user || false);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`
},
  (accessToken, refreshToken, profile, done) => {
    let user = findUserByProviderId(profile.id);
    if (!user) user = createUserFromGoogle(profile);
    return done(null, user);
  }));

/* -----------------------------------------------------------
   SIGNUP
----------------------------------------------------------- */
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.json({ success: false, msg: "Please Enter Valid Details" });

  const users = readUsers();
  if (users.some(u => u.username === username || u.email === email))
    return res.json({ success: false, msg: "Username or Email already exists" });

  users.push({
    id: Date.now().toString(),
    username,
    email,
    password,
    isAdmin: false
  });

  writeUsers(users);
  res.json({ success: true });
});

/* -----------------------------------------------------------
   LOGIN (JWT)
----------------------------------------------------------- */
/* -----------------------------------------------------------
   LOGIN (JWT)
----------------------------------------------------------- */
// LOGIN (JWT) with lastLogin and lastLocation
app.post("/login", (req, res) => {
  const { username, password, location } = req.body;
  const cleanInput = username ? username.trim().toLowerCase() : "";

  const users = readUsers();

  // Find user by username OR email (case-insensitive)
  const user = users.find(u =>
    (u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput) &&
    u.password === password
  );

  if (!user) return res.json({ success: false, msg: "Invalid username/email or password" });

  // Update lastLogin and lastLocation
  user.lastLogin = Date.now();
  if (location && typeof location === "object") {
    user.lastLocation = {
      city: location.city || null,
      lat: location.lat || null,
      lon: location.lon || null
    };
  }
  writeUsers(users);

  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    isAdmin: user.isAdmin,
    pfp: user.pfp || null
  });
});

/* -----------------------------------------------------------
   VERIFY JWT
----------------------------------------------------------- */
function verifyJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false, msg: "No token" });

  const token = header.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET || "dev_secret", (err, decoded) => {
    if (err) return res.status(403).json({ success: false, msg: "Invalid token" });
    req.user = decoded;
    next();
  });
}

/* -----------------------------------------------------------
   PROFILE PROTECT (Unused but kept)
----------------------------------------------------------- */
app.get("/profile/:id", verifyJWT, (req, res) => {
  if (req.user.id !== req.params.id)
    return res.status(403).json({ msg: "Forbidden" });

  res.json({ success: true, user: readUsers().find(u => u.id === req.params.id) });
});

/* -----------------------------------------------------------
   GOOGLE AUTH ROUTES
----------------------------------------------------------- */
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
      if (err) {
        console.error("Google Auth Error:", err);
        return res.redirect("/login.html?error=google_auth_failed");
      }
      if (!user) {
        return res.redirect("/login.html?error=no_user");
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.redirect("/auth/google/success");
      });
    })(req, res, next);
  }
);


app.get("/auth/google/success", (req, res) => {
  if (!req.user) return res.redirect("/login.html");

  // Update lastLogin for Google users
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (user) {
    user.lastLogin = Date.now();
    writeUsers(users);
  }

  // Create JWT for Google login
  const token = jwt.sign(
    {
      id: req.user.id,
      username: req.user.username,
      isAdmin: req.user.isAdmin
    },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );

  res.send(`
    <script>
      // store token
      localStorage.setItem("fadss_token", "${token}");

      // store admin status
      localStorage.setItem("fadss_isAdmin", "${req.user.isAdmin ? "true" : "false"}");

      // store username
      localStorage.setItem("fadss_logged_user", "${req.user.username}");

      // store profile picture (if any)
      localStorage.setItem("fadss_profile_img", "${(user && user.pfp) ? user.pfp : ""}");

      // redirect
      if (${req.user.isAdmin}) {
        window.location.href = "/admin.html";
      } else {
        window.location.href = "/dashboard.html";
      }
    </script>
  `);
});



/* -----------------------------------------------------------
   EMAIL SETUP
----------------------------------------------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* -----------------------------------------------------------
   FORGOT PASSWORD
----------------------------------------------------------- */
function sendVerificationEmail(to, code) {
  return transporter.sendMail({
    from: `"FADSS Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: "FADSS Password Reset Code",
    html: `<h2>Password Reset Code</h2><h1>${code}</h1><p>Expires in 10 minutes.</p>`
  });
}

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ success: false, msg: "Email not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetCode = code;
  user.resetExpires = Date.now() + 10 * 60 * 1000;
  writeUsers(users);

  await sendVerificationEmail(email, code);
  res.json({ success: true, msg: "Verification code sent!" });
});

/* -----------------------------------------------------------
   VERIFY RESET CODE
----------------------------------------------------------- */
app.post("/verify-reset-code", (req, res) => {
  const { email, code } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ success: false, msg: "Email not found" });
  if (!user.resetCode) return res.json({ success: false, msg: "No reset request" });
  if (user.resetCode !== code) return res.json({ success: false, msg: "Invalid code" });
  if (Date.now() > user.resetExpires) return res.json({ success: false, msg: "Code expired" });

  res.json({ success: true });
});

/* -----------------------------------------------------------
   RESET PASSWORD
----------------------------------------------------------- */
app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ success: false, msg: "Email not found" });

  user.password = newPassword;
  delete user.resetCode;
  delete user.resetExpires;

  writeUsers(users);
  res.json({ success: true });
});

/* -----------------------------------------------------------
   ADMIN MIDDLEWARE
----------------------------------------------------------- */
function adminOnly(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    const users = readUsers();
    const user = users.find(u => u.id === decoded.id);

    if (!user || !user.isAdmin)
      return res.status(403).json({ success: false, msg: "Not admin" });

    next();
  } catch {
    return res.status(403).json({ success: false, msg: "Invalid token" });
  }
}

/* -----------------------------------------------------------
   ADMIN: GET ALL USERS
----------------------------------------------------------- */
app.get("/admin/users", adminOnly, (req, res) => {
  const users = readUsers();
  res.json({ success: true, users });
});

/* -----------------------------------------------------------
   ADMIN: DELETE USER
----------------------------------------------------------- */
app.delete("/admin/user/:id", adminOnly, (req, res) => {
  const id = req.params.id;
  let users = readUsers().filter(u => u.id !== id);

  writeUsers(users);
  res.json({ success: true });
});

/* -----------------------------------------------------------
   ADMIN: MAKE ADMIN
----------------------------------------------------------- */
app.post("/admin/make-admin/:id", adminOnly, (req, res) => {
  const id = req.params.id;
  const users = readUsers();
  const u = users.find(user => user.id === id);

  if (!u) return res.json({ success: false, msg: "User not found" });

  u.isAdmin = true;
  writeUsers(users);

  res.json({ success: true });
});

/* -----------------------------------------------------------
   ADMIN: REMOVE ADMIN
----------------------------------------------------------- */
app.post("/admin/remove-admin/:id", adminOnly, (req, res) => {
  const id = req.params.id;
  const users = readUsers();
  const u = users.find(user => user.id === id);

  if (!u) return res.json({ success: false, msg: "User not found" });

  u.isAdmin = false;
  writeUsers(users);

  res.json({ success: true });
});
// Only store lat/lon for lastLocation (no city needed)
app.post("/user/location", verifyJWT, (req, res) => {
  const { lat, lon } = req.body;
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });
  user.lastLocation = { lat: lat || null, lon: lon || null };
  writeUsers(users);
  res.json({ success: true });
});

/* -----------------------------------------------------------
   PROFILE API (CURRENT USER + PROFILE PICTURE UPLOAD)
----------------------------------------------------------- */
app.get("/api/me", verifyJWT, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.resetCode;
  delete safeUser.resetExpires;
  res.json({ success: true, user: safeUser });
});

app.post("/api/profile/picture", verifyJWT, upload.single("pfp"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, msg: "No file uploaded" });
  }

  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  // Remove old picture file if it was stored in uploads
  if (user.pfp && user.pfp.startsWith("/uploads/")) {
    const oldPath = path.join(__dirname, "public", user.pfp.replace("/uploads/", "uploads/"));
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (_) {
        // ignore delete errors
      }
    }
  }

  user.pfp = `/uploads/${req.file.filename}`;
  writeUsers(users);

  res.json({ success: true, pfp: user.pfp });
});

app.delete("/api/profile/picture", verifyJWT, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  if (user.pfp && user.pfp.startsWith("/uploads/")) {
    const oldPath = path.join(__dirname, "public", user.pfp.replace("/uploads/", "uploads/"));
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (_) {
        // ignore delete errors
      }
    }
  }

  user.pfp = null;
  writeUsers(users);

  res.json({ success: true });
});

/* -----------------------------------------------------------
   BROADCAST PROXY ENDPOINTS
----------------------------------------------------------- */
async function fetchBroadcastService(pathSuffix, options = {}) {
  const response = await fetch(`${BROADCAST_API_BASE}${pathSuffix}`, options);
  const data = await response.json();
  return { response, data };
}

function readBroadcastCache() {
  try {
    if (!fs.existsSync(BROADCAST_CACHE)) return null;
    return JSON.parse(fs.readFileSync(BROADCAST_CACHE));
  } catch {
    return null;
  }
}

function writeBroadcastCache(message) {
  const payload = {
    message,
    timestamp: new Date().toISOString()
  };
  try {
    const dir = path.dirname(BROADCAST_CACHE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BROADCAST_CACHE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.warn("Failed to write broadcast cache", e.message);
  }
  return payload;
}

app.post("/broadcast", adminOnly, async (req, res) => {
  const message = (req.body.message || "").trim();
  if (!message) {
    return res.status(400).json({ success: false, msg: "Message cannot be empty" });
  }

  try {
    const { response, data } = await fetchBroadcastService("/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    // Also keep local cache in sync for dashboard fallback
    writeBroadcastCache(message);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Broadcast service unreachable, falling back to local cache", err.message);
    const cached = writeBroadcastCache(message);
    // Still report success so admin UX is smooth even if Python stack is down
    return res.json({
      success: true,
      msg: "Broadcast saved locally (Python/Celery offline).",
      cached: true,
      broadcast: cached
    });
  }
});

app.get("/broadcast/latest", async (req, res) => {
  try {
    const { response, data } = await fetchBroadcastService("/broadcast/latest");
    return res.status(response.status).json(data);
  } catch (err) {
    console.warn("Using cached broadcast due to service offline");
    const cached = readBroadcastCache();
    if (cached) {
      return res.json({
        message: cached.message || null,
        timestamp: cached.timestamp || null,
        cached: true
      });
    }
    return res.status(503).json({ message: null, timestamp: null, msg: "Broadcast service unavailable" });
  }
});

/* -----------------------------------------------------------
   GROQ CHAT ENDPOINT
----------------------------------------------------------- */

/* GPT CHAT ENDPOINT (Groq - free) */
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  try {
    const answer = await model(message);
    res.json({
      success: true,
      reply: answer
    });

  } catch (err) {
    console.log("❌ GROQ ERROR:", err);
    res.status(500).json({ success: false, msg: err.message });
  }
});


const { GoogleGenAI, Type } = require("@google/genai");

const API_KEY = process.env.GEM_API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = async (inputText) => {
  try {
    const prompt = `Act like your are a professional farmer advisory system and ans it under 2 to 3 sentences for ${inputText}`;

    const contents = { parts: [{ text: prompt }] };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error generating response:", error);
    let msg = "Failed to generate a response from the AI model.";
    if (error instanceof Error) msg += ` Details: ${error.message}`;
    throw new Error(msg);
  }
};


/* -----------------------------------------------------------
   START SERVER
----------------------------------------------------------- */
app.listen(process.env.PORT, () =>
  console.log("Running at: http://localhost:3000/login.html")
);
