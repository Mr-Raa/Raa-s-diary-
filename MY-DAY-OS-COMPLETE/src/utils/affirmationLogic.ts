export type AffirmationCategory = 'all' | 'focus' | 'calm' | 'energy' | 'gujarati';

export interface PositiveQuote {
  id: string;
  quote: string;
  author: string;
  theme: string;
  category: Exclude<AffirmationCategory, 'all'>;
  source: 'curated' | 'external' | 'ai';
}

export const CURATED_AFFIRMATIONS: PositiveQuote[] = [
  {
    id: 'af-1',
    quote: 'Small intentional hours quietly build an extraordinary life.',
    author: "Raa's Diary",
    theme: 'Mindful Clarity',
    category: 'focus',
    source: 'curated',
  },
  {
    id: 'af-2',
    quote: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln',
    theme: 'Deep Focus',
    category: 'focus',
    source: 'curated',
  },
  {
    id: 'af-3',
    quote: 'You do not have to see the whole staircase—just take the first focused step.',
    author: 'Martin Luther King Jr.',
    theme: 'Momentum',
    category: 'focus',
    source: 'curated',
  },
  {
    id: 'af-4',
    quote: 'Protect your morning energy and the entire day aligns around your purpose.',
    author: "Raa's Diary",
    theme: 'Morning Clarity',
    category: 'energy',
    source: 'curated',
  },
  {
    id: 'af-5',
    quote: 'Breathe gently. Peace of mind is the highest form of personal wealth.',
    author: 'Mindful Living',
    theme: 'Inner Calm',
    category: 'calm',
    source: 'curated',
  },
  {
    id: 'af-6',
    quote: 'Consistency beats intensity every single time—show up even for 15 minutes today.',
    author: "Raa's Diary",
    theme: 'Daily Mastery',
    category: 'focus',
    source: 'curated',
  },
  {
    id: 'af-7',
    quote: 'Your calm mind is the ultimate weapon against every challenge.',
    author: 'Bryant McGill',
    theme: 'Serenity',
    category: 'calm',
    source: 'curated',
  },
  {
    id: 'af-8',
    quote: 'Energy flows where your attention goes—invest yours in what truly matters.',
    author: 'Tony Robbins',
    theme: 'Vital Energy',
    category: 'energy',
    source: 'curated',
  },
  {
    id: 'af-9',
    quote: 'Every single glass of water, completed block, and honest note is a vote for your best self.',
    author: "Raa's Diary",
    theme: 'Self-Respect',
    category: 'energy',
    source: 'curated',
  },
  {
    id: 'af-10',
    quote: 'Slow down when needed, never quit—progress is still progress even at a gentle pace.',
    author: 'Daily Wisdom',
    theme: 'Resilience',
    category: 'calm',
    source: 'curated',
  },
  {
    id: 'af-11',
    quote: 'What you do today can improve all of your tomorrows.',
    author: 'Ralph Marston',
    theme: 'Growth',
    category: 'focus',
    source: 'curated',
  },
  {
    id: 'af-12',
    quote: 'Action cures anxiety. Pick one tiny task and finish it cleanly right now.',
    author: "Raa's Diary",
    theme: 'Clarity in Action',
    category: 'energy',
    source: 'curated',
  },
  {
    id: 'af-13',
    quote: 'દરરોજના નાના અને સાચા પ્રયાસો જ એક દિવસ મોટી સફળતા બનાવે છે.',
    author: "Raa's Diary",
    theme: 'સફળતા અને ધીરજ',
    category: 'gujarati',
    source: 'curated',
  },
  {
    id: 'af-14',
    quote: 'મન શાંત રાખો, સમયનું સન્માન કરો — તમારો દરેક દિવસ શ્રેષ્ઠ બનશે.',
    author: 'દૈનિક પ્રેરણા',
    theme: 'મનની શાંતિ',
    category: 'gujarati',
    source: 'curated',
  },
  {
    id: 'af-15',
    quote: 'આજનું એક પૂર્ણ કરેલું કામ આવતીકાલના આત્મવિશ્વાસનો પાયો છે.',
    author: "Raa's Diary",
    theme: 'આત્મવિશ્વાસ',
    category: 'gujarati',
    source: 'curated',
  },
  {
    id: 'af-16',
    quote: 'સફળતા કોઈ જાદુ નથી, તે રોજની સારી ટેવો અને નિયમિતતાનું પરિણામ છે.',
    author: 'જીવન સૂત્ર',
    theme: 'નિયમિતતા',
    category: 'gujarati',
    source: 'curated',
  },
  {
    id: 'af-17',
    quote: 'તમે જેટલું પોતાના સમયને સાચવશો, એટલું જ જીવન તમને આગળ વધારશે.',
    author: "Raa's Diary",
    theme: 'સમયનું મૂલ્ય',
    category: 'gujarati',
    source: 'curated',
  },
  {
    id: 'af-18',
    quote: 'Be proud of how far you have come, and have faith in how far you can go.',
    author: 'Mindful Clarity',
    theme: 'Gratitude',
    category: 'calm',
    source: 'curated',
  },
];

export function filterAffirmationsByCategory(
  category: AffirmationCategory,
  collection: PositiveQuote[] = CURATED_AFFIRMATIONS
): PositiveQuote[] {
  if (category === 'all') return collection;
  const filtered = collection.filter((q) => q.category === category);
  return filtered.length > 0 ? filtered : collection;
}

/**
 * Picks a deterministic positive quote for a given YYYY-MM-DD date so the first view
 * of the day feels anchored and consistent.
 */
export function getDailySeededAffirmation(
  dateIso: string,
  category: AffirmationCategory = 'all',
  collection: PositiveQuote[] = CURATED_AFFIRMATIONS
): PositiveQuote {
  const pool = filterAffirmationsByCategory(category, collection);
  let hash = 0;
  for (let i = 0; i < dateIso.length; i += 1) {
    hash = (hash * 31 + dateIso.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

/**
 * Picks a random positive quote from the filtered pool while avoiding repeating
 * the currently shown quote whenever multiple quotes exist.
 */
export function pickRandomAffirmation(
  category: AffirmationCategory = 'all',
  excludeId?: string,
  randomFn: () => number = Math.random,
  collection: PositiveQuote[] = CURATED_AFFIRMATIONS
): PositiveQuote {
  const pool = filterAffirmationsByCategory(category, collection);
  const candidates = excludeId && pool.length > 1 ? pool.filter((q) => q.id !== excludeId) : pool;
  const idx = Math.floor(Math.max(0, Math.min(0.999999, randomFn())) * candidates.length);
  return candidates[idx] ?? pool[0];
}

/**
 * Normalizes an external quote API payload (e.g. dummyjson / zenquotes / custom API)
 * into a clean PositiveQuote, returning null if invalid.
 */
export function normalizeExternalQuotePayload(raw: unknown): PositiveQuote | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const quoteText =
    typeof obj.quote === 'string'
      ? obj.quote.trim()
      : typeof obj.q === 'string'
        ? obj.q.trim()
        : typeof obj.content === 'string'
          ? obj.content.trim()
          : '';
  if (!quoteText || quoteText.length < 8) return null;

  const authorText =
    typeof obj.author === 'string' && obj.author.trim()
      ? obj.author.trim()
      : typeof obj.a === 'string' && obj.a.trim()
        ? obj.a.trim()
        : 'Positive Wisdom';

  const themeText =
    typeof obj.theme === 'string' && obj.theme.trim() ? obj.theme.trim() : 'Daily Inspiration';

  return {
    id: `ext-${Date.now()}-${Math.abs(quoteText.length * 17)}`,
    quote: quoteText,
    author: authorText,
    theme: themeText,
    category: 'focus',
    source: 'external',
  };
}
