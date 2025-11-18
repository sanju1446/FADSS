const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const USERS_FILE = "./users.json";

// Signup
app.post("/signup", (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.json({ success: false, msg: "All fields required" });

    let users = [];
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    }

    const exists = users.find(u => u.username === username);

    if (exists)
        return res.json({ success: false, msg: "Username already exists" });

    users.push({ username, email, password });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true });
});

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!fs.existsSync(USERS_FILE))
        return res.json({ success: false });

    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const valid = users.find(u => u.username === username && u.password === password);

    if (!valid)
        return res.json({ success: false });

    res.json({ success: true });
});

app.listen(3000, () => console.log("Running at: http://localhost:3000/login.html"));
