const LIBRARY_LINKS = {

  gale:
    "https://proxy.lirn.net/login?url=https://go.gale.com/ps/start.do?p=GVRL",

  ebookCentral:
    "https://proxy.lirn.net/login?url=https://ebookcentral.proquest.com",

  proquestCentral:
    "https://proxy.lirn.net/login?url=https://www.proquest.com"

};


/* -------------------------------------------------- */
/* 🔍 BUILD SEARCH LINKS */
/* -------------------------------------------------- */

function getLibraryResources(query = "") {

  return [

    {
      title: "GALE eBooks Cybersecurity Collection",
      url: LIBRARY_LINKS.gale
    },

    {
      title: "ProQuest Ebook Central",
      url: LIBRARY_LINKS.ebookCentral
    },

    {
      title: "ProQuest Central",
      url: LIBRARY_LINKS.proquestCentral
    }

  ];
}

module.exports = {
  getLibraryResources
};