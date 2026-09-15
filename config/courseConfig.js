const courseConfigs = {

    /* =========================================================
       ECCU 501
       ========================================================= */

    ECCU501_CONFIG: {
        collection: "ceh_vectors",
        blueprintCourseId: 2213,
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


    /* =========================================================
       CIS 299
       ========================================================= */

    CIS299_CONFIG: {
        collection: "cis299_vectors",
        blueprintCourseId: 2725,
        courseName: "Applied AI Foundations",
        shortName: "CIS299",
        promptType: "general",
        webSearchContext: "artificial intelligence AI foundations machine learning generative AI",
        trustedDomains: []
    },


    /* =========================================================
       CIS 303
       ========================================================= */

    CIS303_CONFIG: {
        collection: "cis303_vectors",
        blueprintCourseId: 2277,
        courseName: "Security Policies and Implementation Issues",
        shortName: "CIS303",
        promptType: "cybersecurity",
        webSearchContext: "cybersecurity security policies information security governance policy implementation",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       CIS 308
       ========================================================= */

    CIS308_CONFIG: {
        collection: "cis308_vectors",
        blueprintCourseId: 2269,
        courseName: "Access Control, Authentication and Public Key Infrastructure",
        shortName: "CIS308",
        promptType: "cybersecurity",
        webSearchContext: "access control authentication public key infrastructure PKI cybersecurity",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       CIS 406
       ========================================================= */

    CIS406_CONFIG: {
        collection: "cis406_vectors",
        blueprintCourseId: 2279,
        courseName: "System Forensics, Investigation, and Response",
        shortName: "CIS406",
        promptType: "cybersecurity",
        webSearchContext: "digital forensics incident response system investigation cybersecurity",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       CIS 410 - BSCS
       ========================================================= */

    CIS410_CONFIG: {
        collection: "cis410_vectors",
        blueprintCourseId: 2457,
        courseName: "Capstone (BSCS)",
        shortName: "CIS410",
        promptType: "general",
        webSearchContext: "cybersecurity computer science capstone project",
        trustedDomains: []
    },


    /* =========================================================
       COM 340
       ========================================================= */

    COM340_CONFIG: {
        collection: "com340_vectors",
        blueprintCourseId: 2193,
        courseName: "Communication and Technical Writing",
        shortName: "COM340",
        promptType: "general",
        webSearchContext: "technical writing professional communication academic writing",
        trustedDomains: []
    },


    /* =========================================================
       CS 515
       ========================================================= */

    CS515_CONFIG: {
        collection: "cs515_vectors",
        blueprintCourseId: 2463,
        courseName: "Artificial Intelligence",
        shortName: "CS515",
        promptType: "ai",
        webSearchContext: "artificial intelligence machine learning AI algorithms neural networks",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 500
       ========================================================= */

    ECCU500_CONFIG: {
        collection: "eccu500_vectors",
        blueprintCourseId: 2179,
        courseName: "Managing Secure Network Systems",
        shortName: "ECCU500",
        promptType: "cnd",
        webSearchContext: "network security secure network systems cybersecurity",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       ECCU 505
       ========================================================= */

    ECCU505_CONFIG: {
        collection: "eccu505_vectors",
        blueprintCourseId: 2227,
        courseName: "Introduction to Research and Writing",
        shortName: "ECCU505",
        promptType: "research",
        webSearchContext: "academic research research methodology technical writing",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 506
       ========================================================= */

    ECCU506_CONFIG: {
        collection: "eccu506_vectors",
        blueprintCourseId: 2199,
        courseName: "Conducting Penetration and Security Tests",
        shortName: "ECCU506",
        promptType: "pentesting",
        webSearchContext: "penetration testing security testing ethical hacking cybersecurity",
        trustedDomains: [
            "owasp.org",
            "portswigger.net",
            "cisa.gov",
            "nist.gov"
        ]
    },


    /* =========================================================
       ECCU 509
       ========================================================= */

    ECCU509_CONFIG: {
        collection: "eccu509_vectors",
        blueprintCourseId: 2275,
        courseName: "Securing Wireless Networks",
        shortName: "ECCU509",
        promptType: "cybersecurity",
        webSearchContext: "wireless network security Wi-Fi security cybersecurity",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       ECCU 510
       ========================================================= */

    ECCU510_CONFIG: {
        collection: "eccu510_vectors",
        blueprintCourseId: 2366,
        courseName: "Secure Programming",
        shortName: "ECCU510",
        promptType: "secure-programming",
        webSearchContext: "secure programming application security software security OWASP",
        trustedDomains: [
            "owasp.org",
            "cisa.gov",
            "nist.gov"
        ]
    },


    /* =========================================================
       ECCU 512
       ========================================================= */

    ECCU512_CONFIG: {
        collection: "eccu512_vectors",
        blueprintCourseId: 2372,
        courseName: "Beyond Business Continuity: Managing Organizational Change",
        shortName: "ECCU512",
        promptType: "management",
        webSearchContext: "organizational change business continuity change management",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 517
       ========================================================= */

    ECCU517_CONFIG: {
        collection: "eccu517_vectors",
        blueprintCourseId: 2196,
        courseName: "Cyber Law",
        shortName: "ECCU517",
        promptType: "cyber-law",
        webSearchContext: "cyber law cybersecurity law privacy data protection information security",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 519 - General Capstone
       ========================================================= */

    ECCU519_CONFIG: {
        collection: "eccu519_vectors",
        blueprintCourseId: 2282,
        courseName: "Capstone Course",
        shortName: "ECCU519",
        promptType: "capstone",
        webSearchContext: "cybersecurity capstone research project",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 519 - MCS
       ========================================================= */

    ECCU519_MCS_CONFIG: {
        collection: "eccu519_mcs_vectors",
        blueprintCourseId: 2363,
        courseName: "Capstone (MCS)",
        shortName: "ECCU519-MCS",
        promptType: "capstone",
        webSearchContext: "cybersecurity master's capstone research project",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 519 - MBA
       ========================================================= */

    ECCU519_MBA_CONFIG: {
        collection: "eccu519_mba_vectors",
        blueprintCourseId: 2362,
        courseName: "Capstone (MBA)",
        shortName: "ECCU519-MBA",
        promptType: "capstone",
        webSearchContext: "MBA capstone business research project",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 523
       ========================================================= */

    ECCU523_CONFIG: {
        collection: "eccu523_vectors",
        blueprintCourseId: 2294,
        courseName: "Executive Governance & Management",
        shortName: "ECCU523",
        promptType: "management",
        webSearchContext: "executive governance management cybersecurity governance",
        trustedDomains: []
    },


    /* =========================================================
       ECCU 525
       ========================================================= */

    ECCU525_CONFIG: {
        collection: "eccu525_vectors",
        blueprintCourseId: 2287,
        courseName: "Securing Cloud Platforms",
        shortName: "ECCU525",
        promptType: "cloud-security",
        webSearchContext: "cloud security cloud platforms cybersecurity",
        trustedDomains: [
            "cisa.gov",
            "nist.gov"
        ]
    },


    /* =========================================================
       ECCU 560
       ========================================================= */

    ECCU560_CONFIG: {
        collection: "eccu560_vectors",
        blueprintCourseId: 2716,
        courseName: "AI Program Management and Governance",
        shortName: "ECCU560",
        promptType: "ai-governance",
        webSearchContext: "AI governance AI program management artificial intelligence governance",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       ECCU 565
       ========================================================= */

    ECCU565_CONFIG: {
        collection: "eccu565_vectors",
        blueprintCourseId: 2721,
        courseName: "AI Governance, Compliance, and Ethical Risk Management (C|RAGE)",
        shortName: "ECCU565",
        promptType: "ai-governance",
        webSearchContext: "AI governance compliance AI ethics artificial intelligence risk management",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       ECCU 570
       ========================================================= */

    ECCU570_CONFIG: {
        collection: "eccu570_vectors",
        blueprintCourseId: 2726,
        courseName: "Certified Offensive AI Security Professional (COASP)",
        shortName: "ECCU570",
        promptType: "offensive-ai-security",
        webSearchContext: "offensive AI security AI security penetration testing cybersecurity",
        trustedDomains: [
            "owasp.org",
            "portswigger.net",
            "cisa.gov",
            "nist.gov"
        ]
    },


    /* =========================================================
       MGMT 502
       ========================================================= */

    MGMT502_CONFIG: {
        collection: "mgmt502_vectors",
        blueprintCourseId: 2221,
        courseName: "Business Essential",
        shortName: "MGMT502",
        promptType: "business",
        webSearchContext: "business fundamentals management business essentials",
        trustedDomains: []
    },


    /* =========================================================
       MGMT 512
       ========================================================= */

    MGMT512_CONFIG: {
        collection: "mgmt512_vectors",
        blueprintCourseId: 2339,
        courseName: "Marketing Management",
        shortName: "MGMT512",
        promptType: "marketing",
        webSearchContext: "marketing management marketing strategy consumer behavior",
        trustedDomains: []
    },


    /* =========================================================
       MGT 450
       ========================================================= */

    MGT450_CONFIG: {
        collection: "mgt450_vectors",
        blueprintCourseId: 2380,
        courseName: "Introduction to Project Management",
        shortName: "MGT450",
        promptType: "project-management",
        webSearchContext: "project management project planning project execution",
        trustedDomains: []
    },


    /* =========================================================
       NSE
       ========================================================= */

    NSE_CONFIG: {
        collection: "nse_vectors",
        blueprintCourseId: 2379,
        courseName: "NSE",
        shortName: "NSE",
        promptType: "general",
        webSearchContext: "network security cybersecurity",
        trustedDomains: [
            "nist.gov",
            "cisa.gov"
        ]
    },


    /* =========================================================
       EXISTING PSY 360
       ========================================================= */

    PSY360_CONFIG: {
        collection: "psy360_vectors",
        blueprintCourseId: 2460,
        courseName: "Introduction to Social Psychology",
        shortName: "PSY360",
        promptType: "psychology",
        webSearchContext: "social psychology cognition perception behavior",
        trustedDomains: []
    },


    /* =========================================================
       EXISTING MGMT 511
       ========================================================= */

    MGMT511_CONFIG: {
        collection: "mgmt511_vectors",
        blueprintCourseId: 2360,
        courseName: "Financial Management",
        shortName: "MGMT511",
        promptType: "finance",
        webSearchContext: "financial management corporate finance budgeting capital investment financial analysis",
        trustedDomains: []
    }

};


module.exports = courseConfigs;