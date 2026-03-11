const https = require("https");

const options = {
  hostname: "eccouncil.test.instructure.com",
  path: "/api/v1/courses",
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_ADMIN_TOKEN_HERE"
  }
};

const req = https.request(options, res => {
  console.log("STATUS:", res.statusCode);
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => console.log("BODY:", data.substring(0, 300)));
});

req.on("error", e => {
  console.error("ERROR:", e.message);
});

req.end();
