const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.post("/", (req, res) => {

  try {

    console.log("FEEDBACK RECEIVED");
    console.log(req.body);

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
      answer,
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

      answer,

      rating,

      courseId,

      userId

    });

    console.log("BEFORE SAVE");
    console.log(data);

    fs.writeFileSync(
      file,
      JSON.stringify(
        data,
        null,
        2
      )
    );

    console.log("FEEDBACK SAVED");

    res.json({
      success: true
    });

  } catch (err) {

    console.error(
      "FEEDBACK ERROR:",
      err
    );

    res.status(500).json({
      success: false
    });

  }

});

module.exports = router;