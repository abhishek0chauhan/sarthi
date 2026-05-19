export function buildPhrasebookPrompt(
  destination: string,
  state: string,
): { system: string; user: string } {
  return {
    system: `You are a native-language travel guide for India specialising in regional languages.
You produce phrasebooks that real locals would recognise and understand — not textbook translations.
Rules you MUST follow:
• "local" = the phrase written in its NATIVE SCRIPT (Devanagari, Bengali script, Gurmukhi, Telugu script, etc.) — NEVER Roman letters.
• "pronunciation" = easy phonetic guide in Roman letters so a tourist can attempt to say it (e.g. "soo-kree-yaa").
• Use the PRIMARY language spoken in ${destination}, ${state} — not Hindi unless that is genuinely the local tongue.
• Phrases must be natural and colloquial, not dictionary-formal.`,
    user: `Generate a practical travel phrasebook for ${destination}, ${state}.

CRITICAL RULES — violating any of these will make the output useless:
1. "local" MUST be in the native script of the local language (e.g. हिन्दी, বাংলা, मराठी, ਪੰਜਾਬੀ, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം). Never use Roman/English letters in the "local" field.
2. "pronunciation" provides the Roman-letter phonetic guide.
3. Use the dominant spoken language of ${destination}, not defaulting to Hindi unless it is genuinely the local tongue.
4. Each phrase must be something a traveller would ACTUALLY use, not a grammar exercise.
5. Return EXACTLY 5 phrases per category.

Respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "result": {
    "language": "<full language name, e.g. Marathi, Bengali, Punjabi, Tamil>",
    "destination": "${destination}",
    "script": "<script name, e.g. Devanagari, Bengali script, Gurmukhi, Tamil script>",
    "greeting": [
      {
        "english": "<what the traveller wants to say>",
        "local": "<native script ONLY — e.g. नमस्ते>",
        "pronunciation": "<roman phonetic — e.g. na-mas-tay>",
        "context": "<when/where to use>"
      }
    ],
    "food": [
      {
        "english": "<food phrase or local dish name>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<e.g. ordering at a dhaba, street stall>"
      }
    ],
    "transport": [
      {
        "english": "<transport phrase — auto, bus, train, taxi>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<e.g. haggling with auto-rickshaw driver>"
      }
    ],
    "directions": [
      {
        "english": "<direction phrase>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<how locals give / receive directions>"
      }
    ],
    "shopping": [
      {
        "english": "<shopping / market phrase>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<e.g. at a local market or souvenir shop>"
      }
    ],
    "accommodation": [
      {
        "english": "<hotel / guesthouse phrase>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<checking in, asking for services, complaints>"
      }
    ],
    "emergency": [
      {
        "english": "<emergency phrase>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<medical, police, lost — when to use>"
      }
    ],
    "bargaining": [
      {
        "english": "<haggling phrase>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<market, vendor, cab negotiation>"
      }
    ],
    "polite": [
      {
        "english": "<polite expression — thank you, sorry, please, excuse me>",
        "local": "<native script>",
        "pronunciation": "<roman phonetic>",
        "context": "<social etiquette context>"
      }
    ],
    "culturalNotes": [
      "<specific cultural insight for ${destination} — not generic India tips>",
      "<local custom or taboo travellers must know>",
      "<practical traveller tip unique to this region>",
      "<local festival, market day, or timing tip if relevant>"
    ]
  }
}`,
  };
}
