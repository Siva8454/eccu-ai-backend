const courseConfigs = {

  ECCU501_CONFIG: {
    collection: "ceh_vectors",
    courseName: "Ethical Hacking and Countermeasures",
    shortName: "ECCU501",
    promptType: "ceh",
    webSearchContext: "ethical hacking cybersecurity pentesting",
    trustedDomains: [
      "owasp.org",
      "portswigger.net",
      "cisa.gov",
      "nist.gov"
    ]
  },

  PSY360_CONFIG: {
    collection: "psy360_vectors",
    courseName: "Introduction to Social Psychology",
    shortName: "PSY360",
    promptType: "psychology",
    webSearchContext: "social psychology cognition perception behavior",
    trustedDomains: []
  },

  MGMT511_CONFIG: {
    collection: "mgmt511_vectors",
    courseName: "Financial Management",
    shortName: "MGMT511",
    promptType: "finance",
    webSearchContext: "financial management corporate finance budgeting capital investment financial analysis",
    trustedDomains: []
  }

};

module.exports = courseConfigs;