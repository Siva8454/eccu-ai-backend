const express = require("express");

const router = express.Router();

const {
  selectTool
} = require("../services/toolRouter");

const {
  searchKnowledge
} = require("../services/langchainRetriever");

function cleanText(text = "") {

  return text

    // remove escaped characters
    .replace(/\\"/g, "")
    .replace(/\\n/g, " ")

    // remove html tags
    .replace(/<[^>]*>/g, " ")

    // remove urls
    .replace(/https?:\/\/\S+/g, "")

    // remove metadata junk
    .replace(/metadata":\{.*?\}/g, "")

    // remove canvas junk
    .replace(/data-api-endpoint=".*?"/g, "")
    .replace(/data-api-returntype=".*?"/g, "")
    .replace(/loading="lazy"/g, "")
    .replace(/class=".*?"/g, "")

    // remove encoded html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")

    // remove repeated spaces
    .replace(/\s+/g, " ")

    .trim();
}

router.get("/", async (req, res) => {

  try {

    const q = req.query.q;

    const courseId = req.query.course;

    const type = req.query.type;

    const moduleName = req.query.module;

      const tool =
  selectTool(q);

      console.log(
        "Selected Tool:",
        tool
      );

      let results = [];

      if (tool === "vector_search") {

        results =
          await searchKnowledge(
            q,
            courseId,
            type,
            moduleName
          );
      }

      /* future tools */
      else if (tool === "file_search") {

        results = [];
      }

      else if (tool === "current_page") {

        results = [];
      }

    const cleaned =
      results.map((doc, index) => ({

        result: index + 1,

        content:
          cleanText(
            doc.pageContent || ""
          ).substring(0, 1200),

        metadata: {
          courseName:
            doc.metadata?.courseName,

          moduleName:
            doc.metadata?.moduleName,

          title:
            doc.metadata?.title,

          type:
            doc.metadata?.type
        }

      }));

        res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.json(cleaned);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

module.exports = router;