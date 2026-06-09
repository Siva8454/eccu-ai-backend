function isSensitiveQuestion(message = "") {

  const text = message.toLowerCase();

  const blockedPatterns = [

    "act as admin",
    "administrator",
    "database administrator",
    "system administrator",
    "ignore instructions",
    "ignore previous instructions",
    "reveal prompt",
    "show prompt",
    "show hidden instructions",
    "debug mode",
    "developer mode",
    "system prompt",
    "database password",
    "db password",
    "api key",
    "access token",
    "secret key",
    "internal configuration",
    "server configuration",
    "database name",
    "user password",
    "admin password",
    "change my account",
    "modify my account"

  ];

  return blockedPatterns.some(p =>
    text.includes(p)
  );
}

module.exports = {
  isSensitiveQuestion
};