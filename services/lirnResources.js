const LIBRARY_LINKS = {

  // GALE eBooks
  gale:
    "https://4b20ayza-mp03-y-https-go-gale-com.proxy.lirn.net/ps/start.do?p=GVRL&u=lirn97850",

  // ProQuest Ebook Central
  ebookCentral:
    "https://4b21mayz4-mp03-y-https-ebookcentral-proquest-com.proxy.lirn.net/lib/eccu/home.action",

  // ProQuest Central
  proquestCentral:
    "https://www.proquest.com/central/index"

};


/* -------------------------------------------------- */
/* 🔍 BUILD SEARCH LINKS */
/* -------------------------------------------------- */

function getLibraryResources(query = "") {

  const encodedQuery = encodeURIComponent(query);

  return [

    {
      title: "Search GALE eBooks",
      url: `${LIBRARY_LINKS.gale}&query=${encodedQuery}`
    },

    {
      title: "Search ProQuest Ebook Central",
      url: `${LIBRARY_LINKS.ebookCentral}?query=${encodedQuery}`
    },

    {
      title: "Search ProQuest Central",
      url: `${LIBRARY_LINKS.proquestCentral}?query=${encodedQuery}`
    }

  ];
}


/* -------------------------------------------------- */
/* EXPORTS */
/* -------------------------------------------------- */

module.exports = {
  LIBRARY_LINKS,
  getLibraryResources
};