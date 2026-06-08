const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.post("/", (req, res) => {

  const file = path.join(
    __dirname,
    "../data/feedback.json"
  );

  if (!fs.existsSync(file)) {

    fs.writeFileSync(
      file,
      "[]"
    );

  }

  const {
    question,
    rating,
    courseId,
    userId
  } = req.body;

  const data = JSON.parse(
    fs.readFileSync(
      file,
      "utf8"
    )
  );

  data.push({

    timestamp:
      new Date().toISOString(),

    question,

    rating,

    courseId,

    userId

  });

  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );

  res.json({
    success: true
  });

});

module.exports = router;