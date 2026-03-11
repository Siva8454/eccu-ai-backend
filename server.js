process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();
console.log("Canvas URL:", process.env.CANVAS_BASE_URL);
console.log("Token loaded:", process.env.CANVAS_TOKEN ? "YES" : "NO");


const express = require("express");
const cors = require("cors");

const chatRoutes = require("./routes/chat");
const syncRoutes = require("./routes/sync");   // 👈 ADD THIS


const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoutes);
app.use("/chat", require("./routes/chat"));
app.use("/sync", require("./routes/sync"));

app.listen(3001, () => {
  console.log("ECCU AI Backend running on http://localhost:3001");
});
