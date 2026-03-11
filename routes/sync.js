const express = require("express");
const router = express.Router();

const { fetchAllCanvas } = require("../services/canvasFetcher");
const { buildKnowledgeStore } = require("../services/knowledgeBuilder");

router.post("/", async (req, res) => {
  try {
    console.log("🚀 Starting full Canvas sync...");

    // 1️⃣ Fetch all canvas data
    const canvasData = await fetchAllCanvas();

    // 2️⃣ Build vector store
    await buildKnowledgeStore(canvasData);

    res.json({
      status: "success",
      coursesIndexed: canvasData.length
    });

  } catch (err) {
    console.error("❌ Sync error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;