const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

router.get("/", (req,res)=>{

  const file =
    path.join(
      __dirname,
      "../data/analytics.json"
    );

  if (!fs.existsSync(file)) {

  fs.writeFileSync(
    file,
    "[]"
  );

}

const data =
  JSON.parse(
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
            (a,b)=>
              a +
              b.responseTime,
            0
          ) /
          totalQuestions
        ).toFixed(0)
      : 0;

  res.json({

    totalQuestions,

    avgResponseTime,

    records:data

  });

});

module.exports = router;