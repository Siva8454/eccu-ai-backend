require("dotenv").config();

const express = require("express");
const router = express.Router();

const { fetchAllCanvas } = require("../services/canvasFetcher");
const { buildKnowledgeStore } = require("../services/knowledgeBuilder");

/* -------------------------------------------------- */
/* CORE SYNC FUNCTION */
/* -------------------------------------------------- */

async function runSync() {

  try {

    console.log("🚀 Starting full Canvas sync...");

    // 1️⃣ Fetch Canvas data
    const canvasData = await fetchAllCanvas();

    if (!canvasData || canvasData.length === 0) {
      console.log("⚠ No courses found");
      return;
    }

    console.log(`📚 Found ${canvasData.length} courses`);

    // 2️⃣ Build vector knowledge
    await buildKnowledgeStore(canvasData);

    console.log("🎉 ECCU vector knowledge updated");

  } catch (err) {

    console.error("❌ Sync error:", err);

  }

}

/* -------------------------------------------------- */
/* EXPRESS ROUTE */
/* -------------------------------------------------- */

router.post("/", async (req, res) => {

  try {

    await runSync();

    res.json({
      status: "success",
      message: "Canvas sync completed"
    });

  } catch (err) {

    console.error("❌ Sync error:", err);

    res.status(500).json({
      status: "error",
      error: err.toString()
    });

  }

});

/* -------------------------------------------------- */
/* CLI EXECUTION */
/* -------------------------------------------------- */

if (require.main === module) {

  runSync();

}

module.exports = router;