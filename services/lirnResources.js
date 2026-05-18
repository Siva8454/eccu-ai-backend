const LIBRARY_LINKS = {

  // Main LIRN Portal
  lirnHome:
    "https://proxy.lirn.net/ECCouncilUniv?_rwpLaunch=true&groupID=2",

  // GALE eBooks
  gale:
    "https://4b20baz4n-mp03-y-https-go-gale-com.proxy.lirn.net/ps/start.do?p=GVRL&u=lirn97850",

  // ProQuest Ebook Central
  ebookCentral:
    "https://4b21mayz4-mp03-y-https-ebookcentral-proquest-com.proxy.lirn.net/lib/eccu/home.action",

  // ProQuest Central
  proquestCentral:
    "https://www.proquest.com/central/index?accountid=174310"

};


/* -------------------------------------------------- */
/* LIRN RESOURCE LIST */
/* -------------------------------------------------- */

function getLibraryResources() {

  return [

    {
      title: "Open LIRN Library Portal",
      url: LIBRARY_LINKS.lirnHome
    },

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


/* -------------------------------------------------- */
/* EXPORTS */
/* -------------------------------------------------- */

module.exports = {
  LIBRARY_LINKS,
  getLibraryResources
};