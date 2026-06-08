const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {

  const file = path.join(
    __dirname,
    "../data/analytics.json"
  );

  /* Create file if missing */

  if (!fs.existsSync(file)) {

    fs.writeFileSync(
      file,
      "[]"
    );

  }

  const data = JSON.parse(
    fs.readFileSync(
      file,
      "utf8"
    )
  );

  const totalQuestions =
    data.length;

  const avgResponseTime =
    totalQuestions
      ? (
          data.reduce(
            (a, b) =>
              a + (b.responseTime || 0),
            0
          ) /
          totalQuestions
        ).toFixed(0)
      : 0;

  /* TOP COURSES */

  const topCourses = {};

  data.forEach(r => {

    const course =
      r.courseCode || "Unknown";

    topCourses[course] =
      (topCourses[course] || 0) + 1;

  });

  /* TOP INTENTS */

  const topIntents = {};

  data.forEach(r => {

    const intent =
      r.intent || "Unknown";

    topIntents[intent] =
      (topIntents[intent] || 0) + 1;

  });

  /* AVERAGE CONFIDENCE */

  const avgConfidence =
    totalQuestions
      ? (
          data.reduce(
            (a, b) =>
              a + (b.confidence || 0),
            0
          ) /
          totalQuestions
        ).toFixed(2)
      : 0;

  res.json({

    totalQuestions,

    avgResponseTime,

    avgConfidence,

    topCourses,

    topIntents,

    records: data

  });

});

module.exports = router;