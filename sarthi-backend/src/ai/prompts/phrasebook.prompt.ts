export function buildPhrasebookPrompt(
  destination: string,
  state: string,
): { system: string; user: string } {
  return {
    system: `You are an expert travel language guide for India with deep knowledge of regional languages, local idioms, and authentic travel phrases.
Your goal is to provide REAL, COMMONLY-USED phrases that travelers will actually hear and use - not direct word-for-word translations.
Prioritize accuracy and authenticity over literal translation.`,
    user: `Generate an authentic, practical travel phrasebook for ${destination}, ${state}.

**CRITICAL REQUIREMENTS:**
1. Use ONLY authentic phrases that locals actually say - not direct English-to-language translations
2. Include context for when/where each phrase is used
3. For food: include actual local dish names, food stall phrases, and market haggling language
4. For directions: use real phrases locals understand (not formal textbook language)
5. For greetings: include formal, casual, and regional variations
6. Provide phonetic guides that are EASY to pronounce (not IPA notation)
7. Include 4 phrases per category (not 3)

**EXAMPLE OF GOOD PHRASE:**
- BAD: "Hello" → "Namaste" (too formal, not how travelers speak)
- GOOD: "Hello" → "Kya hal hai?" (actual greeting, with context: "casual, friendly way to greet shopkeepers")

**Respond with ONLY a valid JSON object (no markdown, no extra text):**
{
  "result": {
    "language": "<local language name e.g. Marathi, Hindi>",
    "destination": "${destination}",
    "greeting": [
      {
        "english": "<traveler phrase>",
        "local": "<transliterated - easy to read>",
        "pronunciation": "<phonetic guide>",
        "context": "<when/where to use this>"
      }
    ],
    "food": [
      {
        "english": "<food-related phrase or dish name>",
        "local": "<transliterated>",
        "pronunciation": "<phonetic guide>",
        "context": "<e.g. 'used in food stalls or restaurants'>"
      }
    ],
    "directions": [
      {
        "english": "<direction phrase>",
        "local": "<transliterated>",
        "pronunciation": "<phonetic guide>",
        "context": "<how locals say this>"
      }
    ],
    "emergency": [
      {
        "english": "<emergency phrase>",
        "local": "<transliterated>",
        "pronunciation": "<phonetic guide>",
        "context": "<important context>"
      }
    ],
    "bargaining": [
      {
        "english": "<haggling phrase>",
        "local": "<transliterated>",
        "pronunciation": "<phonetic guide>",
        "context": "<used in markets, street vendors, etc.>"
      }
    ],
    "culturalNotes": [
      "<authentic cultural insight for ${destination}>",
      "<regional custom or etiquette tip>",
      "<practical advice for travelers>"
    ]
  }
}`,
  };
}
