// services/langchainRetriever.js

const { QdrantVectorStore } = require("@langchain/qdrant");

const {
  HuggingFaceInferenceEmbeddings
} = require("@langchain/community/embeddings/hf");

const {
  QdrantClient
} = require("@qdrant/js-client-rest");


const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const {
  keywordSearch
} = require("./keywordSearch");

const {
  rerankDocuments
} = require("./reranker");

const {
  expandQuery
} = require("./queryExpander");

const {
  shouldRetry
} = require("./reflectionAgent");

async function searchKnowledge(
  question,
  courseId,
  type = null,
  moduleName = null
) {

  try {

    const embeddings =
      new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HF_API_KEY,
        model:
          "sentence-transformers/all-MiniLM-L6-v2"
      });

    const vectorStore =
      await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          client: qdrant,
          collectionName: "eccu_knowledge_v7"
        }
      );

    /* ---------------------------------- */
    /* FILTERS */
    /* ---------------------------------- */

    const mustFilters = [

      {
        key: "courseId",
        match: {
          value: Number(courseId)
        }
      }

    ];

    if (type) {

      mustFilters.push({

        key: "type",

        match: {
          value: type
        }

      });
    }

    if (moduleName) {

      mustFilters.push({

        key: "moduleName",

        match: {
          text: moduleName
        }

      });
    }

    /* ---------------------------------- */
    /* MULTI QUERY VECTOR SEARCH */
    /* ---------------------------------- */

    const queries =
      expandQuery(question);

    let allDocs = [];

    for (const q of queries) {

      const docs =
        await vectorStore.similaritySearch(
          q,
          5,
          {
            must: mustFilters
          }
        );

      allDocs.push(...docs);
    }

    /* ---------------------------------- */
    /* HYBRID SEARCH */
    /* ---------------------------------- */

    const keywordResults =
      await keywordSearch(
        question,
        courseId,
        type,
        moduleName
      );

    /* ---------------------------------- */
    /* MERGE RESULTS */
    /* ---------------------------------- */

    let merged = [
      ...allDocs,
      ...keywordResults
    ];

    /* ---------------------------------- */
    /* REMOVE DUPLICATES */
    /* ---------------------------------- */

    const seen = new Set();

    merged = merged.filter(doc => {

      const text =
        doc.pageContent
          ?.substring(0, 200);

      if (seen.has(text)) {
        return false;
      }

      seen.add(text);

      return true;

    });

    /* ---------------------------------- */
    /* CLEAN RESULTS */
    /* ---------------------------------- */

    merged = merged.map(doc => {

      const cleaned =
        doc.pageContent
          ?.replace(/\\n/g, " ")
          ?.replace(/\\"/g, "")
          ?.replace(/<[^>]*>/g, " ")
          ?.replace(/\s+/g, " ")
          ?.trim();

      return {
        ...doc,
        pageContent: cleaned
      };

    });

    /* ---------------------------------- */
    /* REMOVE GARBAGE */
    /* ---------------------------------- */

    merged = merged.filter(doc => {

      const text =
        (doc.pageContent || "")
          .toLowerCase();

      const badPatterns = [

        ".svg",
        ".png",
        ".jpg",
        ".jpeg",

        "play_video",
        "objective_m",

        "copyright",
        "all rights reserved",

        "help faq",
        "course issues",
        "write to us",
        "support center",

        "upload your file",
        "submit your assignment",

        "reply to discussion",
        "reply to at least",

        "click the end button",
        "launch only one lab",

        "home instructor syllabus"

      ];

      return !badPatterns.some(pattern =>
        text.includes(pattern)
      );

    });

    /* ---------------------------------- */
    /* PRIORITIZE EDUCATIONAL CONTENT */
    /* ---------------------------------- */

    merged.sort((a, b) => {

      const typeA =
        a.metadata?.type || "";

      const typeB =
        b.metadata?.type || "";

      const score = (t) => {

        if (t === "page") return 5;

        if (t === "module") return 4;

        if (t === "assignment") return 3;

        if (t === "discussion") return 2;

        if (t === "file") return 1;

        return 0;
      };

      return score(typeB) - score(typeA);

    });

    /* ---------------------------------- */
    /* RERANKING */
    /* ---------------------------------- */

    merged =
      rerankDocuments(
        question,
        merged
      );

      /* ---------------------------------- */
      /* SELF REFLECTION */
      /* ---------------------------------- */

      const retry =
        shouldRetry(
          question,
          merged
        );

      if (retry) {

        console.log(
          "Reflection Agent: Retrying broader search..."
        );

        const retryDocs =
          await vectorStore.similaritySearch(
            question,
            10
          );

        merged = [
          ...merged,
          ...retryDocs
        ];
      }

    /* ---------------------------------- */
    /* FINAL LIMIT */
    /* ---------------------------------- */

    return merged.slice(0, 5);

  } catch (err) {

    console.error(
      "LangChain Retrieval Error:",
      err
    );

    return [];
  }
}

module.exports = {
  searchKnowledge
};