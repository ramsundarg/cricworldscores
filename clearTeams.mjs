// Delete every document in the `teams` collection (removes all teams AND all
// players, since players live inside team docs). Match docs are NOT touched,
// so past matches and their stats remain intact.
// Run:  node clearTeams.mjs
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, deleteDoc, collection, doc } from 'firebase/firestore';

const cfgTxt = readFileSync(new URL('./firebase-config.js', import.meta.url), 'utf8');
const cfg = Function('var window={};' + cfgTxt + ';return window.FIREBASE_CONFIG;')();
const db = getFirestore(initializeApp(cfg));

const snap = await getDocs(collection(db, 'teams'));
let n = 0;
for (const d of snap.docs) { await deleteDoc(doc(db, 'teams', d.id)); n++; console.log('  deleted team', d.id); }
console.log(`✅ Deleted ${n} team(s) and all their players.`);
process.exit(0);
