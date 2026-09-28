export type Language = 'en' | 'hi';

export const LANG_COOKIE = 'satya_lang';
export const DEFAULT_LANG: Language = 'en';

export function getLanguage(cookieValue?: string | null): Language {
  if (cookieValue === 'hi') return 'hi';
  return 'en';
}

export const DICTIONARY: Record<string, Record<Language, string>> = {
  // Navigation & Sections
  civic_intelligence: {
    en: 'Civic Intelligence',
    hi: 'नागरिक विश्लेषण',
  },
  data_title: {
    en: 'Data',
    hi: 'डेटा',
  },
  data_subtitle: {
    en: 'India by the numbers — sourced, structured, transparent.',
    hi: 'आंकड़ों में भारत — प्रामाणिक, व्यवस्थित, पारदर्शी।',
  },
  ai_pipeline_note: {
    en: '⚙ Generated end-to-end by an AI pipeline; contested promise verdicts are checked by an editor.',
    hi: '⚙ एआई पाइपलाइन द्वारा संचालित; विवादित वादों के फैसलों की जांच संपादक द्वारा की जाती है।',
  },
  language_label: {
    en: 'Language',
    hi: 'भाषा',
  },

  // Key Metrics
  articles_tracked: {
    en: 'Articles Tracked',
    hi: 'ट्रैक किए गए लेख',
  },
  last_7_days: {
    en: 'Last 7 Days',
    hi: 'पिछले 7 दिन',
  },
  last_30_days: {
    en: 'Last 30 Days',
    hi: 'पिछले 30 दिन',
  },
  promises_tracked: {
    en: 'Promises Tracked',
    hi: 'ट्रैक किए गए वादे',
  },

  // Government & Politics
  current_government: {
    en: 'Current Government',
    hi: 'वर्तमान सरकार',
  },
  ruling_party: {
    en: 'Ruling Party',
    hi: 'सत्तारूढ़ दल',
  },
  coalition: {
    en: 'Coalition',
    hi: 'गठबंधन',
  },
  prime_minister: {
    en: 'Prime Minister',
    hi: 'प्रधानमंत्री',
  },
  president: {
    en: 'President',
    hi: 'राष्ट्रपति',
  },
  top_ministers_30d: {
    en: 'Most Covered Ministers (30 Days)',
    hi: 'सर्वाधिक चर्चित मंत्री (30 दिन)',
  },
  top_parties_30d: {
    en: 'Most Covered Parties (30 Days)',
    hi: 'सर्वाधिक चर्चित दल (30 दिन)',
  },
  top_states_30d: {
    en: 'Most Covered States (30 Days)',
    hi: 'सर्वाधिक चर्चित राज्य (30 दिन)',
  },

  // Promise Scorecard
  promise_scorecard: {
    en: 'Promise Scorecard',
    hi: 'घोषणापत्र रिपोर्ट कार्ड',
  },
  kept: {
    en: 'Kept',
    hi: 'पूरा किया',
  },
  broken: {
    en: 'Broken',
    hi: 'तोड़ा',
  },
  ongoing: {
    en: 'Ongoing',
    hi: 'प्रगति पर',
  },
  all_promises: {
    en: 'All Promises',
    hi: 'सभी वादे',
  },
  view_all_promises: {
    en: 'View all promises →',
    hi: 'सभी वादे देखें →',
  },

  // Categories
  category_breakdown_30d: {
    en: 'Category Breakdown (30 Days)',
    hi: 'श्रेणीवार वितरण (30 दिन)',
  },
  politics: {
    en: 'Politics',
    hi: 'राजनीति',
  },
  economy: {
    en: 'Economy',
    hi: 'अर्थव्यवस्था',
  },
  governance: {
    en: 'Governance',
    hi: 'प्रशासन',
  },
  social_issues: {
    en: 'Social Issues',
    hi: 'सामाजिक मुद्दे',
  },
  foreign_policy: {
    en: 'Foreign Policy',
    hi: 'विदेश नीति',
  },
  defense_security: {
    en: 'Defense & Security',
    hi: 'रक्षा व सुरक्षा',
  },
  environment: {
    en: 'Environment',
    hi: 'पर्यावरण',
  },
  judiciary: {
    en: 'Judiciary',
    hi: 'न्यायपालिका',
  },
  elections: {
    en: 'Elections',
    hi: 'चुनाव',
  },
  crime: {
    en: 'Crime & Security',
    hi: 'अपराध व सुरक्षा',
  },
  infrastructure: {
    en: 'Infrastructure',
    hi: 'बुनियादी ढांचा',
  },

  // Civic Alert & Flags
  civic_flags: {
    en: 'Civic Alert & Flags (30 Days)',
    hi: 'नागरिक सचेतक व ध्वज (30 दिन)',
  },
  flagged_30d: {
    en: 'Flagged (30d)',
    hi: 'ध्वजांकित (30 दिन)',
  },
  flagged_today: {
    en: 'Flagged (Today)',
    hi: 'ध्वजांकित (आज)',
  },
  hatespeech: {
    en: 'Hate Speech',
    hi: 'द्वेषपूर्ण भाषण',
  },
  corruption_allegation: {
    en: 'Corruption Allegation',
    hi: 'भ्रष्टाचार का आरोप',
  },
  violence_incitement: {
    en: 'Violence Incitement',
    hi: 'हिंसा भड़काना',
  },
  misinformation: {
    en: 'Misinformation',
    hi: 'गलत सूचना',
  },
  constitutional_violation: {
    en: 'Constitutional Violation',
    hi: 'संवैधानिक उल्लंघन',
  },

  // Language feedback
  switched_to_hi: {
    en: 'भाषा बदलकर हिन्दी कर दी गई है',
    hi: 'भाषा बदलकर हिन्दी कर दी गई है',
  },
  switched_to_en: {
    en: 'Language set to English',
    hi: 'Language set to English',
  },
};

/**
 * Translate a key into the target language, falling back to English, then the key itself.
 */
export function t(key: string, lang: Language = DEFAULT_LANG): string {
  if (!key) return '';
  const item = DICTIONARY[key];
  if (!item) return key;
  return item[lang] || item['en'] || key;
}

/**
 * Format category key nicely with fallback to translated label
 */
export function translateCategory(cat: string, lang: Language = DEFAULT_LANG): string {
  const norm = cat.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return t(norm, lang);
}
