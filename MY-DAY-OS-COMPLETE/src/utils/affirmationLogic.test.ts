import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_AFFIRMATIONS,
  filterAffirmationsByCategory,
  getDailySeededAffirmation,
  normalizeExternalQuotePayload,
  pickRandomAffirmation,
} from './affirmationLogic';

test('filterAffirmationsByCategory filters cleanly and supports Gujarati quotes', () => {
  const guQuotes = filterAffirmationsByCategory('gujarati');
  assert.ok(guQuotes.length >= 4);
  assert.ok(guQuotes.every((q) => q.category === 'gujarati'));

  const allQuotes = filterAffirmationsByCategory('all');
  assert.equal(allQuotes.length, CURATED_AFFIRMATIONS.length);
});

test('getDailySeededAffirmation returns deterministic quote for a given date', () => {
  const q1 = getDailySeededAffirmation('2026-11-18', 'all');
  const q2 = getDailySeededAffirmation('2026-11-18', 'all');
  assert.equal(q1.id, q2.id);
});

test('pickRandomAffirmation avoids repeating the excluded quote id', () => {
  const first = CURATED_AFFIRMATIONS[0];
  const next = pickRandomAffirmation('all', first.id, () => 0);
  assert.notEqual(next.id, first.id);
});

test('normalizeExternalQuotePayload normalizes DummyJSON and ZenQuotes shapes safely', () => {
  const fromDummy = normalizeExternalQuotePayload({
    quote: 'Stay hungry, stay foolish, stay consistent.',
    author: 'Steve Jobs',
  });
  assert.ok(fromDummy);
  assert.equal(fromDummy.quote, 'Stay hungry, stay foolish, stay consistent.');
  assert.equal(fromDummy.author, 'Steve Jobs');
  assert.equal(fromDummy.source, 'external');

  const fromZen = normalizeExternalQuotePayload({
    q: 'Peace comes from within. Do not seek it without.',
    a: 'Buddha',
  });
  assert.ok(fromZen);
  assert.equal(fromZen.author, 'Buddha');

  assert.equal(normalizeExternalQuotePayload({ quote: 'hi' }), null);
  assert.equal(normalizeExternalQuotePayload(null), null);
});
