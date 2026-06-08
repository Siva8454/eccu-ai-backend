const fs = require("fs");
const path = require("path");

const analyticsFile =
  path.join(
    __dirname,
    "../data/analytics.json"
  );

function logAnalytics(data) {

  try {

    let records = [];

    if (fs.existsSync(analyticsFile)) {

      records = JSON.parse(
        fs.readFileSync(
          analyticsFile,
          "utf8"
        )
      );

    }

    records.push({
      timestamp: new Date().toISOString(),
      ...data
    });

    fs.writeFileSync(
      analyticsFile,
      JSON.stringify(
        records,
        null,
        2
      )
    );

  }

  catch(err) {

    console.error(
      "Analytics Error:",
      err
    );

  }

}

module.exports = {
  logAnalytics
};