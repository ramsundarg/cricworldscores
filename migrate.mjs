// One-time migration + demo data.
//  - creates "Default League" (PIN: default) and a "2026 Season"
//  - moves any existing matches (incl. the sample) under it
//  - adds a few completed dummy matches so leagues/stats look populated
// Run once:  node migrate.mjs
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

const cfgTxt = readFileSync(new URL('./firebase-config.js', import.meta.url), 'utf8');
const cfg = Function('var window={};' + cfgTxt + ';return window.FIREBASE_CONFIG;')();
const db = getFirestore(initializeApp(cfg));
const sha256 = s => createHash('sha256').update(s||'').digest('hex');

const LEAGUE_ID='league_default', SEASON_ID='season_default';

// ---- teams ----
const LIONS =[{id:'demo_virat',name:'Virat'},{id:'demo_rohit',name:'Rohit'},{id:'demo_dhoni',name:'Dhoni'},{id:'demo_bumrah',name:'Bumrah'}];
const TIGERS=[{id:'demo_root',name:'Root'},{id:'demo_stokes',name:'Stokes'},{id:'demo_archer',name:'Archer'},{id:'demo_buttler',name:'Buttler'}];
const EAGLES=[{id:'eag_smith',name:'Smith'},{id:'eag_warner',name:'Warner'},{id:'eag_cummins',name:'Cummins'},{id:'eag_starc',name:'Starc'}];
const SHARKS=[{id:'shk_kane',name:'Kane'},{id:'shk_boult',name:'Boult'},{id:'shk_santner',name:'Santner'},{id:'shk_conway',name:'Conway'}];

// ball spec: number = runs; {w,by,nb,runs,extra} = event
function buildInnings(batting, bowling, striker, nonStriker, overs, oversList){
  const deliveries=[];
  for(const ov of oversList) for(const b of ov.balls){
    if(typeof b==='number') deliveries.push({bowler:ov.bowler, runs:b, extra:null, wicket:null, newBatsman:null});
    else deliveries.push({bowler:ov.bowler, runs:b.runs||0, extra:b.extra||null,
      wicket:b.w?{type:b.w, out:'striker', catcher:b.by||null}:null, newBatsman:b.nb||null});
  }
  return {batting, bowling, overs, strikerInit:striker, nonStrikerInit:nonStriker, closed:true, deliveries};
}
function mkMatch(id, date, A, B, inn1, inn2){
  const m={ id, venue:'Demo Oval', date, status:'done', pin:'', createdAt:Date.now(),
    leagueId:LEAGUE_ID, seasonId:SEASON_ID, seasonName:'2026 Season',
    teams:{A, B}, oversPerInnings:2, currentInnings:1, innings:[inn1,inn2], result:'',
    playerIds:[...A.players,...B.players].map(p=>p.id) };
  m.result=resultFor(m); return m;
}

// ---- dummy matches ----
const d1i1=buildInnings('A','B','demo_virat','demo_rohit',2,[
  {bowler:'demo_archer', balls:[4,1,2,0,6,1]},
  {bowler:'demo_stokes', balls:[1,{w:'caught',by:'demo_buttler',nb:'demo_dhoni'},4,0,1,2]},
]);
const d1i2=buildInnings('B','A','demo_root','demo_stokes',2,[
  {bowler:'demo_bumrah', balls:[1,0,4,{w:'caught',by:'demo_rohit',nb:'demo_archer'},1,0]},
  {bowler:'demo_virat',  balls:[2,1,0,6,{w:'caught',by:'demo_dhoni',nb:'demo_buttler'},1]},
]);
const d2i1=buildInnings('A','B','eag_smith','eag_warner',2,[
  {bowler:'shk_boult',   balls:[6,4,1,0,2,1]},
  {bowler:'shk_santner', balls:[0,4,{w:'caught',by:'shk_conway',nb:'eag_cummins'},1,6,0]},
]);
const d2i2=buildInnings('B','A','shk_kane','shk_boult',2,[
  {bowler:'eag_cummins', balls:[1,4,0,2,{w:'caught',by:'eag_warner',nb:'shk_santner'},1]},
  {bowler:'eag_starc',   balls:[0,6,1,{w:'bowled',nb:'shk_conway'},2,0]},
]);
const d3i1=buildInnings('A','B','demo_virat','demo_rohit',2,[
  {bowler:'eag_starc',   balls:[1,1,4,6,0,{w:'caught',by:'eag_smith',nb:'demo_dhoni'}]},
  {bowler:'eag_cummins', balls:[2,4,1,0,1,6]},
]);
const d3i2=buildInnings('B','A','eag_smith','eag_warner',2,[
  {bowler:'demo_bumrah', balls:[4,1,0,2,{w:'caught',by:'demo_dhoni',nb:'eag_cummins'},1]},
  {bowler:'demo_virat',  balls:[0,1,6,4,{w:'caught',by:'demo_rohit',nb:'eag_starc'},0]},
]);

const dummies=[
  mkMatch('demo_d1','2026-07-15',{name:'Lions',players:LIONS},{name:'Tigers',players:TIGERS},d1i1,d1i2),
  mkMatch('demo_d2','2026-07-16',{name:'Eagles',players:EAGLES},{name:'Sharks',players:SHARKS},d2i1,d2i2),
  mkMatch('demo_d3','2026-07-17',{name:'Lions',players:LIONS},{name:'Eagles',players:EAGLES},d3i1,d3i2),
];

// ---- run ----
await setDoc(doc(db,'leagues',LEAGUE_ID), {name:'Default League', pinHash:sha256('default'), createdAt:Date.now()});
await setDoc(doc(db,'seasons',SEASON_ID), {leagueId:LEAGUE_ID, name:'2026 Season', createdAt:Date.now()});
console.log('League + season ready (Default League, PIN: default)');

// register the demo teams
for(const [slug,name,players] of [['team_lions','Lions',LIONS],['team_tigers','Tigers',TIGERS],['team_eagles','Eagles',EAGLES],['team_sharks','Sharks',SHARKS]])
  await setDoc(doc(db,'teams',slug), {name, players, updatedAt:Date.now()}, {merge:true});

// migrate any existing matches with no league
const snap=await getDocs(collection(db,'matches'));
let moved=0;
for(const d of snap.docs){ const m=d.data();
  if(!m.leagueId){ await setDoc(doc(db,'matches',d.id), {leagueId:LEAGUE_ID, seasonId:SEASON_ID, seasonName:'2026 Season'}, {merge:true}); moved++; }
}
console.log('Migrated existing matches into the default season:', moved);

for(const m of dummies){ await setDoc(doc(db,'matches',m.id), m); console.log('  seeded', m.id, m.teams.A.name,'vs',m.teams.B.name,'->',m.result); }
console.log('✅ Done.');
process.exit(0);

function resultFor(m){
  const a=derive(m,m.innings[0]), b=derive(m,m.innings[1]);
  const t1=a.total, t2=b.total;
  const n1=m.teams[m.innings[0].batting].name, n2=m.teams[m.innings[1].batting].name;
  if(t2>t1){ const wl=(m.teams[m.innings[1].batting].players.length-1)-b.wickets; return `${n2} won by ${wl} wicket${wl!==1?'s':''}`; }
  if(t1>t2){ return `${n1} won by ${t1-t2} run${t1-t2!==1?'s':''}`; }
  return 'Match tied';
}
function pName(m,id){ for(const k of ['A','B']){ const p=(m.teams[k].players||[]).find(x=>x.id===id); if(p) return p.name; } return id||''; }
function derive(match, inn){
  const battingPlayers = match.teams[inn.batting].players; // [{id,name}]
  const bat={}, bowl={};   // keyed by player id
  const ensureBat=id=>{ if(id && !bat[id]) bat[id]={id,name:pName(match,id),runs:0,balls:0,fours:0,sixes:0,out:null}; };
  const ensureBowl=id=>{ if(id && !bowl[id]) bowl[id]={id,name:pName(match,id),balls:0,runs:0,wkts:0}; };
  let total=0, wickets=0, legalBalls=0, extrasTotal=0;
  let striker=inn.strikerInit, nonStriker=inn.nonStrikerInit;
  let ballInOver=0;
  const timeline=[]; // per current-over display
  ensureBat(striker); ensureBat(nonStriker);
  const swap=()=>{ const t=striker; striker=nonStriker; nonStriker=t; };

  for(const d of inn.deliveries){
    ensureBowl(d.bowler);
    ensureBat(striker); ensureBat(nonStriker);
    const b=bowl[d.bowler];
    if(d.extra==='wide'){
      total+=1; extrasTotal+=1; b.runs+=1;
      timeline.push({t:'Wd',cls:'ex'});
      continue; // no ball faced, no strike change (MVP)
    }
    if(d.extra==='noball'){
      total+=1; extrasTotal+=1; b.runs+=1 + (d.runs||0);
      total+=(d.runs||0);
      if(d.runs){ bat[striker].runs+=d.runs; }
      timeline.push({t:'Nb'+(d.runs? '+'+d.runs:''),cls:'ex'});
      if((d.runs||0)%2===1) swap();
      continue; // rebowled, not a legal ball
    }
    // legal delivery
    const r=d.runs||0;
    bat[striker].runs+=r; bat[striker].balls+=1;
    if(r===4) bat[striker].fours++; if(r===6) bat[striker].sixes++;
    total+=r; b.runs+=r; b.balls+=1; legalBalls++; ballInOver++;

    if(d.wicket){
      wickets++;
      const outWho = d.wicket.out==='nonstriker' ? 'nonStriker':'striker';
      const outName = outWho==='striker'? striker : nonStriker;
      let how = d.wicket.type;
      bat[outName].out = { type:how, catcher:d.wicket.catcher||null, bowler:d.bowler };
      if(how!=='run out') b.wkts++;
      // bring in new batsman to the vacated end
      if(outWho==='striker') striker = d.newBatsman; else nonStriker = d.newBatsman;
      ensureBat(striker); ensureBat(nonStriker);
      timeline.push({t:'W',cls:'w'});
    }else{
      if(r%2===1) swap();
      timeline.push({t:String(r), cls: r===4?'four': r===6?'six': ''});
    }
    if(ballInOver===6){ ballInOver=0; swap(); }
  }

  const allOut = wickets >= (battingPlayers.length-1);
  const oversDone = legalBalls >= inn.overs*6;
  const complete = inn.closed || allOut || oversDone;
  // current bowler = bowler of the last delivery of the in-progress over
  let curBowler=null;
  if(ballInOver>0){ // find bowler of current over
    for(let i=inn.deliveries.length-1;i>=0;i--){ if(inn.deliveries[i].extra!=='wide'){ curBowler=inn.deliveries[i].bowler; break; } }
    if(!curBowler && inn.deliveries.length) curBowler=inn.deliveries[inn.deliveries.length-1].bowler;
  }
  const awaitingBowler = !complete && ballInOver===0; // need a bowler chosen for next ball
  // last bowler (can't bowl consecutive overs)
  let lastOverBowler=null;
  if(inn.deliveries.length){
    // walk back to find the bowler of the previous completed over
    lastOverBowler = inn.deliveries[inn.deliveries.length-1].bowler;
  }
  return {bat,bowl,total,wickets,legalBalls,extrasTotal,striker,nonStriker,ballInOver,
          curBowler,lastOverBowler,complete,allOut,oversDone,timeline,battingPlayers};
}
