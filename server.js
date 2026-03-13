process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();

console.log("Canvas URL:", process.env.CANVAS_BASE_URL);
console.log("Token loaded:", process.env.CANVAS_TOKEN ? "YES" : "NO");

const express = require("express");
const cors = require("cors");
const path = require("path");

const chatRoutes = require("./routes/chat");
const syncRoutes = require("./routes/sync");

const app = express();

app.use(cors());
app.use(express.json());

/* -------------------------------------------------- */
/* API ROUTES */
/* -------------------------------------------------- */

app.use("/chat", chatRoutes);
app.use("/sync", syncRoutes);

/* -------------------------------------------------- */
/* SERVE WIDGET FILES */
/* -------------------------------------------------- */

const path = require("path")

app.use("/widget", express.static(path.join(__dirname, "eccu-canvas-widget")))

/* -------------------------------------------------- */
/* WIDGET LOADER FOR CANVAS LTI */
/* -------------------------------------------------- */

app.get("/widget-loader", (req, res) => {

res.send(`
<html>
<body>

<script>

if(window.parent){

const script = window.parent.document.createElement("script")

script.src = "https://eccu-ai-backend.onrender.com/widget/script.js"

window.parent.document.head.appendChild(script)

const css = window.parent.document.createElement("link")

css.rel = "stylesheet"

css.href = "https://eccu-ai-backend.onrender.com/widget/styles.css"

window.parent.document.head.appendChild(css)

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