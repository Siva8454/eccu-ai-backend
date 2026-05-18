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

function getLibraryResources(query) {

  const q = query.toLowerCase();

  const resources = [];

  if (
    q.includes("xss") ||
    q.includes("cross site scripting")
  ) {

    resources.push({
      title: "OWASP XSS Guide (LIRN Recommended)",
      url: "https://owasp.org/www-community/attacks/xss/"
    });

    resources.push({
      title: "Gale eBooks Cybersecurity Collection",
      url: "https://4b20baya-mp03-y-https-go-gale-com.proxy.lirn.net/ps/start.do?p=GVRL&u=lirn97850"
    });

    resources.push({
      title: "ProQuest Ebook Central",
      url: "https://4b21mayz4-mp03-y-https-ebookcentral-proquest-com.proxy.lirn.net/lib/eccu/home.action"
    });
  }

  return resources;
}

module.exports = {
  getLibraryResources
};