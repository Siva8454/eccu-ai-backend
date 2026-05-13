const axios = require("axios");

async function trustedWebSearch(query) {

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content:
              `
You are a cybersecurity academic assistant.

Provide ONLY trusted supplementary learning resources.

STRICT RULES:
- Include only trusted cybersecurity sources.
- NEVER include competitor universities.
- NEVER include dark web content.
- NEVER include suspicious blogs.
- NEVER include piracy or illegal content.

ALLOWED SOURCES:
- OWASP
- NIST
- Microsoft Learn
- IBM
- Cisco
- Cloudflare
- MITRE
- EC-Council
- CISA
- Mozilla Developer Docs
- PortSwigger

Format:
1. Resource Name
2. Short description
3. URL
`
          },

          {
            role: "user",
            content: query
          }
        ],

        temperature: 0.3
      },

      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {

    console.error(
      "Trusted search error:",
      err.response?.data || err.message
    );

    return "";

  }

}

module.exports = {
  trustedWebSearch
};