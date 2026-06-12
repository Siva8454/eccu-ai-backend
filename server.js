process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();

console.log("Canvas URL:", process.env.CANVAS_BASE_URL);
console.log("Token loaded:", process.env.CANVAS_TOKEN ? "YES" : "NO");

const express = require("express");
const cors = require("cors");
const path = require("path");

const chatRoutes = require("./routes/chat");
const syncRoutes = require("./routes/sync");
const analyticsRoutes = require("./routes/analytics");
console.log("Analytics Route Loaded");

const feedbackRoutes =
  require("./routes/feedback");

  const dashboardRoutes =
  require("./routes/dashboard");


const app = express();

app.disable("x-powered-by");

app.use(cors({
  origin: [
    "https://eccouncil.instructure.com"
  ],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {

  res.setHeader(
    "X-XSS-Protection",
    "1; mode=block"
  );

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  next();

});

app.use((req, res, next) => {

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'self' https://eccouncil.instructure.com"
    ].join("; ")
  );

  next();

});

const testRetriever = require("./routes/testRetriever");



app.use("/test-retriever", testRetriever);
/* -------------------------------------------------- */
/* SERVE WIDGET STATIC FILES */
/* -------------------------------------------------- */

app.use("/widget", express.static(path.join(__dirname, "eccu-canvas-widget")));

/* -------------------------------------------------- */
/* API ROUTES */
/* -------------------------------------------------- */

app.use("/chat", chatRoutes);
app.use("/sync", syncRoutes);
app.use("/analytics", analyticsRoutes);
app.use(
  "/feedback",
  feedbackRoutes
);
app.use(
  "/dashboard",
  dashboardRoutes
);

/* -------------------------------------------------- */
/* WIDGET LOADER FOR CANVAS */
/* -------------------------------------------------- */

app.get("/widget-loader", (req, res) => {

res.send(`
<html>
<body>

<script>

if(window.parent){

const script = window.parent.document.createElement("script");
script.src = "https://aitutor.eccu.edu/widget/script.js";
window.parent.document.head.appendChild(script);

const css = window.parent.document.createElement("link");
css.rel = "stylesheet";
css.href = "https://aitutor.eccu.edu/widget/styles.css";
window.parent.document.head.appendChild(css);

}

</script>

</body>
</html>
`);

});

/* -------------------------------------------------- */
/* START SERVER */
/* -------------------------------------------------- */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
console.log(`ECCU AI Backend running on port ${PORT}`);
});