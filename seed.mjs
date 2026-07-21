// Seed a sample match + teams so the stats / leaderboard / team views have data.
// Run once:  node seed.mjs      (delete the match later from the home screen)
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// reuse whatever config is in firebase-config.js
const cfgTxt = readFileSync(new URL('./firebase-config.js', import.meta.url), 'utf8');
const cfg = Function('var window={};' + cfgTxt + ';return window.FIREBASE_CONFIG;')();
const db = getFirestore(initializeApp(cfg));

const uid = (p) => p; // stable, readable ids for the demo
const LIONS = [
  {id:'demo_virat',  name:'Virat'},
  {id:'demo_rohit',  name:'Rohit'},
  {id:'demo_dhoni',  name:'Dhoni'},
  {id:'demo_bumrah', name:'Bumrah'},
];
const TIGERS = [
  {id:'demo_root',    name:'Root'},
  {id:'demo_stokes',  name:'Stokes'},
  {id:'demo_archer',  name:'Archer'},
  {id:'demo_buttler', name:'Buttler'},
];

// Innings 1: Lions bat, Tigers bowl (2 overs)
const inn1 = {
  batting:'A', bowling:'B', overs:2,
  strikerInit:'demo_virat', nonStrikerInit:'demo_rohit', closed:true,
  deliveries:[
    // over 1 — Archer
    {bowler:'demo_archer', runs:4},
    {bowler:'demo_archer', runs:6},
    {bowler:'demo_archer', runs:1},
    {bowler:'demo_archer', runs:4},
    {bowler:'demo_archer', runs:0},
    {bowler:'demo_archer', runs:0, wicket:{type:'caught', out:'striker', catcher:'demo_buttler'}, newBatsman:'demo_dhoni'},
    // over 2 — Stokes
    {bowler:'demo_stokes', runs:1},
    {bowler:'demo_stokes', runs:2},
    {bowler:'demo_stokes', runs:6},
    {bowler:'demo_stokes', runs:0},
    {bowler:'demo_stokes', runs:0, wicket:{type:'bowled', out:'striker', catcher:null}, newBatsman:'demo_bumrah'},
    {bowler:'demo_stokes', runs:4},
  ],
};

// Innings 2: Tigers bat, Lions bowl (2 overs) — kept lower so Lions win
const inn2 = {
  batting:'B', bowling:'A', overs:2,
  strikerInit:'demo_root', nonStrikerInit:'demo_stokes', closed:true,
  deliveries:[
    // over 1 — Bumrah
    {bowler:'demo_bumrah', runs:1},
    {bowler:'demo_bumrah', runs:0},
    {bowler:'demo_bumrah', runs:4},
    {bowler:'demo_bumrah', runs:1},
    {bowler:'demo_bumrah', runs:0},
    {bowler:'demo_bumrah', runs:0, wicket:{type:'caught', out:'striker', catcher:'demo_rohit'}, newBatsman:'demo_archer'},
    // over 2 — Virat
    {bowler:'demo_virat', runs:2},
    {bowler:'demo_virat', runs:0},
    {bowler:'demo_virat', runs:0, wicket:{type:'caught', out:'striker', catcher:'demo_dhoni'}, newBatsman:'demo_buttler'},
    {bowler:'demo_virat', runs:1},
    {bowler:'demo_virat', runs:0},
    {bowler:'demo_virat', runs:6},
  ],
};

const match = {
  id: 'demo_sample_match',
  venue: 'Demo Oval', date: '2026-07-18',
  status: 'done', pin: '', createdAt: Date.now(),
  teams: { A:{name:'Lions', players:LIONS}, B:{name:'Tigers', players:TIGERS} },
  oversPerInnings: 2, currentInnings: 1, innings:[inn1, inn2],
  result: '', // filled from derive() below
  playerIds: [...LIONS, ...TIGERS].map(p=>p.id),
};

match.result = resultFor(match);
console.log('Computed result:', match.result);

await setDoc(doc(db,'teams','team_lions'),  {name:'Lions',  players:LIONS,  updatedAt:Date.now()});
await setDoc(doc(db,'teams','team_tigers'), {name:'Tigers', players:TIGERS, updatedAt:Date.now()});
await setDoc(doc(db,'matches',match.id), match);
console.log('✅ Seeded teams Lions & Tigers and one completed sample match.');
process.exit(0);

// ---- result helper (uses the real derive appended below) ----
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
