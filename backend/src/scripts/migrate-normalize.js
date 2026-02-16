import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/db.js';
import Author from '../src/models/Author.js';
import Grant from '../src/models/Grant.js';
import Publication from '../src/models/Publication.js';
import { normalizeName } from '../src/utils/normalizeName.js';

(async function(){
  await connectDB();

  console.log('Backfilling authors...');
  const authors = await Author.find({});
  for (const a of authors) {
    const n = normalizeName(a.name || '');
    a.name_canonical = n.canonical;
    a.name_tokens = n.tokens;
    a.name_metaphone = n.metaphone;
    a.name_ngrams = n.ngrams;
    await a.save();
  }

  console.log('Backfilling grants...');
  const grants = await Grant.find({});
  for (const g of grants) {
    const n = normalizeName(g.piName || '');
    g.piName_canonical = n.canonical;
    g.piName_metaphone = n.metaphone;
    g.piName_ngrams = n.ngrams;
    await g.save();
  }

  console.log('Backfilling publications (authors normalized)...');
  const pubs = await Publication.find({});
  for (const p of pubs) {
    p.authors = (p.authors || []).map(a => {
      const n = normalizeName(a.name || '');
      return { ...a, name_canonical: n.canonical, name_metaphone: n.metaphone, name_ngrams: n.ngrams };
    });
    await p.save();
  }

  console.log('Creating Mongo indexes ...');
  await Publication.collection.createIndex({ doi: 1 }, { unique: true });
  await Publication.collection.createIndex({ 'authors.name': 'text', title: 'text', acknowledgementText: 'text' }, { weights: { 'authors.name': 5, title: 3, acknowledgementText: 1 }, name: 'pub_text_index' });
  await Author.collection.createIndex({ name_canonical: 1 }, { name: 'author_name_canonical_idx' });
  await Author.collection.createIndex({ name_ngrams: 1 }, { name: 'author_name_ngrams_idx' });
  await Grant.collection.createIndex({ grantId: 1 }, { unique: true });

  console.log('Migration complete');
  process.exit(0);
})();
