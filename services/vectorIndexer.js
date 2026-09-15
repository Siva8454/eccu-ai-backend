require("dotenv").config();

const { QdrantClient } = require("@qdrant/js-client-rest");
const crypto = require("crypto");

const { getLocalEmbedding } = require("./localEmbedding");

const courseMappings = require("../config/courseMappings");
const courseConfigs = require("../config/courseConfig");

console.log("=================================================");
console.log("🟢 COURSE-SPECIFIC VECTOR INDEXER");
console.log("=================================================");

console.log(
  "QDRANT_URL:",
  process.env.QDRANT_URL
);

console.log(
  "QDRANT_API_KEY:",
  process.env.QDRANT_API_KEY
    ? "FOUND"
    : "MISSING"
);

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});


/* =========================================================
   CONFIG
   ========================================================= */

const VECTOR_SIZE = 384;
const DISTANCE = "Cosine";
const CHUNK_SIZE = 1200;
const MIN_CONTENT_LENGTH = 150;


/* =========================================================
   COLLECTION RESOLVER
   ========================================================= */

function getCourseConfigKey(courseId) {

  const numericCourseId =
    Number(courseId);

  return (
    courseMappings[numericCourseId] ||
    courseMappings[String(numericCourseId)] ||
    null
  );
}


function getCourseCollection(courseId) {

  const configKey =
    getCourseConfigKey(courseId);

  if (!configKey) {

    console.log(
      `⚠️ No course mapping found for Canvas course ${courseId}`
    );

    return null;
  }

  const config =
    courseConfigs[configKey];

  if (!config) {

    console.log(
      `⚠️ Course config "${configKey}" not found for Canvas course ${courseId}`
    );

    return null;
  }

  const collection =
    config.collection;

  if (!collection) {

    console.log(
      `⚠️ No collection configured for ${configKey}`
    );

    return null;
  }

  return {
    configKey,
    collection
  };
}


/* =========================================================
   CONTENT CLEANING
   ========================================================= */

function shouldSkipContent(text = "") {

  const lower =
    String(text).toLowerCase();


  /* -------------------------------------------------------
     NAVIGATION / COURSE HOME
     ------------------------------------------------------- */

  if (
    text.includes("EC-Council University (ECCU)") &&
    text.includes("Module 01") &&
    text.includes("Module 10")
  ) {

    console.log(
      "⏭️ Skipping navigation page"
    );

    return true;
  }


  /* -------------------------------------------------------
     IMAGE / ICON FILES
     ------------------------------------------------------- */

  if (
    lower.endsWith(".svg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.includes("play_video") ||
    lower.includes("objective_m") ||
    lower.includes("modules_w")
  ) {

    return true;
  }


  /* -------------------------------------------------------
     MODULE WRAPPERS
     ------------------------------------------------------- */

  if (

    lower.includes(
      "learning materials activity time"
    ) ||

    lower.includes(
      "please complete - course survey"
    ) ||

    lower.includes(
      "access the written assignment"
    ) ||

    lower.includes(
      "access the discussion"
    ) ||

    lower.includes(
      "access the quiz"
    ) ||

    lower.includes(
      "access the live session"
    ) ||

    lower.includes(
      "certification exam study resources"
    ) ||

    lower.includes(
      "total estimated time"
    )

  ) {

    return true;
  }


  /* -------------------------------------------------------
     ASSIGNMENT / DISCUSSION GARBAGE
     ------------------------------------------------------- */

  const badPatterns = [

    "upload your file",
    "submit your assignment",
    "reply to at least",
    "post early in the week",
    "discussion rubric",
    "minimum word count",
    "maintain a respectful",
    "discussion contributes",
    "late submissions",
    "apa formatting",
    "apa paper",
    "turnitin",
    "grammarly",
    "citation",
    "plagiarism",
    "reply to classmates",
    "substantive response",
    "initial response",
    "discussion thread",
    "engage reply",
    "discussion prompt",
    "respond to peers",
    "respectful and inclusive",
    "research topic",
    "share your refined topic",

    "submit your discussion",
    "reply",
    "discussion comments",
    "post a full and complete initial response",
    "click the end button",

    "apa paper template",
    "apa sample paper",
    "in-text citation",

    "reproduction is strictly prohibited",

    "syllabus",
    "course overview",
    "student guide",
    "academic integrity",
    "netiquette",
    "attendance policy",
    "grading policy",
    "weekly objectives",

    "copyright",
    "all rights reserved",
    "support center",
    "course issues",
    "write to us",
    "home instructor syllabus",
    "canvas student android guide",
    "helpful video"
  ];


  if (
    badPatterns.some(
      pattern =>
        lower.includes(pattern)
    )
  ) {

    return true;
  }


  /* -------------------------------------------------------
     TOO MANY MODULE REFERENCES
     ------------------------------------------------------- */

  if (
    (
      lower.match(/module\s\d+/g) || []
    ).length > 5
  ) {

    return true;
  }


  return false;
}


/* =========================================================
   HTML CLEANING
   ========================================================= */

function cleanContent(rawContent = "") {

  let content =
    String(rawContent);


  /* Decode common escaped content */

  content =
    content
      .replace(/\\\\/g, " ")
      .replace(/\\"/g, " ")
      .replace(/\\u003c/g, " ")
      .replace(/\\u003e/g, " ");


  /* Remove HTML */

  content =
    content.replace(
      /<[^>]+>/g,
      " "
    );


  /* Remove attributes */

  content =
    content
      .replace(
        /href\s*=\s*.*?(?=\s|$)/gi,
        " "
      )
      .replace(
        /src\s*=\s*.*?(?=\s|$)/gi,
        " "
      )
      .replace(
        /class\s*=\s*.*?(?=\s|$)/gi,
        " "
      )
      .replace(
        /data-api-[^\s]+/gi,
        " "
      )
      .replace(
        /loading\s*=\s*.*?(?=\s|$)/gi,
        " "
      );


  /* Remove file/image leftovers */

  content =
    content
      .replace(/\bFile\b/gi, " ")
      .replace(/\bimg\b/gi, " ");


  /* Remove URLs */

  content =
    content.replace(
      /https?:\/\/\S+/gi,
      " "
    );


  /* HTML entities */

  content =
    content
      .replace(
        /&nbsp;/gi,
        " "
      )
      .replace(
        /&amp;/gi,
        "&"
      )
      .replace(
        /&lt;/gi,
        "<"
      )
      .replace(
        /&gt;/gi,
        ">"
      );


  /* Remove unusual characters */

  content =
    content.replace(
      /[^\x20-\x7E]/g,
      " "
    );


  /* Normalize */

  content =
    content
      .replace(
        /[\_=]{2,}/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return content;
}


/* =========================================================
   CHUNK TEXT
   ========================================================= */

function chunkText(
  text,
  size = CHUNK_SIZE
) {

  if (!text) {
    return [];
  }

  const chunks = [];

  let start = 0;

  while (
    start < text.length
  ) {

    chunks.push(
      text.slice(
        start,
        start + size
      )
    );

    start += size;
  }

  return chunks;
}


/* =========================================================
   GENERATE DETERMINISTIC QDRANT ID
   =========================================================
   
   This prevents duplicate vectors every time the
   indexer is run.

   Qdrant supports unsigned 64-bit integer IDs.
   ========================================================= */

function generatePointId(
  courseId,
  type,
  sourceId,
  chunkIndex
) {

  const key = [
    courseId,
    type,
    sourceId || "unknown",
    chunkIndex
  ].join(":");


  const hash =
    crypto
      .createHash("sha256")
      .update(key)
      .digest("hex");


  /*
   * Convert first 15 hex characters to a
   * safe positive integer.
   */

  const value =
    BigInt(
      "0x" + hash.slice(0, 15)
    );


  return Number(
    value % 9223372036854775807n
  );
}


/* =========================================================
   ENSURE COLLECTION
   ========================================================= */

async function ensureCollection(
  collection
) {

  try {

    await qdrant.getCollection(
      collection
    );

    console.log(
      `📦 Collection exists: ${collection}`
    );

  } catch {

    console.log(
      `🆕 Creating collection: ${collection}`
    );


    await qdrant.createCollection(
      collection,
      {
        vectors: {
          size: VECTOR_SIZE,
          distance: DISTANCE
        }
      }
    );


    console.log(
      `✅ Collection created: ${collection}`
    );
  }


  /* -------------------------------------------------------
     Ensure courseId index
     ------------------------------------------------------- */

  try {

    await qdrant.createPayloadIndex(
      collection,
      {
        field_name: "courseId",
        field_schema: "integer"
      }
    );

    console.log(
      `✅ courseId index ready: ${collection}`
    );

  } catch {

    console.log(
      `ℹ️ courseId index already exists: ${collection}`
    );
  }
}


/* =========================================================
   INDEX POINTS
   ========================================================= */

async function indexPoints(
  collection,
  points
) {

  if (
    !points ||
    points.length === 0
  ) {

    return 0;
  }


  const BATCH_SIZE = 20;

  let indexed = 0;


  for (
    let i = 0;
    i < points.length;
    i += BATCH_SIZE
  ) {

    const batch =
      points.slice(
        i,
        i + BATCH_SIZE
      );


    const vectors = [];


    for (
      const point of batch
    ) {

      try {

        const embedding =
          await getLocalEmbedding(
            point.text
          );


        vectors.push({

          id: point.id,

          vector: embedding,

          payload: point.payload

        });

      } catch (err) {

        console.error(
          `❌ Embedding failed for "${point.payload.title}":`,
          err.message
        );
      }
    }


    if (
      vectors.length > 0
    ) {

      await qdrant.upsert(
        collection,
        {
          wait: true,
          points: vectors
        }
      );


      indexed +=
        vectors.length;


      console.log(
        `⬆️ ${collection}: ${indexed}/${points.length}`
      );
    }
  }


  return indexed;
}


/* =========================================================
   ADD CONTENT POINT
   ========================================================= */

function addContentPoints(
  points,
  course,
  module,
  item,
  type,
  title,
  rawContent,
  pageUrl = ""
) {

  const content =
    cleanContent(
      rawContent
    );


  if (
    !content ||
    content.length <
      MIN_CONTENT_LENGTH
  ) {

    return;
  }


  if (
    shouldSkipContent(
      content
    )
  ) {

    return;
  }


  /* -------------------------------------------------------
     Type-specific filtering
     ------------------------------------------------------- */

  const lower =
    content.toLowerCase();


  if (
    type === "discussion" &&
    (
      lower.includes("reply to") ||
      lower.includes("post your response") ||
      lower.includes("minimum word count") ||
      lower.includes("discussion rubric")
    )
  ) {

    return;
  }


  if (
    type === "assignment" &&
    (
      lower.includes("submit assignment") ||
      lower.includes("upload your file") ||
      lower.includes("due date")
    )
  ) {

    return;
  }


  /* -------------------------------------------------------
     Quizzes are intentionally excluded
     ------------------------------------------------------- */

  if (
    type === "quiz"
  ) {

    return;
  }


  const baseText = [

    title,

    module?.name,

    content

  ]
    .filter(Boolean)
    .join("\n\n");


  if (
    baseText.length <
    MIN_CONTENT_LENGTH
  ) {

    return;
  }


  const chunks =
    chunkText(
      baseText
    );


  chunks.forEach(
    (chunk, index) => {

      const sourceId =
        item?.id ||
        item?.page_id ||
        item?.assignment_id ||
        item?.discussion_topic_id ||
        title ||
        index;


      points.push({

        id:
          generatePointId(
            course.id,
            type,
            sourceId,
            index
          ),


        text: chunk,


        payload: {

          courseId:
            Number(course.id),

          courseName:
            course.name || "",

          courseCode:
            course.course_code || "",


          moduleName:
            module?.name || "",

          moduleNumber:
            module?.moduleNumber ||
            detectModuleNumber(
              module?.name
            ),


          type,

          title:
            title || "",


          content:
            chunk,


          itemId:
            item?.id || "",


          published:
            item?.published ??
            true,


          position:
            item?.position || 0,


          pageUrl,


          source:
            "canvas",


          indexedAt:
            new Date().toISOString()

        }

      });

    }
  );
}


/* =========================================================
   MODULE NUMBER
   ========================================================= */

function detectModuleNumber(
  name
) {

  if (!name) {
    return null;
  }


  const match =
    String(name).match(
      /module\s*0*(\d+)/i
    );


  if (match) {
    return Number(
      match[1]
    );
  }


  return null;
}


/* =========================================================
   INDEX ONE COURSE
   ========================================================= */

async function indexCourse(
  course
) {

  const courseId =
    Number(course.id);


  const mapping =
    getCourseCollection(
      courseId
    );


  if (!mapping) {

    console.log(
      `⏭️ Skipping unmapped course: ${course.name} (${courseId})`
    );

    return 0;
  }


  const {
    configKey,
    collection
  } = mapping;


  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    `📘 COURSE: ${course.name}`
  );

  console.log(
    `🆔 Canvas ID: ${courseId}`
  );

  console.log(
    `⚙️ Config: ${configKey}`
  );

  console.log(
    `📦 Collection: ${collection}`
  );

  console.log(
    "================================================="
  );


  await ensureCollection(
    collection
  );


  const points = [];


  /* =======================================================
     MODULE ITEMS
     ======================================================= */

  for (
    const module of (
      course.modules || []
    )
  ) {

    const moduleNumber =
      detectModuleNumber(
        module.name
      );


    /*
     * Attach module number so it is available
     * to addContentPoints().
     */

    module.moduleNumber =
      moduleNumber;


    const items =
      module.items ||
      module.moduleItems ||
      [];


    for (
      const item of items
    ) {

      if (
        !item.title &&
        !item.name
      ) {

        continue;
      }


      const title =
        item.title ||
        item.name ||
        "";


      const rawContent =
        item.content ||
        item.body ||
        item.description ||
        "";


      addContentPoints(

        points,

        course,

        module,

        item,

        item.type ||
          "module_item",

        title,

        rawContent,

        item.html_url ||
          item.url ||
          ""

      );
    }
  }


  /* =======================================================
     PAGES
     ======================================================= */

  for (
    const page of (
      course.pages || []
    )
  ) {

    const title =
      page.title ||
      page.name ||
      "";


    const rawContent =
      page.body ||
      page.content ||
      "";


    addContentPoints(

      points,

      course,

      null,

      page,

      "page",

      title,

      rawContent,

      page.html_url ||
        page.url ||
        ""

    );
  }


  /* =======================================================
     ASSIGNMENTS
     ======================================================= */

  for (
    const assignment of (
      course.assignments || []
    )
  ) {

    const title =
      assignment.name ||
      assignment.title ||
      "";


    const rawContent =
      assignment.description ||
      assignment.body ||
      "";


    addContentPoints(

      points,

      course,

      null,

      assignment,

      "assignment",

      title,

      rawContent,

      assignment.html_url ||
        ""

    );
  }


  /* =======================================================
     DISCUSSIONS
     ======================================================= */

  for (
    const discussion of (
      course.discussions || []
    )
  ) {

    const title =
      discussion.title ||
      discussion.name ||
      "";


    const rawContent =
      discussion.message ||
      discussion.description ||
      discussion.body ||
      "";


    addContentPoints(

      points,

      course,

      null,

      discussion,

      "discussion",

      title,

      rawContent,

      discussion.html_url ||
        ""

    );
  }


  /* =======================================================
     FILES
     ======================================================= */

  for (
    const file of (
      course.files || []
    )
  ) {

    const fileName =
      file.display_name ||
      file.filename ||
      file.name ||
      "";


    /*
     * Do not embed image/icon files.
     */

    const lower =
      fileName.toLowerCase();


    if (
      lower.endsWith(".svg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".ico")
    ) {

      continue;
    }


    /*
     * Canvas file objects normally don't contain
     * the actual document text. Therefore we only
     * index a file if textual content is already
     * available in the Canvas data.
     */

    const rawContent =
      file.content ||
      file.body ||
      file.description ||
      "";


    if (!rawContent) {
      continue;
    }


    addContentPoints(

      points,

      course,

      null,

      file,

      "file",

      fileName,

      rawContent,

      file.url ||
        file.html_url ||
        ""

    );
  }


  console.log(
    `📝 Prepared ${points.length} chunks for ${course.name}`
  );


  if (
    points.length === 0
  ) {

    console.log(
      `⚠️ No indexable content found for ${course.name}`
    );

    return 0;
  }


  /* =======================================================
     CREATE EMBEDDINGS + UPLOAD
     ======================================================= */

  const indexed =
    await indexPoints(
      collection,
      points
    );


  console.log("");
  console.log(
    `✅ ${course.name}: ${indexed} vectors indexed`
  );


  return indexed;
}


/* =========================================================
   MAIN INDEXER
   ========================================================= */

async function indexKnowledgeStore() {

  const storePath =
    "./data/knowledge-store.json";


  console.log(
    `📂 Loading knowledge store: ${storePath}`
  );


  const store =
    JSON.parse(
      require("fs").readFileSync(
        storePath,
        "utf-8"
      )
    );


  if (
    !store ||
    !Array.isArray(
      store.courses
    )
  ) {

    throw new Error(
      "Invalid knowledge-store.json: courses array not found."
    );
  }


  console.log("");
  console.log(
    `📚 Courses in knowledge store: ${store.courses.length}`
  );


  /* =======================================================
     VALIDATE COURSE MAPPINGS FIRST
     ======================================================= */

  console.log("");
  console.log(
    "🔎 Validating course mappings..."
  );


  const collectionSummary =
    new Map();


  for (
    const course of store.courses
  ) {

    const courseId =
      Number(
        course.id ||
        course.courseId
      );


    const mapping =
      getCourseCollection(
        courseId
      );


    if (!mapping) {

      console.log(
        `❌ UNMAPPED: ${course.name} (${courseId})`
      );

      continue;
    }


    const {
      configKey,
      collection
    } = mapping;


    if (
      !collectionSummary.has(
        collection
      )
    ) {

      collectionSummary.set(
        collection,
        {
          configKey,
          courses: []
        }
      );
    }


    collectionSummary
      .get(collection)
      .courses.push(
        courseId
      );


    console.log(
      `✅ ${course.name} (${courseId}) → ${configKey} → ${collection}`
    );
  }


  console.log("");
  console.log(
    `📦 Course collections detected: ${collectionSummary.size}`
  );


  /* =======================================================
     INDEX COURSES
     ======================================================= */

  let totalIndexed = 0;


  for (
    const course of store.courses
  ) {

    try {

      const indexed =
        await indexCourse(
          course
        );


      totalIndexed +=
        indexed;

    } catch (err) {

      console.error("");
      console.error(
        `❌ Failed indexing course: ${course.name}`
      );

      console.error(
        err.message
      );

      console.error(
        err.stack
      );
    }
  }


  /* =======================================================
     SUMMARY
     ======================================================= */

  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    "🚀 VECTOR INDEXING COMPLETE"
  );

  console.log(
    "================================================="
  );

  console.log(
    `📚 Courses processed: ${store.courses.length}`
  );

  console.log(
    `📦 Collections used: ${collectionSummary.size}`
  );

  console.log(
    `🧠 Total vectors indexed: ${totalIndexed}`
  );

  console.log(
    "================================================="
  );
}


/* =========================================================
   RUN DIRECTLY
   ========================================================= */

if (
  require.main === module
) {

  indexKnowledgeStore()

    .then(() => {

      console.log(
        "✅ Done"
      );

    })

    .catch(err => {

      console.error(
        "❌ Vector indexing failed:"
      );

      console.error(
        err
      );

      process.exitCode = 1;
    });
}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
  indexKnowledgeStore,
  cleanContent,
  shouldSkipContent,
  chunkText,
  getCourseConfigKey,
  getCourseCollection
};