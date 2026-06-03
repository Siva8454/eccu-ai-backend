const courseConfigs = {

  CEH: {
    collection: "ceh_vectors",
    courseName: "Certified Ethical Hacking",
    shortName: "CEH",
    promptType: "ceh",
    webSearchContext: "ethical hacking cybersecurity pentesting",
    trustedDomains: [
      "owasp.org",
      "portswigger.net",
      "cisa.gov",
      "nist.gov"
    ]
  },

  PSY360: {
    collection: "psy360_vectors",
    courseName: "Introduction to Social Psychology",
    shortName: "PSY360",
    promptType: "psychology",
    webSearchContext: "social psychology cognition perception behavior",
    trustedDomains: []
  }

};

module.exports = courseConfigs;