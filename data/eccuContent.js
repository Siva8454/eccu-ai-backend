const eccuContent = [
  {
    id: "assignment_submission",
    intent: "assignment",
    keywords: ["submit assignment", "upload assignment", "assignment submission"],
    answer:
      "Assignments must be submitted through Canvas. Go to Modules → Select the assignment → Upload your file → Click Submit. Ensure the status shows 'Submitted'."
  },
  {
    id: "late_submission",
    intent: "assignment",
    keywords: ["late submission", "missed deadline", "submit late"],
    answer:
      "Late submissions are subject to ECCU course policies. Please check the assignment instructions or contact your instructor for approval."
  },
  {
    id: "exams",
    intent: "exam",
    keywords: ["exam", "quiz", "test", "assessment"],
    answer:
      "ECCU exams and quizzes are timed and must be completed in one attempt unless otherwise stated. Ensure a stable internet connection before starting."
  },
  {
    id: "labs_access",
    intent: "labs",
    keywords: ["labs", "ilabs", "practice lab"],
    answer:
      "Labs are available inside the Labs module in Canvas. If you face access issues, try refreshing the page or contact ECCU support."
  },
  {
    id: "canvas_navigation",
    intent: "navigation",
    keywords: ["where is module", "find content", "course materials"],
    answer:
      "All ECCU course content is organized sequentially under the Modules section in Canvas."
  },
  {
    id: "academic_integrity",
    intent: "policy",
    keywords: ["cheating", "plagiarism", "academic integrity"],
    answer:
      "ECCU strictly follows academic integrity policies. Plagiarism or cheating may result in disciplinary action. Always submit original work."
  },
  {
    id: "technical_support",
    intent: "support",
    keywords: ["canvas issue", "technical issue", "not working"],
    answer:
      "For technical issues, try clearing your browser cache or switching browsers. If the issue persists, contact ECCU technical support."
  }
];

module.exports = eccuContent;
