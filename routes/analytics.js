const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {

  /* ------------------------- */
  /* ANALYTICS FILE */
  /* ------------------------- */

  const analyticsFile = path.join(
    __dirname,
    "../data/analytics.json"
  );

  if (!fs.existsSync(analyticsFile)) {

    fs.writeFileSync(
      analyticsFile,
      "[]"
    );

  }

  const data = JSON.parse(
    fs.readFileSync(
      analyticsFile,
      "utf8"
    )
  );

  /* ------------------------- */
  /* FEEDBACK FILE */
  /* ------------------------- */

  const feedbackFile = path.join(
    __dirname,
    "../data/feedback.json"
  );

  if (!fs.existsSync(feedbackFile)) {

    fs.writeFileSync(
      feedbackFile,
      "[]"
    );

  }

  const feedbackData = JSON.parse(
    fs.readFileSync(
      feedbackFile,
      "utf8"
    )
  );


  const recentFeedback =
  feedbackData
    .slice(-10)
    .reverse();

    const recordsWithFeedback = data.map(record => {

  const feedback = feedbackData.find(
    f =>
      f.question === record.question &&
      f.courseId === record.courseId
  );

  return {

    ...record,

    feedback:
      feedback?.rating || null,

    feedbackTimestamp:
      feedback?.timestamp || null

  };

});


  /* ------------------------- */
  /* BASIC STATS */
  /* ------------------------- */

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

  /* ------------------------- */
  /* TOP COURSES */
  /* ------------------------- */

  const topCourses = {};

  data.forEach(r => {

    const course =
      r.courseCode || "Unknown";

    topCourses[course] =
      (topCourses[course] || 0) + 1;

  });

  /* ------------------------- */
  /* TOP INTENTS */
  /* ------------------------- */

  const topIntents = {};

  data.forEach(r => {

    const intent =
      r.intent || "Unknown";

    topIntents[intent] =
      (topIntents[intent] || 0) + 1;

  });

  /* ------------------------- */
  /* FEEDBACK STATS */
  /* ------------------------- */

  const helpful =
    feedbackData.filter(
      f => f.rating === "helpful"
    ).length;

  const notHelpful =
    feedbackData.filter(
      f => f.rating === "not_helpful"
    ).length;

  const totalFeedback =
    helpful + notHelpful;

  const helpfulPercent =
    totalFeedback
      ? (
          helpful /
          totalFeedback * 100
        ).toFixed(1)
      : 0;

  /* ------------------------- */
  /* RESPONSE */
  /* ------------------------- */

  res.json({

    totalQuestions,

    avgResponseTime,

    avgConfidence,

    helpful,

    notHelpful,

    helpfulPercent,

    topCourses,

    topIntents,

    totalFeedback,

    records: recordsWithFeedback,

    recentFeedback

  });

});

module.exports = router;