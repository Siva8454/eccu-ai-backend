const MiniSearch = require("minisearch");
const fs = require("fs");

let miniSearch;

function buildKeywordIndex() {

  const store = JSON.parse(
    fs.readFileSync(
      "./data/knowledge-store.json",
      "utf-8"
    )
  );

  const docs = [];

  store.courses.forEach(course => {

    (course.modules || []).forEach(module => {

      const items =
        module.items ||
        module.moduleItems ||
        [];

      items.forEach(item => {

        const content =
          item.content ||
          item.body ||
          item.description ||
          "";

        docs.push({

          id: item.id || Math.random(),

          title:
            item.title ||
            item.name ||
            "",

          content,

          type:
            item.type ||
            "content",

          courseId:
            Number(course.courseId),

          moduleName:
            module.moduleName || "",

          pageUrl:
            item.html_url ||
            item.url ||
            ""

        });

      });

    });

  });

  miniSearch = new MiniSearch({

    fields: [
      "title",
      "content",
      "moduleName"
    ],

    storeFields: [
      "title",
      "content",
      "type",
      "courseId",
      "moduleName",
      "pageUrl"
    ],

    searchOptions: {
      boost: {
        title: 3,
        moduleName: 2
      },
      fuzzy: 0.2
    }

  });

  miniSearch.addAll(docs);

  console.log(
    "✅ Keyword index ready"
  );
}

function keywordSearch(
  query,
  courseId,
  limit = 5
) {

  if (!miniSearch) {
    buildKeywordIndex();
  }

  const results =
    miniSearch.search(query, {
      prefix: true
    });

  return results
    .filter(r =>
      r.courseId === Number(courseId)
    )
    .slice(0, limit);
}

module.exports = {
  keywordSearch,
  buildKeywordIndex
};