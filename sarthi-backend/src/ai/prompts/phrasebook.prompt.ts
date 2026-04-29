export function buildPhrasebookPrompt(destination: string, state: string): { system: string; user: string } {
  return {
    system: 'You are a travel language assistant specializing in Indian regional languages and local travel culture.',
    user: `Generate a practical travel phrasebook for ${destination}, ${state}.

Include 3 phrases per category. Transliterate local language into Latin script for easy reading. Keep pronunciation guides simple (e.g. "khoo-blay" not IPA).

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"language":"<local language name>","script":"<writing system if non-Latin, else omit>","greeting":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"food":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"directions":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"emergency":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"bargaining":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"culturalNotes":["<important cultural note for visitors>"]}}`,
  };
}
