const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {

  const analyticsFile = path.join(
    __dirname,
    "../data/analytics.json"
  );

  const feedbackFile = path.join(
    __dirname,
    "../data/feedback.json"
  );

  const analyticsData =
    fs.existsSync(analyticsFile)
      ? JSON.parse(
          fs.readFileSync(
            analyticsFile,
            "utf8"
          )
        )
      : [];

  const feedbackData =
    fs.existsSync(feedbackFile)
      ? JSON.parse(
          fs.readFileSync(
            feedbackFile,
            "utf8"
          )
        )
      : [];

  const totalQuestions =
    analyticsData.length;

  const avgResponseTime =
    totalQuestions
      ? (
          analyticsData.reduce(
            (a, b) =>
              a + (b.responseTime || 0),
            0
          ) / totalQuestions
        ).toFixed(0)
      : 0;

  const avgConfidence =
    totalQuestions
      ? (
          analyticsData.reduce(
            (a, b) =>
              a + (b.confidence || 0),
            0
          ) / totalQuestions
        ).toFixed(2)
      : 0;

  const helpful =
    feedbackData.filter(
      f => f.rating === "helpful"
    ).length;

  const notHelpful =
    feedbackData.filter(
      f => f.rating === "not_helpful"
    ).length;

  const helpfulPercent =
    helpful + notHelpful
      ? (
          helpful /
          (helpful + notHelpful) * 100
        ).toFixed(1)
      : 0;

  /* TOP COURSES */

  const topCourses = {};

  analyticsData.forEach(r => {

    const course =
      r.courseCode || "Unknown";

    topCourses[course] =
      (topCourses[course] || 0) + 1;

  });

  const courseHtml =
    Object.entries(topCourses)

      .sort((a, b) => b[1] - a[1])

      .map(([course, count]) => `
        <tr>
          <td>${course}</td>
          <td>${count}</td>
        </tr>
      `)

      .join("");

  /* TOP INTENTS */

  const topIntents = {};

  analyticsData.forEach(r => {

    const intent =
      r.intent || "Unknown";

    topIntents[intent] =
      (topIntents[intent] || 0) + 1;

  });

  function formatIntent(intent) {

    return intent
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        c => c.toUpperCase()
      );

  }

  const intentHtml =
    Object.entries(topIntents)

      .sort((a, b) => b[1] - a[1])

      .map(([intent, count]) => `
        <tr>
          <td>${formatIntent(intent)}</td>
          <td>${count}</td>
        </tr>
      `)

      .join("");

  res.send(`

<html>

<head>

<title>ECCU AI Tutor Dashboard</title>

<style>

body{
  font-family: Arial, sans-serif;
  background:#f4f6f9;
  padding:40px;
}

h1{
  margin-bottom:30px;
}

.grid{
  display:grid;
  grid-template-columns:
  repeat(auto-fit,minmax(250px,1fr));
  gap:20px;
}

.card{
  background:white;
  padding:25px;
  border-radius:12px;
  box-shadow:
  0 2px 10px rgba(0,0,0,.08);
}

.metric{
  font-size:40px;
  font-weight:bold;
  margin-top:10px;
}

.label{
  color:#666;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  padding:10px;
  border-bottom:1px solid #eee;
}

</style>

</head>

<body>

<h1>ECCU AI Tutor Analytics</h1>

<div class="grid">

<div class="card">
<div class="label">Total Questions</div>
<div class="metric">${totalQuestions}</div>
</div>

<div class="card">
<div class="label">Student Satisfaction</div>
<div class="metric">${helpfulPercent}%</div>
</div>

<div class="card">
<div class="label">Helpful Responses</div>
<div class="metric">👍 ${helpful}</div>
</div>

<div class="card">
<div class="label">Not Helpful Responses</div>
<div class="metric">👎 ${notHelpful}</div>
</div>

<div class="card">
<div class="label">Average Response Time</div>
<div class="metric">${avgResponseTime} ms</div>
</div>

<div class="card">
<div class="label">Average Confidence</div>
<div class="metric">${avgConfidence}</div>
</div>

</div>

<div
class="card"
style="margin-top:30px;"
>

<h2>Top Courses</h2>

<table>

<tr>
<th align="left">Course</th>
<th align="left">Questions</th>
</tr>

${courseHtml}

</table>

</div>

<div
class="card"
style="margin-top:30px;"
>

<h2>Top Intents</h2>

<table>

<tr>
<th align="left">Intent</th>
<th align="left">Questions</th>
</tr>

${intentHtml}

</table>

</div>

</body>

</html>

`);

});

module.exports = router;