const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const session = require("express-session");

const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const apiRoutes = require("./routes/apiRoutes")(io);

/* =========================
   SESSION CONFIG
========================= */
app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    sameSite: "lax"
  }
}));

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */
app.use(express.static("public"));
app.use("/pages", express.static("public/pages"));

/* =========================
   ROUTES
========================= */
app.use(authRoutes);
app.use(pageRoutes);
app.use(apiRoutes);

/* =========================
   SOCKET.IO
========================= */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* =========================
   ROOT ROUTE
========================= */
app.get("/", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/auth");
  }

  res.redirect(`/${req.session.admin}/page/dashboard`);
});

/* =========================
   START SERVER
========================= */
http.listen(4000, () =>
  console.log("Server running on port 4000")
);