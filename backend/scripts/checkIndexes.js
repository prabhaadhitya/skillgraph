import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve('backend/.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;

const collections = await db.listCollections().toArray();
console.log('--- Real Indexes in MongoDB ---');

for (const col of collections) {
  const indexes = await db.collection(col.name).indexes();
  console.log(`\nCollection: [${col.name}]`);
  for (const idx of indexes) {
    const keyStr = JSON.stringify(idx.key);
    const flags = [];
    if (idx.unique) flags.push('unique');
    if (idx.expireAfterSeconds !== undefined) flags.push(`TTL: ${idx.expireAfterSeconds}s (${idx.expireAfterSeconds / 86400}d)`);
    if (idx.weights) flags.push(`text-weights: ${JSON.stringify(idx.weights)}`);
    console.log(`  - ${idx.name}: ${keyStr} ${flags.length ? `[${flags.join(', ')}]` : ''}`);
  }
}

await mongoose.disconnect();
