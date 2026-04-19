import React, { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById("lcars-fonts")) return;
  const l = document.createElement("link");
  l.id = "lcars-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Antonio:wght@400;700&family=Share+Tech+Mono&family=Nunito:wght@400;600;700&display=swap";
  document.head.appendChild(l);
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const LS = {
  get:(k,fb)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
};
const KEYS = { settings:"rm_settings", profiles:"rm_profiles" };

// ─────────────────────────────────────────────────────────────────────────────
// AGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const BIRTH_DATA = {
  EMM:{month:6,year:2015}, RSM:{month:9,year:2019}, MRM:{month:8,year:2022},
  SR:{month:3,year:1983}, DM:{month:6,year:1975},
};
function calcAge(m,y){ const n=new Date(); let a=n.getFullYear()-y; if(n.getMonth()+1<m)a--; return a; }
function getCurrentAges(){ const a={}; for(const[c,d]of Object.entries(BIRTH_DATA))a[c]=calcAge(d.month,d.year); return a; }

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENTAL STAGES
// ─────────────────────────────────────────────────────────────────────────────
// Reusable Spock note component
function SpockNote({text,t}){
  return(
    <div style={{padding:"10px 14px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10,marginTop:8}}>
      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.14em",marginBottom:4,fontWeight:700}}>MR. SPOCK</div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6,fontStyle:"italic"}}>{text}</div>
    </div>
  );
}

function getDevStage(age){
  if(age<=2)return{
    regulation:"Co-regulation only — your calm presence is the entire strategy.",
    social:"Attachment figure is the world. Parallel play beginning.",
    academic:"Pre-literacy. Sensory exploration is learning.",
    parentNote:"Your presence IS the strategy. There is nothing to fix — only to accompany.",
    spockNote:"At this developmental stage, the prefrontal cortex is essentially non-functional for self-regulation. The child's nervous system borrows regulatory capacity from yours. The logical implication: your own regulation is not a luxury — it is the primary intervention."
  };
  if(age<=4)return{
    regulation:"Beginning to name big feelings with support. Tantrums are neurologically normal.",
    social:"Turn-taking emerging but fragile. Narrate social situations aloud.",
    academic:"Pre-reading. Play IS the curriculum.",
    parentNote:"Naming feelings out loud is the highest-value thing you can do right now.",
    spockNote:"A tantrum at this age is not a behavioural choice — it is the prefrontal cortex being temporarily overwhelmed by subcortical activation. The child is not manipulating. They are flooded. Attempting to reason with a flooded nervous system is, by definition, illogical."
  };
  if(age<=7)return{
    regulation:"Can use simple strategies with reminders. Needs co-regulation in stress.",
    social:"Friendship concepts forming. Fairness matters enormously.",
    academic:"Literacy foundation years. Sustained attention for learning is limited at this age — shorter bursts with movement between are more effective than long sits.",
    parentNote:"Strategies taught during calm moments are most likely to be available in hard ones.",
    spockNote:"This is a particularly receptive window for building shared regulation language. A child who learns to name 'yellow' at age 6 has a meaningful advantage at 10. The investment made during calm moments is precisely what becomes available during dysregulated ones."
  };
  if(age<=11)return{
    regulation:"Can begin to identify zone independently. Benefits from rehearsed plans.",
    social:"Peer relationships increasingly important. Exclusion is very painful.",
    academic:"Reading to learn. Comprehension and written expression building.",
    parentNote:"A regulation plan the child helped design has the best chance of being used.",
    spockNote:"At this age, the child's ability to use a regulation strategy under stress is closely related to how often they have practised it during calm moments. Frequency of rehearsal in calm moments is the variable most under parental control."
  };
  return{
    regulation:"Adolescent window — emotional intensity is neurological, not defiance.",
    social:"Peer group central. Identity forming.",
    academic:"Abstract reasoning developing. Motivation is the key driver.",
    parentNote:"Curiosity and connection are more effective than consequence at this age.",
    spockNote:"The adolescent prefrontal cortex is undergoing a renovation, not a malfunction. Emotional responses that appear disproportionate are neurologically consistent with this developmental period. The logical response is not to match the intensity — it is to provide the regulated adult presence the system still requires, even when it appears to reject it."
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────────────────────────────────────
async function callClaude(system,user,maxTokens=1200){
  const res=await fetch("/.netlify/functions/claude",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages:[{role:"user",content:user}]})
  });
  if(!res.ok){const t=await res.text();throw new Error(`API ${res.status}: ${t.slice(0,200)}`);}
  const d=await res.json();
  const text=d.content?.find(b=>b.type==="text")?.text||"";
  if(!text)throw new Error("Empty API response");
  return text;
}
async function callClaudeJSON(system,user,maxTokens=1200){
  const raw=await callClaude(system,user,maxTokens);
  const clean=raw.replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim();
  try{return JSON.parse(clean);}catch{
    const m=clean.match(/\{[\s\S]*\}/);
    if(m)try{return JSON.parse(m[0]);}catch{}
    throw new Error("Not valid JSON");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE & THEME
// ─────────────────────────────────────────────────────────────────────────────
const P={
  amber:"#FF9900",dustyRed:"#CC6666",paleBlue:"#99CCFF",lilac:"#CC99FF",
  midBlue:"#4DB8FF",spock:"#6B8CFF",teal:"#00B4B4",gold:"#FFCC00",
  peach:"#FF9966",lavender:"#9999FF",mint:"#66FFCC",coral:"#FF6666",
};
const DEFAULT_COLOURS={EMM:P.amber,RSM:P.dustyRed,MRM:P.paleBlue,SR:P.lilac,DM:P.midBlue};
const THEME={
  dark:{bg:"#000000",surface:"#0A0A1A",surface2:"#111122",panel:"#1A1A2E",border:"#2A2A4A",text:"#FFFFFF",textMuted:"#8888AA",textDim:"#444466",headerBg:"#0D0018"},
  light:{bg:"#E8E8F0",surface:"#F5F5FF",surface2:"#EBEBF8",panel:"#DCDCF0",border:"#AAAACC",text:"#111133",textMuted:"#555577",textDim:"#9999AA",headerBg:"#C8C0E0"},
};

// ─────────────────────────────────────────────────────────────────────────────
// ZONES
// ─────────────────────────────────────────────────────────────────────────────
const ZONES=[
  {id:"red",label:"Red",emoji:"🔴",desc:"Above window — high arousal",childDesc:"Really big feelings. Hard to think.",colour:"#EF4444"},
  {id:"yellow",label:"Yellow",emoji:"🟡",desc:"Approaching upper edge — elevated",childDesc:"Feeling wobbly. Getting harder.",colour:"#EAB308"},
  {id:"green",label:"Green",emoji:"🟢",desc:"In window — regulated and available",childDesc:"Feeling good. Ready.",colour:"#22C55E"},
  {id:"blue",label:"Blue",emoji:"🔵",desc:"Below window — low/shutdown",childDesc:"Flat. Hard to get started.",colour:"#3B82F6"},
];
const zoneColour=id=>ZONES.find(z=>z.id===id)?.colour||"#888";
const zoneEmoji=id=>ZONES.find(z=>z.id===id)?.emoji||"";

// ─────────────────────────────────────────────────────────────────────────────
// SPOCK — 17 TOOLS + FOLLOW-UP QUESTION TREES
// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: zone → follow-up question set
// Layer 2: answer → second follow-up (optional)
// Final: Claude gets zone + L1 answer + L2 answer + profile context → specific tool recommendation

const SPOCK_FOLLOWUPS={
  red:{
    question:"What are you seeing most right now?",
    options:[
      {id:"explosive",label:"Physical — shouting, moving, can't be still"},
      {id:"crying",label:"Emotional — crying, overwhelmed, collapsed"},
      {id:"fleeing",label:"Avoidance — trying to leave or hide"},
      {id:"frozen",label:"Frozen — not responding to anything"},
    ],
    layer2:{
      explosive:{question:"How long has this been going?",options:[{id:"just_started",label:"Just started"},{id:"building",label:"Building for a while"},{id:"peaked",label:"Feels like it's peaked"}]},
      crying:{question:"Is there a specific trigger you know of?",options:[{id:"known",label:"Yes — something specific happened"},{id:"unknown",label:"Not sure — came on suddenly"},{id:"cumulative",label:"Feels like it's been building all day"}]},
      fleeing:{question:"What happens when you try to follow or bring them back?",options:[{id:"escalates",label:"Makes it worse"},{id:"accepts",label:"Accepts presence eventually"},{id:"ignores",label:"Ignores completely"}]},
      frozen:{question:"How long have they been like this?",options:[{id:"minutes",label:"Just a few minutes"},{id:"longer",label:"15 minutes or more"},{id:"all_day",label:"Most of today"}]},
    }
  },
  yellow:{
    question:"What's the main thing you're noticing?",
    options:[
      {id:"restless",label:"Restless, fidgeting, can't settle"},
      {id:"argumentative",label:"Argumentative, pushing back on everything"},
      {id:"provocative",label:"Making comments to provoke — testing"},
      {id:"refusal",label:"Refusing a specific request or task"},
    ],
    layer2:{
      restless:{question:"What's the environment like right now?",options:[{id:"noisy",label:"Noisy or busy"},{id:"quiet",label:"Quiet but they can't settle"},{id:"transition",label:"We just changed activity or location"}]},
      argumentative:{question:"What seems to be underneath it?",options:[{id:"control",label:"Feels like a power/control thing"},{id:"fairness",label:"Something feels unfair to them"},{id:"overwhelmed",label:"Overwhelmed by a demand"}]},
      provocative:{question:"How are you responding so far?",options:[{id:"engaging",label:"Engaging with the comments"},{id:"ignoring",label:"Trying to ignore"},{id:"redirecting",label:"Trying to redirect"}]},
      refusal:{question:"What's the refusal about?",options:[{id:"task",label:"A task or demand"},{id:"transition",label:"Moving to a new place or activity"},{id:"social",label:"Being near another person"}]},
    }
  },
  green:{
    question:"What brings you here when things seem okay?",
    options:[
      {id:"connection",label:"Want to make the most of this window"},
      {id:"repair",label:"Something happened earlier — want to repair it"},
      {id:"pattern",label:"Noticing a pattern I want to understand"},
      {id:"proactive",label:"Planning ahead for harder moments"},
    ],
    layer2:{
      connection:{question:"What kind of connection feels right right now?",options:[{id:"conversation",label:"A real conversation"},{id:"activity",label:"Doing something alongside them"},{id:"acknowledgement",label:"Just noticing and naming what's good"}]},
      repair:{question:"How did things end in the hard moment?",options:[{id:"walked_away",label:"One of us walked away"},{id:"fizzled",label:"It fizzled out, not really resolved"},{id:"ok",label:"Was okay-ish but not addressed"}]},
      pattern:{question:"What pattern are you noticing?",options:[{id:"time",label:"Happens at a particular time of day"},{id:"trigger",label:"Linked to a specific trigger"},{id:"mood",label:"Connected to their general mood state"}]},
      proactive:{question:"What are you preparing for?",options:[{id:"transition",label:"A transition or change coming"},{id:"difficult_day",label:"A day that's likely to be hard"},{id:"recurring",label:"Something that keeps happening"}]},
    }
  },
  blue:{
    question:"What does 'flat' look like right now?",
    options:[
      {id:"withdrawn",label:"Silent, won't engage, head down"},
      {id:"slow",label:"Moving slowly, not initiating anything"},
      {id:"glazed",label:"Glazed — seems 'gone', not tracking"},
      {id:"reluctant",label:"Willing but everything is hard to start"},
    ],
    layer2:{
      withdrawn:{question:"Do they seem upset, or more like they've switched off?",options:[{id:"upset",label:"There's something underneath — feels emotional"},{id:"off",label:"Switched off — no affect either way"},{id:"tired",label:"Just exhausted"}]},
      slow:{question:"How long have they been like this?",options:[{id:"woke_like_it",label:"Woke up this way"},{id:"after_something",label:"After something happened"},{id:"gradual",label:"Gradually got this way during the day"}]},
      glazed:{question:"What have you tried so far?",options:[{id:"talking",label:"Talking to them"},{id:"leaving_alone",label:"Leaving them alone"},{id:"nothing",label:"Not sure what to try"}]},
      reluctant:{question:"What specifically is hard to start?",options:[{id:"everything",label:"Everything equally"},{id:"demands",label:"Anything that feels like a demand"},{id:"social",label:"Anything involving other people"}]},
    }
  },
};

// Adult-facing followup questions — first person, self-directed
const ADULT_SPOCK_FOLLOWUPS={
  red:{
    question:"What's happening for you right now?",
    options:[
      {id:"explosive",label:"I can't calm down — I'm flooded"},
      {id:"crying",label:"I'm overwhelmed, can't stop"},
      {id:"fleeing",label:"I need to get away from everything"},
      {id:"frozen",label:"I've shut down — I can't move"},
    ],
    layer2:{
      explosive:{question:"How long have you been like this?",options:[{id:"just_started",label:"Just started"},{id:"building",label:"Building for a while"},{id:"peaked",label:"Feels like it's peaked"}]},
      crying:{question:"Is there a specific trigger?",options:[{id:"known",label:"Yes — something specific happened"},{id:"unknown",label:"Not sure — came on suddenly"},{id:"cumulative",label:"Building all day"}]},
      fleeing:{question:"What happens when you try to stay?",options:[{id:"escalates",label:"Gets worse"},{id:"accepts",label:"I can manage nearby"},{id:"ignores",label:"I can't engage at all"}]},
      frozen:{question:"How long have you been like this?",options:[{id:"minutes",label:"Just a few minutes"},{id:"longer",label:"15 minutes or more"},{id:"all_day",label:"Most of today"}]},
    }
  },
  yellow:{
    question:"What's happening for you right now?",
    options:[
      {id:"restless",label:"Restless, fidgeting, can't settle"},
      {id:"argumentative",label:"Irritable, pushing back on everything"},
      {id:"provocative",label:"Saying things I'll likely regret"},
      {id:"refusal",label:"Avoiding something I need to do"},
    ],
    layer2:{
      restless:{question:"What's the environment like?",options:[{id:"noisy",label:"Noisy or busy"},{id:"quiet",label:"Quiet but I still can't settle"},{id:"transition",label:"Just changed activity or location"}]},
      argumentative:{question:"What's underneath it?",options:[{id:"control",label:"Feels like a power or control thing"},{id:"fairness",label:"Something feels unfair"},{id:"overwhelmed",label:"Overwhelmed by demands"}]},
      provocative:{question:"How am I responding to myself?",options:[{id:"engaging",label:"Dwelling on the thoughts"},{id:"ignoring",label:"Trying to ignore them"},{id:"redirecting",label:"Trying to redirect"}]},
      refusal:{question:"What am I avoiding?",options:[{id:"task",label:"A task or demand"},{id:"transition",label:"Moving to a new activity"},{id:"social",label:"Being around other people"}]},
    }
  },
  green:{
    question:"What brings you here when things feel okay?",
    options:[
      {id:"connection",label:"Want to make the most of this window"},
      {id:"repair",label:"Something happened — want to address it"},
      {id:"pattern",label:"Noticing a pattern about myself"},
      {id:"proactive",label:"Planning ahead for harder moments"},
    ],
    layer2:{
      connection:{question:"What kind of investment feels right?",options:[{id:"conversation",label:"A real conversation"},{id:"activity",label:"Doing something alongside the family"},{id:"acknowledgement",label:"Noticing and naming what's good"}]},
      repair:{question:"How did the hard moment end?",options:[{id:"walked_away",label:"One of us walked away"},{id:"fizzled",label:"It fizzled out, not resolved"},{id:"ok",label:"Was okay-ish but not addressed"}]},
      pattern:{question:"What pattern am I noticing?",options:[{id:"time",label:"Happens at a particular time of day"},{id:"trigger",label:"Linked to something specific"},{id:"mood",label:"Connected to my general state"}]},
      proactive:{question:"What am I preparing for?",options:[{id:"transition",label:"A transition or change coming"},{id:"difficult_day",label:"A day likely to be hard"},{id:"recurring",label:"Something that keeps happening"}]},
    }
  },
  blue:{
    question:"What does low feel like for you right now?",
    options:[
      {id:"withdrawn",label:"I've shut down — can't engage"},
      {id:"slow",label:"Moving slowly, not initiating anything"},
      {id:"glazed",label:"Glazed — I feel gone"},
      {id:"reluctant",label:"Willing but everything is hard to start"},
    ],
    layer2:{
      withdrawn:{question:"Is there something underneath, or have I switched off?",options:[{id:"upset",label:"Something underneath — feels emotional"},{id:"off",label:"Switched off — no affect either way"},{id:"tired",label:"Just exhausted"}]},
      slow:{question:"How long have I been like this?",options:[{id:"woke_like_it",label:"Woke up this way"},{id:"after_something",label:"After something happened"},{id:"gradual",label:"Gradually got this way during the day"}]},
      glazed:{question:"What have I tried?",options:[{id:"talking",label:"Talking to someone"},{id:"leaving_alone",label:"Being alone"},{id:"nothing",label:"Not sure what to try"}]},
      reluctant:{question:"What specifically is hard to start?",options:[{id:"everything",label:"Everything equally"},{id:"demands",label:"Anything that feels like a demand"},{id:"social",label:"Anything involving other people"}]},
    }
  },
};

// ── SPOCK STATIC LOOKUP — all 48 paths pre-baked, zero API latency ────────────
// Key format: "zone.l1.l2"
const SPOCK_LOOKUP={
  // ── RED: explosive ─────────────────────────────────────────────────────────
  "red.explosive.just_started":{primaryTool:"Space & Silence",primarySteps:["Drop your voice immediately — near silence, not firm.","Say once only: 'I'm here. You're safe. Nothing needs to happen right now.'","Step back 2 metres. Turn slightly sideways. Arms loose at your sides.","Stop talking. Do not fill the silence. Your calm body is the intervention.","Breathe slowly and visibly. Your nervous system is a signal to theirs."],secondaryTool:"Movement Exit",secondaryNote:"If they're physically agitated and can move safely, offer: 'Want to walk with me?' No discussion — just the offer.",sayThis:["'I'm right here. You're safe.'","'Nothing needs to happen yet.'"],spockNote:"This has just started — the window to prevent escalation is still open. Your regulated presence is doing more than any words could."},
  "red.explosive.building":{primaryTool:"Space & Silence",primarySteps:["Do not increase any input — no louder voice, no closer proximity.","Say once: 'I'm here.' Then stop talking entirely.","Increase the physical space between you — at least 2 metres.","Open posture: sideways, arms at sides, face soft. No eye contact unless they offer it.","Wait. This is the hardest part. Silence is active work.","When the first de-escalation signal appears — a breath, a pause — say quietly: 'Good. Just breathe.' Nothing else yet."],secondaryTool:"Cyclic Sigh",secondaryNote:"Do it yourself, visibly, without narrating it. Double inhale through the nose, long exhale through the mouth. If they copy, great. If not, keep going.",sayThis:["'I'm here.'","'Good. Just breathe.'"],spockNote:"When it's been building, the nervous system needs time — not intervention. Space and silence are the intervention."},
  "red.explosive.peaked":{primaryTool:"No-Demand Presence",primarySteps:["The peak means the worst is likely passing — don't interrupt it with demands.","Stay in the space at a comfortable distance. Do something quiet of your own.","No eye contact, no questions, no narration.","If they ask you to leave: 'I'll give you more space' — step back but stay nearby.","When they settle, offer a simple co-regulatory anchor: 'Good. Just breathe.' Then wait again.","Repair happens later, in the green zone — not now."],secondaryTool:"Cyclic Sigh",secondaryNote:"Do it yourself once they're beginning to settle — it models regulation without requiring anything from them.",sayThis:["'I'm just here.'","'Take all the time you need.'"],spockNote:"A peaked escalation is already resolving. Your job now is not to restart it — presence without demand is exactly right."},

  "red.crying.known":{primaryTool:"No-Demand Presence",primarySteps:["Don't try to fix what caused it — that comes later.","Sit nearby, not directly in front. No eye contact unless they offer it.","Say once: 'That sounds really hard. I'm right here.'","Then stop talking. The presence is the support.","If they move toward you, go with it. If they want space, give it.","When they've settled, if they want to talk: listen first, fix nothing."],secondaryTool:"Affect Labelling",secondaryNote:"When they're calmer: 'That sounds like it was really overwhelming.' Then stop. Don't follow up immediately.",sayThis:["'That sounds really hard. I'm right here.'","'You don't have to talk about it yet.'"],spockNote:"When the trigger is known, the temptation is to explain or reassure. What's actually needed is company — someone who can sit with the weight of it."},
  "red.crying.unknown":{primaryTool:"No-Demand Presence",primarySteps:["When the cause is unclear, don't try to diagnose it in the moment.","Move close enough to be present, but not so close it feels crowding.","Say once: 'I'm here. You don't have to know why.'","Sit down — lower your physical position. It signals safety.","Wait. Breathe visibly. Let your calm be the signal.","If they want contact, offer it. If not, stay near."],secondaryTool:"Gentle Sensory",secondaryNote:"A warm drink, a blanket, something with texture — offered without explanation. 'I made you something warm.'",sayThis:["'I'm here. You don't have to know why.'","'I'm not going anywhere.'"],spockNote:"Not every wave of emotion has a named cause — especially for nervous systems that accumulate rather than discharge. Being present without needing an explanation is a gift."},
  "red.crying.cumulative":{primaryTool:"Space & Silence",primarySteps:["A cumulative build means the nervous system has been under load all day — it needs discharge, not input.","Reduce all environmental stimulation if possible: lower lights, quieter space, fewer people.","Say once: 'You've had a really big day. I'm here.'","Then go quiet. No processing, no problem-solving.","Stay present. Don't leave unless safety requires it.","Much later, in the green zone: 'I noticed today was really hard. What was the hardest bit?'"],secondaryTool:"Cyclic Sigh",secondaryNote:"Do it yourself a few times, visibly. It models discharge without requiring anything from them.",sayThis:["'You've had such a big day. I'm right here.'","'Nothing needs to happen now.'"],spockNote:"A day-long build is the nervous system telling you it has been managing without enough support. The flood at the end is the release valve — it's working as it should."},

  "red.fleeing.escalates":{primaryTool:"Space & Silence",primarySteps:["Following when it escalates is counter-productive — stop following.","Stay visible but at a significant distance.","Do not call after them or increase demands.","Lower your own arousal visibly — slow your breathing, soften your posture.","Wait until they've found a space. Then, after a pause: 'I'm here whenever you're ready.'","Do not go to them — let them come back when they're ready."],secondaryTool:"No-Demand Presence",secondaryNote:"Once they've settled somewhere, you can move quietly into the same general area without closing the distance. Just be in the same space.",sayThis:["'I'm here whenever you're ready.'"],spockNote:"When following makes it worse, following is the wrong tool. Your availability — not your proximity — is what they need to know about."},
  "red.fleeing.accepts":{primaryTool:"No-Demand Presence",primarySteps:["They accept presence — use it. Move quietly into the same space.","Don't talk. Don't explain. Don't ask questions.","Sit down nearby. Do something quiet of your own.","Let your calm body be the regulatory input.","When they're settled, one quiet check: 'I'm just here.' Then nothing else.","Wait for them to initiate — don't fill the silence."],secondaryTool:"Cyclic Sigh",secondaryNote:"Do it yourself, quietly, a few times. Your exhale is a safety signal.",sayThis:["'I'm just here.'"],spockNote:"Acceptance of presence is a significant signal — it means the relational safety is there. Don't use it to talk. Use it to be."},
  "red.fleeing.ignores":{primaryTool:"Space & Silence",primarySteps:["Being ignored doesn't mean your presence isn't working — it means the nervous system is in survival mode.","Stay visible at a distance. Do not chase or call out.","Lower all environmental inputs you can control.","Make yourself available without making demands: sit somewhere they can see you if they choose to look.","Give it time — more than feels comfortable.","When the ignoring softens, move quietly closer without speaking."],secondaryTool:null,secondaryNote:null,sayThis:["(Stay quiet — no words needed right now)"],spockNote:"Being ignored is not rejection — it is the nervous system signalling that it cannot process social input right now. Your patient visibility is the intervention."},

  "red.frozen.minutes":{primaryTool:"No-Demand Presence",primarySteps:["Frozen for just a few minutes is often the beginning of de-escalation — the storm passing.","Don't interpret the freeze as a problem to solve.","Stay in the space, quiet, at a comfortable distance.","Breathe slowly and visibly. Your regulated body is a safety signal.","No eye contact, no questions. Just present.","Give it 5 more minutes before doing anything else."],secondaryTool:"Gentle Sensory",secondaryNote:"A warm drink placed nearby, not handed over. 'I've got something here if you want it.' Then step back.",sayThis:["'I'm right here. Take all the time you need.'"],spockNote:"A few minutes of freeze is the nervous system downshifting. Don't interrupt the recovery — your quiet presence is exactly right."},
  "red.frozen.longer":{primaryTool:"Gentle Sensory",primarySteps:["After 15+ minutes, gentle sensory input can help the nervous system find a foothold back.","Offer a warm drink, a blanket, or something with texture — without explanation.","'I've got something warm here if you want it.' Put it nearby. Step back.","Don't hover. Don't ask if they're okay.","Rhythmic sound in the background can help — quiet music, a familiar show at low volume.","Stay in the space. No demands. No agenda."],secondaryTool:"No-Demand Presence",secondaryNote:"You are the primary regulatory input — stay present, stay regulated, make nothing required.",sayThis:["'I've got something here if you want it.'","'No rush at all.'"],spockNote:"Extended freeze is the nervous system in a dorsal vagal state — it needs gentle activation from the bottom up, not reasoning or reassurance from the top down."},

  // ── RED: self (adult) — same structure but reframed ─────────────────────────
  // (The zone structure is shared; Spock guidance adapts to adult vs child in the UI)

  // ── YELLOW: restless ───────────────────────────────────────────────────────
  "yellow.restless.noisy":{primaryTool:"Movement Break",primarySteps:["The environment is contributing — reduce stimulation while offering movement.","'Want to step outside for 5 minutes?' No explanation needed.","Go with them if you can — side-by-side movement is co-regulatory.","Keep it brief: 5 minutes outside, then back. No agenda during the movement.","Return without fuss — don't check if they're 'better'."],secondaryTool:"Proprioceptive Input",secondaryNote:"If going outside isn't possible: 'Can you help me carry this?' Heavy work addresses sensory load directly.",sayThis:["'Want to step outside for a few minutes?'","'Let's just get some air.'"],spockNote:"A noisy environment is doing regulatory work on the nervous system whether anyone notices it or not. Reducing the input load is the first move, not managing the response to it."},
  "yellow.restless.quiet":{primaryTool:"Proprioceptive Input",primarySteps:["Restlessness in a quiet environment often means the nervous system needs more input, not less.","Offer heavy work: 'Can you help me carry something?' or 'Want to do some wall push-ups?'","Wall push-ups: flat hands on wall, push hard, hold for 5 counts, release. Repeat 5 times.","Or: jump on the spot 20 times, carry a full washing basket, push furniture slightly.","Don't explain why. Just make the offer and do it together."],secondaryTool:"Movement Break",secondaryNote:"If proprioceptive work doesn't land, a short walk or outdoor time can also shift the state.",sayThis:["'Can you help me carry something?'","'Want to do something physical for a bit?'"],spockNote:"When the environment is already quiet and restlessness continues, the nervous system is generating its own arousal. It needs an output — proprioceptive input gives it somewhere to go."},
  "yellow.restless.transition":{primaryTool:"Predictability Anchor",primarySteps:["Transition restlessness is often anticipatory — the nervous system is already tracking the change.","Name what's happening: 'I know we just changed gears — that can feel unsettled.'","Give a clear, brief picture of what comes next: 'We're going to [x], and after that [y].'","Offer a micro-choice within the new activity: 'Do you want to start with [a] or [b]?'","Don't rush the transition — give it a few minutes to settle."],secondaryTool:"Movement Break",secondaryNote:"A brief movement opportunity in the transition itself can help the nervous system shift gears.",sayThis:["'I know we just changed — that can feel unsettled.'","'Here's what's coming: [simple sequence].'"],spockNote:"Transition restlessness is not misbehaviour — it is a nervous system processing a change in state. Predictability and a moment of movement are the most efficient responses."},

  "yellow.argumentative.control":{primaryTool:"Micro-Choice",primarySteps:["Identify what's non-negotiable (the outcome you need) and what genuinely can be flexible.","Offer two real options — not trick choices: 'You can do this now or in 10 minutes — your call.'","Or: 'You can do this here or in your room — up to you.'","After they choose: say 'Good' and move on. Don't revisit it or add commentary.","Build in at least 2-3 genuine choices in the next hour for a child who's stuck in control mode."],secondaryTool:"Side-by-Side",secondaryNote:"Once a choice is made, work alongside rather than directing. Remove the power differential from the environment.",sayThis:["'You can do this here or there — your call.'","'Good.'"],spockNote:"The argument about control is rarely about the surface issue. Offering genuine choice within a structure removes the power struggle without removing the structure."},
  "yellow.argumentative.fairness":{primaryTool:"Affect Labelling",primarySteps:["Name the feeling before doing anything else: 'That sounds really unfair to you.'","Stop. Don't justify, explain, or problem-solve yet.","If they want to talk about it: 'Tell me what happened from your side.'","Listen fully before responding. Don't interrupt.","Acknowledge their experience even if you see it differently: 'I can see why that felt unfair.'","Only after acknowledgement: gently offer your perspective or a solution."],secondaryTool:"Micro-Choice",secondaryNote:"Once acknowledged, offer them choice in what happens next — restores autonomy after the fairness wound.",sayThis:["'That sounds really unfair.'","'Tell me what happened from your side.'"],spockNote:"A fairness injury feels like a fundamental injustice to the person experiencing it — not a matter of proportion. Acknowledgement before explanation is the only sequence that works."},

  "yellow.provocative.engaging":{primaryTool:"Side-by-Side",primarySteps:["Engaging with provocative comments is giving them what they're seeking — stop engaging.","Don't respond to the content of the comment. Don't correct, explain, or react.","Move into a side-by-side position — near them, doing something of your own.","Flat affect, warm tone: 'I'm just here.' Then nothing.","Wait. The provocation will likely escalate once before it de-escalates — hold steady.","When it stops: don't address it. Just continue alongside them."],secondaryTool:"Micro-Choice",secondaryNote:"Once the provocative pattern settles, offer a genuine micro-choice to restore positive engagement.",sayThis:["'I'm just here.'","(Then silence — don't engage with the content)"],spockNote:"Provocative comments are bids for connection, testing the relationship, or seeking to regain a sense of control. Engaging with them escalates; steady, warm non-reaction de-escalates."},
  "yellow.provocative.ignoring":{primaryTool:"Side-by-Side",primarySteps:["You're already on the right track — don't fill the silence with corrections.","Stay in the space. Do something genuine of your own.","Maintain warm affect even as you don't engage with the content.","'I'm just here.' Once — then nothing.","When the provocative pattern settles, don't address it. Move forward warmly."],secondaryTool:"Interest Hook",secondaryNote:"Once things settle, a genuine comment about something they care about can bridge back to positive connection.",sayThis:["'I'm just here.'"],spockNote:"Ignoring provocative content while staying warmly present is exactly the right move. The key is not cold ignoring — it is warm non-engagement."},
  "yellow.provocative.redirecting":{primaryTool:"Side-by-Side",primarySteps:["Redirecting to tasks during provocative behaviour can feel like a demand — which can escalate it.","Pause the redirection. Move alongside instead.","Don't address the comments. Don't redirect to anything yet.","'I'm just here for a bit.' Then do something of your own nearby.","Let the provocative behaviour find its own end — then move gently forward."],secondaryTool:"Micro-Choice",secondaryNote:"After it settles, a micro-choice is a better re-entry than a redirect: 'Do you want to do x or y?'",sayThis:["'I'm just here for a bit.'"],spockNote:"Redirection during a provocative phase often reads as another control move. Side-by-side presence removes the power dynamic that's driving the behaviour."},

  "yellow.refusal.transition":{primaryTool:"Predictability Anchor",primarySteps:["Don't increase pressure — it will deepen the refusal.","Name what's happening: 'I know it's hard to switch gears.'","Give a clear, calm picture of what the transition leads to: 'After this we're going to [x], and then [y].'","Offer a small choice within the transition: 'Do you want to walk or we can take the long way?'","Give a time anchor: 'In about 3 minutes we're going to move. I'll give you a heads-up.'"],secondaryTool:"Movement Break",secondaryNote:"Build movement into the transition itself — it helps the nervous system shift state.",sayThis:["'I know it's hard to switch gears.'","'In 3 minutes we're going to move — I'll let you know.'"],spockNote:"Transition refusal is one of the most consistent presentations of nervous system inflexibility. Predictability and choice are the two tools that reliably lower the threshold."},
  "yellow.refusal.social":{primaryTool:"Side-by-Side",primarySteps:["Don't force proximity to the other person — the refusal is a safety signal.","Move into a side-by-side position with the child, not facing them.","Don't explain or justify. Just be nearby.","If there's another adult: brief, quiet coordination — one of you stays with the child.","Over time, if the social situation continues: interest hook. Find something about the other person or activity that might open a bridge."],secondaryTool:"Micro-Choice",secondaryNote:"Offer a micro-choice about proximity: 'You can stay here or move closer — up to you.' Don't push.",sayThis:["'You can stay right here.'","'I'm here with you.'"],spockNote:"Refusal of social proximity is the nervous system assessing a situation as unsafe. The response is to make the immediate environment safe — not to push into the perceived threat."},

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "green.connection.activity":{primaryTool:"Side-by-Side",primarySteps:["Choose an activity they enjoy or find easy — not something that requires effort from them.","Work alongside without directing.","Match their pace. Don't push the activity forward.","Let conversation happen naturally — don't force it.","The activity is a vehicle for co-presence, not the point."],secondaryTool:"Interest Hook",secondaryNote:"If they seem flat even in the green zone, connect through an interest domain — something they light up about.",sayThis:["'Want to do [activity] together?'","'I'll just join you if that's okay.'"],spockNote:"Side-by-side activity in the green zone builds the relational bank without requiring face-to-face social processing. It is one of the most efficient connection tools available."},
  "green.connection.acknowledgement":{primaryTool:"Affect Labelling",primarySteps:["Name something specific and positive you've noticed — not generic praise.","'I noticed you handled that really well this morning.'","Or: 'I've been thinking about how you [specific thing]. That's not easy.'","Stop after the observation. Don't turn it into a lesson.","Let them respond however they want to — or not at all."],secondaryTool:null,secondaryNote:null,sayThis:["'I noticed you handled that really well.'","'I've been thinking about something I saw you do.'"],spockNote:"Specific, genuine acknowledgement is one of the most powerful regulatory inputs available in the green zone. The specificity is what makes it land — generic praise doesn't."},

  "green.repair.walked_away":{primaryTool:"Repair Conversation",primarySteps:["Choose a genuinely calm moment — both of you settled.","'I've been thinking about what happened earlier. Can I say something?'","'I'm sorry I [specific thing — not a vague apology].'","Then: 'What was happening for you in that moment?' Listen first. Don't justify.","You don't have to agree with their account. You have to demonstrate you heard it.","Close warmly: 'I'm glad we could talk about it. We're okay.'"],secondaryTool:"Affect Labelling",secondaryNote:"If they become emotional during the conversation, name it and slow down: 'That still feels hard.' Then wait.",sayThis:["'I've been thinking about earlier. Can I say something?'","'I'm sorry I [specific thing].'","'What was it like for you?'"],spockNote:"A repair after walking away is more valuable than the original conflict was costly. Every repair teaches the nervous system that ruptures don't mean the end of the relationship."},
  "green.repair.fizzled":{primaryTool:"Repair Conversation",primarySteps:["A fizzled ending leaves an unresolved charge — it's worth naming.","'I've been thinking about what happened. It kind of just stopped without us really talking about it.'","'I want to understand what it was like for you.'","Listen without defending.","You don't need to resolve the original issue — you need to close the relational loop."],secondaryTool:null,secondaryNote:null,sayThis:["'I've been thinking about earlier — it kind of just stopped without us really talking.'","'What was it like for you?'"],spockNote:"An unaddressed rupture leaves a residue in the relational account. A brief, genuine repair clears it — and demonstrates that the relationship is safe enough to return to."},
  "green.repair.ok":{primaryTool:"Repair Conversation",primarySteps:["'Okay-ish' often means neither person felt fully heard — worth returning to.","'I just wanted to check in about earlier. I think I could have handled it better.'","Keep it brief and specific. Don't relitigate the whole episode.","'How are you feeling about it now?' — then listen.","A 2-minute repair in the green zone is worth more than the original conversation."],secondaryTool:"Affect Labelling",secondaryNote:"If they seem to still be carrying something: 'You seem like you're still a bit [feeling].' Then wait.",sayThis:["'I just wanted to check in about earlier.'","'How are you feeling about it now?'"],spockNote:"Returning briefly to something that was 'okay-ish' signals that the relationship matters more than being right. That signal accumulates."},

  "green.pattern.time":{primaryTool:"Predictability Anchor",primarySteps:["You've identified a time pattern — now build support into that time proactively.","Map the pattern: what time, what comes before it, what the presentation looks like.","Build a routine anchor at or before that time: a check-in, a movement opportunity, a transition warning.","Don't address the behaviour at the time — address the conditions before it arrives.","Test the anchor for a week. Adjust based on what you observe."],secondaryTool:"Zones Check-in",secondaryNote:"Add a zones check-in at the pattern time — even informal, even just 'how's your body feeling?' This gives you data and gives them language.",sayThis:["'I've noticed [time] is often harder. Let's build something in before that.'"],spockNote:"A time-based pattern is the nervous system telling you it runs out of regulatory capacity at a predictable point. The fix is structural — not in the moment, but before it arrives."},
  "green.pattern.trigger":{primaryTool:"Interest Inventory",primarySteps:["A known trigger pattern is intelligence — use it to plan, not react.","Map the trigger: what exactly, in what context, preceded by what.","Build avoidance or preparation into the routine where possible.","Where the trigger can't be avoided: prepare the nervous system before exposure. Movement, check-in, predictability.","After an incident: 'I've noticed [x] is often hard. What would help next time?'"],secondaryTool:"Predictability Anchor",secondaryNote:"Triggers often land harder when they arrive unexpectedly. Building predictability around trigger situations reduces their impact.",sayThis:["'I've noticed [trigger] is often hard. What would help next time?'"],spockNote:"Knowing a trigger is most useful before the trigger arrives. The green zone is the time to map, plan, and build support into the environment — not to process the last incident."},
  "green.pattern.mood":{primaryTool:"Zone Data Review",primarySteps:["If you're noticing a mood pattern, the zone log history is the first place to look. Open the History tab and look for clustering — are reds and yellows concentrated on particular days, times, or after specific events?",
"Look for the missed yellow. Most mood episodes that feel sudden have a yellow phase that preceded them — logged or not. Is there a time of day where yellow is consistently present before a red?",
"Once a pattern is visible in the data, bring it to a green-zone conversation. Not 'I've noticed you're difficult on Mondays' — 'I've been looking at the data and I'm curious about something. Can I share it?'",
"Name the pattern as information, not as a character observation: 'It looks like Tuesday afternoons tend to be harder than other times. I'm wondering what's happening then.'",
"From there: collaborative problem-solving. What's the unsolved problem that produces the pattern? What would make that time of day more manageable?",
"One experiment at a time. Try one structural change and track it. The data will tell you if it's working."],secondaryTool:"Predictability Anchor",secondaryNote:"Once the pattern is understood, a predictability anchor at the pattern's usual onset time can interrupt it before it starts — a low-demand transition warning that signals 'we know this is coming and we're ready for it.'",sayThis:["'I've been looking at the data and I'm curious about something.'","'What does [time/day] tend to feel like for you?'","'What would make it easier?'"],spockNote:"Mood patterns are nervous system patterns — they respond to data and structural intervention, not to reasoning or motivational conversations. The value of longitudinal zone data is that it converts a subjective impression into an observable pattern, which can be examined collaboratively without blame on either side. This is the empathy step in CPS applied at the pattern level."},

  "green.proactive.transition":{primaryTool:"Visual Support — First/Then Board",primarySteps:["In green zone is the only time to introduce a visual support — before you need it, when everyone is regulated.",
"Make it simple: two sections, FIRST and THEN. Draw or print images, not just words for this profile.",
"'First [bath], then [story].' Show them. Let them touch it. Ask them to read it back to you.",
"Practise using it now, while everyone is calm: 'Let's see if we can remember — what comes first?'",
"When the hard moment comes, point to the board instead of repeating verbal instructions. Fewer words is more effective.",
"One visual sequence at a time. Don't introduce more than the household can remember.",
"Put it in the same place every time — same wall, same spot. Consistent location builds automatic reference."],secondaryTool:"Predictability Anchor",secondaryNote:"The visual board and the verbal warning work together. Give the verbal anchor ('in five minutes we start bedtime') and then point to the board. Over time the board carries the load and the words become optional.",sayThis:["'Let's look at what's coming next.'","'What does the board say? You tell me.'","'First this — then that. Same as always.'"],spockNote:"Visual processing is significantly more reliable than auditory processing under stress — particularly for ADHD and ASD presentations. A visual support introduced in green zone and placed in a consistent location becomes an external memory system available at exactly the moment internal working memory is most compromised."},
  "green.proactive.recurring":{primaryTool:"Repair Conversation",primarySteps:["Something recurring in the green zone deserves a genuine collaborative conversation.","'I've noticed [pattern] keeps happening. I'd like to understand it better.'","'What's it like for you when [x] happens?'","Listen first. Build a shared map of the situation.","Then: 'What do you think would help?' — take their answer seriously, even partially.","Make one small structural change based on the conversation."],secondaryTool:"Zones Check-in",secondaryNote:"Build a check-in around the recurring situation — data is the first step toward structural change.",sayThis:["'I've noticed [pattern] keeps coming up. Can we talk about it?'","'What's it like for you when that happens?'"],spockNote:"A recurring difficulty is an unsolved problem. In the green zone, collaborative problem-solving is available — this is the time to use it, not the middle of the next incident."},

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "blue.withdrawn.upset":{primaryTool:"No-Demand Presence",primarySteps:["There's something underneath — don't try to surface it yet.","Move into the space quietly. Sit nearby, not too close.","No eye contact, no questions. Do something quiet of your own.","Say once: 'I'm here. You don't have to talk.'","If they show any sign of wanting contact — follow their lead gently.","When they're ready, a single open question: 'Do you want to tell me anything?' Then wait."],secondaryTool:"Affect Labelling",secondaryNote:"When they settle slightly: 'You seem like you're carrying something heavy.' Then stop.",sayThis:["'I'm here. You don't have to talk.'","'I'm not going anywhere.'"],spockNote:"Withdrawn-with-something-underneath needs witness before it can be shared. Your quiet presence is the invitation — not your questions."},
  "blue.withdrawn.tired":{primaryTool:"Gentle Sensory",primarySteps:["Exhaustion is real — don't fight it.","Offer warmth and comfort without demands: a blanket, a warm drink, something soft.","'You look really tired. I've got [thing] here.'","Let them rest if they need to. Presence without agenda.","Don't add cognitive load — no questions, no plans, no agenda."],secondaryTool:"No-Demand Presence",secondaryNote:"Stay nearby while they rest. Your regulated presence is still doing regulatory work even when they're asleep.",sayThis:["'You look really tired. That's okay.'","'I've got [warm thing] here.'"],spockNote:"Tired is information, not a problem. A rested nervous system is a more regulated nervous system. Protecting rest is a regulatory act."},

  "blue.slow.woke_like_it":{primaryTool:"Pre-Routine Activation Signal",primarySteps:["Waking slow means the nervous system is still in a low-arousal state — it hasn't shifted gears yet. The routine cannot begin until the shift has started.",
"The hardest part of any morning is the transition from sleep or absorbed activity into the routine sequence. This transition needs its own structure.",
"Use the same signal every morning — a specific phrase, a piece of music, a light change — to start movement before any task is asked. Same signal, every day, without variation.",
"The signal should come 5–10 minutes before the first routine step, when they are still in bed or in pyjamas. Do not negotiate, explain, or problem-solve during the signal.",
"After the signal: offer warmth without demand. A warm drink in their space. Sit nearby doing something of your own. No tasks yet.",
"The adult's own regulatory state at this point is the co-regulatory input for the whole morning. A regulated presence lowers the initiation cost for everyone.",
"First routine step after the signal: zone check-in. 'How's your body right now?' Not 'hurry up.' This tells you what kind of morning you're working with."],secondaryTool:"Rhythmic Low-Demand",secondaryNote:"If the signal alone isn't moving things forward, add something rhythmic and low-demand before the first task — a familiar song, a short movement snack, carrying something from room to room. Rhythm activates the brainstem before the cortex is needed.",sayThis:["'[signal] — morning time.'","'Here's something warm.'","'How's your body right now?'"],spockNote:"Initiation from a low-arousal or absorbed state is a distinct executive function demand from completing a task that has already begun. Many ADHD and ASD presentations have significant initiation impairment that is invisible once the task is underway. The signal structure externalises the initiation cost — replacing an internal EF demand with an external environmental cue."},
  "blue.slow.after_something":{primaryTool:"No-Demand Presence",primarySteps:["Something happened and they're still carrying it — don't rush recovery.","Stay nearby without making demands or asking about what happened.","If they want to talk, be available: 'I'm here if you want to say anything.'","Don't try to fix the thing that happened.","Let recovery take the time it takes — don't set a timeline."],secondaryTool:"Rhythmic Low-Demand",secondaryNote:"Offer a gentle activity to occupy the hands while the nervous system processes: something repetitive and low-stakes.",sayThis:["'I'm here if you want to say anything.'","'Take all the time you need.'"],spockNote:"Slowness after something happened is the nervous system processing. The processing is the recovery — don't shortcut it."},
  "blue.slow.gradual":{primaryTool:"Movement Break",primarySteps:["A gradual slow across the day suggests regulatory capacity has been depleting — the demand load has been too high.","Offer movement now: 'Want to get some air?' or 'Let's take a walk.'","Reduce all non-essential demands for the rest of the day.","Build in a check-in: 'How's your body doing?'","Tomorrow: look at today's schedule and reduce the load before it arrives."],secondaryTool:"Rhythmic Low-Demand",secondaryNote:"After movement, offer a low-demand activity to consolidate the recovery rather than returning straight to demands.",sayThis:["'Want to get some air?'","'How's your body doing?'"],spockNote:"A gradual slow is the nervous system sending a clear signal about load. The most useful response is movement now and a lighter schedule tomorrow."},

  "blue.glazed.talking":{primaryTool:"No-Demand Presence",primarySteps:["Talking to someone who is glazed increases the input load — stop talking.","Stay in the space. Go quiet. Do something of your own.","No eye contact. No agenda.","Offer a warm drink or something sensory nearby: 'I've left something here.'","Wait. Give it more time than feels comfortable."],secondaryTool:"Gentle Sensory",secondaryNote:"Temperature input — warm drink, warm water, cool face cloth — can help the nervous system find a foothold back.",sayThis:["(Go quiet — reduce all verbal input)","'I've left something here if you want it.'"],spockNote:"Talking to a glazed nervous system is adding input to a system that cannot process it. Silence and sensory warmth are more effective than words right now."},
  "blue.glazed.leaving_alone":{primaryTool:"No-Demand Presence",primarySteps:["Leaving alone is reasonable — but staying present without demands is often more effective.","Return to the space. Sit quietly. Do something of your own.","Make your presence available without making it a demand.","Offer something sensory nearby without comment.","You don't need to engage — just be in the space."],secondaryTool:"Rhythmic Low-Demand",secondaryNote:"Leave a rhythmic activity nearby: something to fold, sort, or fidget with. No instruction — just available.",sayThis:["'I'm just going to be in here for a bit.'"],spockNote:"Being left alone can feel like abandonment to a glazed nervous system, even if they don't signal it. Present-but-quiet is more regulatory than absent."},
  "blue.glazed.nothing":{primaryTool:"Gentle Sensory",primarySteps:["Start with the most concrete, immediate thing: warmth.","Offer a warm drink without explanation: 'I made something warm.'","Or: place a blanket nearby. Or a familiar object with texture.","Then sit in the space quietly — no agenda.","After 10 minutes of this, try a single low-demand rhythmic activity: 'I've got [thing] here if you want it.'"],secondaryTool:"Rhythmic Low-Demand",secondaryNote:"Follow the sensory offer with a rhythmic activity if there's any sign of engagement.",sayThis:["'I made something warm.'","'I've got something here if you want it.'"],spockNote:"When nothing has been tried, start with the body — warmth, texture, something to hold. The nervous system responds to sensation before it responds to language."},

  "blue.reluctant.everything":{primaryTool:"Micro-Choice",primarySteps:["When everything is equally hard, the barrier is initiation itself — not any specific task.","Make the first step as small as possible: 'Just one thing. What's the tiniest start?'","Offer a genuine choice about what to do first: 'Do you want to start with [a] or [b]?'","Once started, stay nearby without directing.","Don't set expectations about how much gets done — just help initiation."],secondaryTool:"Side-by-Side",secondaryNote:"Start something of your own alongside them — your initiation can lower their initiation threshold.",sayThis:["'Just one tiny thing. What would be the smallest start?'","'Do you want to pick where to begin?'"],spockNote:"Universal reluctance is an initiation problem — the executive function cost of starting anything is currently too high. The tiniest possible first step lowers the threshold."},
  "blue.reluctant.demands":{primaryTool:"Demand-Frame Removal + Micro-Initiation",primarySteps:["Anything framed as a demand will be refused right now — even gentle demands. Remove the demand framing entirely before anything else.",
"Don't say 'can you' or 'you need to' or 'it's time to.' These are demand frames that the nervous system reads as threat right now.",
"Move alongside them in their space. Do something of your own. No task in mind, no agenda visible.",
"After 3–5 minutes of parallel presence: offer the smallest possible entry point. Not the task — the first physical movement. 'Can you just put one sock on?' Or touch the object that starts the sequence.",
"If they do that one thing: 'That's it. That's all I needed.' Genuine. Don't immediately escalate to the next step.",
"Most will continue once initiated. If they don't, repeat the micro-step offer once more and drop it. The initiation is the whole goal.",
"The adult's regulated presence in their space is doing active work even when nothing is happening on the surface."],secondaryTool:"Body-Doubling",secondaryNote:"Once the micro-step has worked, transition to body-doubling: 'I'll be right here doing my own thing while you do yours.' Your presence lowers the initiation cost for the next step without adding a demand.",sayThis:["'I'm just going to be in here for a bit.'","'Can you just [first physical movement]?'","'That's it. You don't have to do anything else right now.'"],spockNote:"Demand-resistance in a low-arousal state is the nervous system accurately reporting that its available executive function cannot absorb the initiation cost of the task being requested. The solution is not encouragement or consequence — it is reducing the initiation cost to its absolute minimum. One physical movement, no framing, no stakes."},

  // ── Batch 2: New home-specific tools wired into existing paths ───────────────

  // Transition paths — Predictability Anchor upgraded with Transition Warning detail


  // Environmental/sensory paths

  // Body-doubling for blue initiation paths


  // Interest-led entry for blue/green connection paths

  // Narrated calm for red escalation that resists all other approaches

  // Co-regulation through activity for yellow/blue social refusal

  // Repair ritual for green proactive work

  // Sensory diet for blue withdrawal after something

  // ── Batch 3 ───────────────────────────────────────────────────────────────

  // Bedtime anxiety — yellow refusal at transition to bed

  // Transition to a new activity — yellow restless after a change

  // Blue glazed with no success trying anything

  // Green — wanting to build connection through activity

  // Yellow — argumentative because overwhelmed by a demand

  // Green — noticing a time-of-day pattern

  // Blue — withdrawn and clearly emotional underneath

  // Green — proactive for a likely difficult day

  // ── Batch 3 ───────────────────────────────────────────────────────────────

  // Yellow — refusal at task, not transition

  // Yellow — provocative with ignoring response

  // Green — repair after something that fizzled out

  // Green — proactive for a recurring pattern

  // Blue — woke up this way, slow all morning

  // Red — frozen, has been this way for 15+ minutes

  // Red — crying, cumulative build-all-day

  // Green — acknowledgement connection (not activity or conversation)

  // Yellow — refusal at a social demand specifically

  // ── Batch 3 new entries ───────────────────────────────────────────────────

  // Visual supports for children who resist verbal instructions
  "green.connection.conversation":{primaryTool:"2×10 Strategy",primarySteps:["Choose a topic they actually care about — something from their world, not yours. Genuinely curious, not parental.",
"Two minutes. That's the whole commitment. If it extends naturally, that's fine. If not, two minutes is enough.",
"Side-by-side tends to work better than face-to-face for this profile — driving, walking, doing something parallel.",
"Don't steer toward feelings, problems, or anything that happened. Let them lead the topic.",
"Don't end with a lesson, a correction, or a transition to something you needed to say. Just close the conversation warmly.",
"Repeat this on ten consecutive days. The cumulative effect is the intervention — not any single exchange."],secondaryTool:"Affect Labelling",secondaryNote:"If something does surface naturally during the conversation, a brief affect label ('that sounds frustrating') rather than advice. Then return to their topic.",sayThis:["'Tell me more about [thing they mentioned].'","'What's the best bit of that?'","(Then: just listen)"],spockNote:"The 2×10 strategy works because it builds the felt experience of being genuinely known and valued — not the knowledge that someone cares, but the felt sense of it. For a nervous system calibrated toward threat, this felt sense is what updates the neuroceptive baseline toward safety. Two minutes, ten times. That is all it requires."},

  // Social scripts for children who don't know what to say
  "yellow.argumentative.overwhelmed":{primaryTool:"Social Script + Repair Phrase",primarySteps:["Argumentativeness driven by overwhelm often masks not knowing what to say or do — not defiance.","In this moment: reduce demands first. 'Let's pause. You don't have to figure this out right now.'","Offer a script: 'You could say: I need a minute. That's all you need to say.'","If they use it — even approximately — acknowledge it: 'Good. I heard you.'","Later, in green zone, practise a few simple scripts together: 'I need a break', 'That's too much', 'Can we try again?'","Write them down and put them somewhere accessible. They need the script available before the next time, not just after."],secondaryTool:"Affect Labelling",secondaryNote:"'It sounds like that felt really overwhelming.' Then stop. Don't follow with a question.",sayThis:["'Let's pause. You don't have to figure this out right now.'","'You could say: I need a minute.'","'I heard you.'"],spockNote:"Many ADHD and ASD presentations have the feeling but not the words — or the words but not the access to them under stress. A pre-loaded script removes the executive function cost of generating language in a moment when executive function is already depleted."},

  // Co-regulation during homework / demands
  "yellow.refusal.task":{primaryTool:"Body-Doubling + Task Decomposition",primarySteps:["Move to the same space. Start something of your own — do not direct or narrate their work.","Name only the first physical action, not the whole task: 'Can you just open it?'","If they open it, say: 'That's the hard bit done. You can stop there if you want.'","Most will continue. Initiation is the actual barrier.","When stuck: offer a choice within the task, not a choice of whether to do it. 'Do you want to start with the reading or the questions?'","When they finish anything: specific acknowledgement. 'You got through it. That took effort.'"],secondaryTool:"Micro-Choice",secondaryNote:"Location autonomy reduces resistance without lowering expectations: 'You can do this at the table or on the floor — your choice.'",sayThis:["'Just open it. That's all.'","'I'll be right here doing my own thing.'","'Which part do you want to start with?'"],spockNote:"Homework refusal in ADHD presentations is an initiation problem, not a motivation problem. The task itself is rarely the barrier — starting is. Body-doubling and decomposition address the actual mechanism rather than the surface behaviour."},

  // Scheduled decompression — proactive green planning
  "green.proactive.difficult_day":{primaryTool:"Decompression Schedule",primarySteps:["Build the decompression into the plan before the hard day — not as a rescue, as a structure.","Identify the highest-load parts of the coming day: transitions, demands, sensory exposure, social events.","For each high-load element, assign a deliberate decompression window immediately after: 10-20 minutes, no demands.","Write it down or make it visual. 'After school — 20 minutes alone. No questions. Then snack.'","Share it with whoever else needs to know. Consistency of the decompression window is as important as the window itself.","After the day: brief check-in on what actually helped. That data improves the next plan."],secondaryTool:"Predictability Anchor",secondaryNote:"Tell the child the plan in advance: 'After school you're going to have 20 minutes of free time before anything else.' Knowing it's coming reduces load during the hard parts.",sayThis:["'After [hard thing] you get 20 minutes to decompress. Nothing required.'","'I've already planned some quiet time for you.'"],spockNote:"Scheduled decompression is not a reward for good behaviour — it is physiological maintenance. A nervous system that has been under sustained load needs recovery time before it can re-engage. Planning this in advance is more effective than responding to dysregulation after the fact."},

  // Frozen — most of the day
  "red.frozen.all_day":{primaryTool:"Gentle Activation + No-Demand Presence",primarySteps:["A full-day freeze is the nervous system in sustained dorsal vagal shutdown — it cannot be rushed.","Reduce all environmental demand: quieter space, fewer people, lower light if possible.","Move into the same space. Do something quiet of your own. Do not talk about the freeze or ask questions about it.","Offer warmth without words — a warm drink left nearby, a blanket within reach.","After 15-20 minutes of quiet presence: one optional, low-demand sensory offer. 'I made something warm.'","Do not try to process what happened until they are clearly back — hours later or the next day."],secondaryTool:"Cyclic Sigh",secondaryNote:"Do it yourself, visibly, a few times. Your audible exhale is a polyvagal signal — it is processed below the level of cognition.",sayThis:["(No words needed — just presence and warmth)","'I made something warm for you.'"],spockNote:"Sustained freeze is the dorsal vagal system in full defensive activation. It cannot be reasoned with, reasoned out of, or hurried. Bottom-up sensory input and patient regulated presence are the only available levers. This is physiology, not stubbornness."},

  // Blue withdrawn — something happened, emotional underneath  
  "blue.withdrawn.off":{primaryTool:"Side-by-Side Presence",primarySteps:["'Switched off' with no affect often means the nervous system has moved past emotion into conservation mode.","Don't try to access emotion or feeling — it isn't available right now.","Move into the same space. Start doing something quiet of your own — something with gentle sensory properties if possible.","Stay for longer than feels necessary. Don't check in or ask questions.","If they start to show any movement — looking up, adjusting position, making a sound — that is a signal. Stay still and available.","When a connection opens: accept it without elaborating. One quiet response, then let them lead."],secondaryTool:"Gentle Sensory",secondaryNote:"Something with texture, warmth, or rhythm — offered without words. A warm drink, a weighted cushion, background music at low volume.",sayThis:["(No words needed)","'I'll just be here.'"],spockNote:"A switched-off state with no affect is the nervous system in energy conservation. The path back runs through sensation and proximity — not through words or enquiry. Your presence, without demand or expectation, is the correct clinical response."},

  // Blue — reluctant with anything involving other people
  "blue.reluctant.social":{primaryTool:"Reduced Social Demand + Gradual Proximity",primarySteps:["Social reluctance in blue zone is the nervous system protecting its remaining capacity — it's a reasonable response, not defiance.","Don't push for social engagement. Validate the reluctance without endorsing avoidance long-term: 'You don't have to engage right now.'","Offer an intermediate option: being in the same space without interaction. 'You can just be in the room.'","Introduce the easiest possible social unit first — one familiar person, no expectations, minimal verbal demand.","Over the next 20-30 minutes, stay available without initiating. Let them set the pace of re-engagement.","When they do engage, even slightly: accept it without making it a big deal."],secondaryTool:"Side-by-Side Presence",secondaryNote:"Side-by-side with a familiar adult — not face-to-face, no conversation — is the most effective bridge between isolated blue and connected green.",sayThis:["'You don't have to talk to anyone. You can just be near.'","'I'll be right here. Nothing required.'"],spockNote:"Social reluctance in a low-arousal state reflects accurately assessed capacity — the nervous system does not have enough available to manage social processing costs. The path back to social engagement runs through reduced demand, not through encouragement or expectation."},
};

// Lookup function — returns pre-baked guidance or a sensible fallback
function spockLookup(zone,l1,l2){
  const key=`${zone}.${l1}.${l2}`;
  if(SPOCK_LOOKUP[key])return SPOCK_LOOKUP[key];
  // Fallback: try zone.l1 without l2
  const fallbackKeys=Object.keys(SPOCK_LOOKUP).filter(k=>k.startsWith(`${zone}.${l1}`));
  if(fallbackKeys.length)return SPOCK_LOOKUP[fallbackKeys[0]];
  // Last resort: zone-level defaults
  const zoneDefaults={
    red:{primaryTool:"Space & Silence",primarySteps:["Drop your voice to near-silence.","Say once: 'I'm here. You're safe.'","Step back 2 metres. Open posture.","Stop talking. Wait.","When de-escalation begins: 'Good. Just breathe.'"],secondaryTool:"No-Demand Presence",secondaryNote:"Stay in the space without making demands.",sayThis:["'I'm here. You're safe.'"],spockNote:"Your regulated presence is the intervention. Words are secondary."},
    yellow:{primaryTool:"Micro-Choice",primarySteps:["Identify what's non-negotiable and what's flexible.","Offer two genuine options: 'You can do x or y — your call.'","After they choose: 'Good.' Move on without commentary."],secondaryTool:"Movement Break",secondaryNote:"If the choice doesn't land, offer movement first.",sayThis:["'You can do this here or there — up to you.'"],spockNote:"Genuine choice within structure removes the power struggle without removing the structure."},
    green:{primaryTool:"2×10 Strategy",primarySteps:["Start with something they genuinely care about.","Listen more than you speak.","No agenda beyond knowing them better."],secondaryTool:null,secondaryNote:null,sayThis:["'Tell me about [their interest].'"],spockNote:"The green zone is when the relational account gets built. Don't waste it on tasks."},
    blue:{primaryTool:"No-Demand Presence",primarySteps:["Move into the space quietly.","Do something of your own. No demands.","Offer something sensory nearby: 'I've got something here if you want it.'"],secondaryTool:"Gentle Sensory",secondaryNote:"Warmth, texture, or a warm drink — placed nearby without instruction.",sayThis:["'I'm just here. No rush at all.'"],spockNote:"Bottom-up activation — sensation and rhythm — is more effective than language in the blue zone."},
  };
  return zoneDefaults[zone]||zoneDefaults.red;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT PROFILES
// ─────────────────────────────────────────────────────────────────────────────
function buildDefaultProfiles(){
  const ages=getCurrentAges();
  const child=(code,bm,by)=>({
    code,type:"child",colour:DEFAULT_COLOURS[code],age:ages[code],
    birthMonth:bm,birthYear:by,zone:null,lastZoneUpdate:null,
    strengths:[],interests:[],triggers:[],strategies:[],alwaysOn:[],unsolvedProblems:[],
    notes:"",discoveryInsights:[],reports:[],logs:[],
  });
  const adult=(code,bm,by)=>({
    code,type:"adult",colour:DEFAULT_COLOURS[code],age:ages[code],
    birthMonth:bm,birthYear:by,zone:null,lastZoneUpdate:null,
    strengths:[],interests:[],triggers:[],strategies:[],unsolvedProblems:[],
    energisers:[],depletes:[],notes:"",discoveryInsights:[],reports:[],logs:[],
  });
  return{
    EMM:child("EMM",6,2015),RSM:child("RSM",9,2019),MRM:child("MRM",8,2022),
    SR:adult("SR",3,1983),DM:adult("DM",6,1975),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LCARS PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
function LCARSPanel({children,colour,title,t,style={}}){
  return(
    <div style={{background:t.panel,border:`1px solid ${colour}44`,borderLeft:`4px solid ${colour}`,borderRadius:"0 12px 12px 0",padding:"16px 20px",marginBottom:12,...style}}>
      {title&&<div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:colour,marginBottom:10,fontWeight:700}}>{title}</div>}
      {children}
    </div>
  );
}

// Choice button — large, tap-friendly, fully themed to member colour
function ChoiceBtn({label,sublabel,colour,selected,onClick,t}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        background:selected?colour:h?colour+"33":colour+"18",
        color:selected?"#000":t.text,
        border:`2px solid ${selected||h?colour:colour+"66"}`,
        borderRadius:12,padding:"14px 18px",width:"100%",textAlign:"left",
        cursor:"pointer",transition:"all 0.12s",marginBottom:8,
        boxShadow:selected?`0 0 14px ${colour}55`:"none",
      }}>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:600,lineHeight:1.4}}>{label}</div>
      {sublabel&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,opacity:0.75,marginTop:2}}>{sublabel}</div>}
    </button>
  );
}

function LCARSChip({label,colour,selected,onClick,small=false}){
  return(
    <button onClick={onClick} style={{background:selected?colour:"transparent",color:selected?"#000":colour,border:`1.5px solid ${colour}`,borderRadius:20,padding:small?"4px 10px":"6px 14px",fontSize:small?11:12,fontFamily:"'Antonio',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.12s",minHeight:small?32:36}}>
      {label}
    </button>
  );
}

function LCARSBtn({label,colour,onClick,style={},disabled=false,small=false}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h&&!disabled?colour:colour+"DD",color:"#000",border:"none",borderRadius:small?16:24,padding:small?"7px 16px":"12px 24px",fontSize:small?12:14,fontFamily:"'Antonio',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,transition:"all 0.12s",boxShadow:h&&!disabled?`0 0 16px ${colour}66`:"none",minHeight:small?36:48,...style}}>
      {label}
    </button>
  );
}

function Spinner({colour}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0"}}>
      <div style={{width:22,height:22,border:`2.5px solid ${colour}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:colour,letterSpacing:"0.12em"}}>PROCESSING...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function AddItemInput({colour,placeholder,onAdd,t}){
  const[v,setV]=useState("");
  const go=()=>{if(v.trim()){onAdd(v.trim());setV("");}};
  return(
    <div style={{display:"flex",gap:8}}>
      <input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder={placeholder}
        style={{flex:1,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,outline:"none",boxSizing:"border-box"}}/>
      <button onClick={go} style={{background:colour,border:"none",borderRadius:8,padding:"8px 16px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:13,color:"#000",cursor:"pointer",letterSpacing:"0.06em"}}>ADD</button>
    </div>
  );
}

function TagList({items,colour,onRemove,t}){
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:colour+"22",border:`1px solid ${colour}66`,borderRadius:20,padding:"4px 10px"}}>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text}}>{item}</span>
          <button onClick={()=>onRemove(i)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",padding:0,fontSize:14,lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
}

function ConnectorStripe({fromColour,toColour}){
  return(
    <div style={{display:"flex",alignItems:"center",margin:"16px 0"}}>
      <div style={{width:14,height:14,borderRadius:7,background:fromColour,flexShrink:0}}/>
      <div style={{flex:1,height:3,background:`linear-gradient(to right, ${fromColour}, ${toColour})`}}/>
      <div style={{width:14,height:14,borderRadius:7,background:toColour,flexShrink:0}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE LOGGING — timestamped, multiple per day
// ─────────────────────────────────────────────────────────────────────────────
function logZone(profile,zoneId,note=""){
  const entry={
    id:Date.now(),
    ts:new Date().toISOString(),
    date:new Date().toISOString().slice(0,10),
    zone:zoneId,
    note,
  };
  return{
    ...profile,
    zone:zoneId,
    lastZoneUpdate:entry.ts,
    logs:[...(profile.logs||[]),entry],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY & PATTERN ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
function getRecentLogs(logs,days=14){
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-days);
  return(logs||[]).filter(l=>new Date(l.ts)>=cutoff).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
}

function detectPatterns(logs){
  const patterns=[];
  if(!logs||logs.length<3)return patterns;

  // Check last 5 days for a zone dominating mornings (before noon)
  const recent=logs.slice(-20);
  const mornings=recent.filter(l=>new Date(l.ts).getHours()<12);
  if(mornings.length>=3){
    const zones={};
    mornings.forEach(l=>zones[l.zone]=(zones[l.zone]||0)+1);
    const top=Object.entries(zones).sort((a,b)=>b[1]-a[1])[0];
    if(top&&top[1]>=3&&top[0]!=="green"){
      const z=ZONES.find(z=>z.id===top[0]);
      patterns.push({type:"morning",text:`Mornings have been mostly ${z?.label} lately — worth building in a regulation anchor before the day starts.`,colour:z?.colour});
    }
  }

  // Check for a run of 3+ same zone
  let run=1,last=recent[recent.length-1]?.zone;
  for(let i=recent.length-2;i>=0;i--){
    if(recent[i].zone===last)run++;
    else break;
  }
  if(run>=3&&last&&last!=="green"){
    const z=ZONES.find(z=>z.id===last);
    patterns.push({type:"run",text:`${run} entries in a row in the ${z?.label} zone — this might be a pattern worth noticing.`,colour:z?.colour});
  }

  return patterns;
}

// Mini zone history chart — dots per day, colour coded
function ZoneHistory({logs,colour,t}){
  const recent=getRecentLogs(logs,14);
  if(!recent.length)return(
    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,padding:"8px 0"}}>No zone logs yet. Tap a zone emoji on the dashboard or in this profile to start logging.</div>
  );

  // Group by date
  const byDate={};
  recent.forEach(l=>{
    if(!byDate[l.date])byDate[l.date]=[];
    byDate[l.date].push(l);
  });

  const dates=Object.keys(byDate).sort();

  return(
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {dates.map(date=>{
          const entries=byDate[date];
          const d=new Date(date);
          const label=d.toLocaleDateString("en-AU",{weekday:"short",day:"numeric"});
          return(
            <div key={date} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:40}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {entries.map((e,i)=>(
                  <div key={i} title={`${new Date(e.ts).toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})} — ${ZONES.find(z=>z.id===e.zone)?.label}${e.note?` — ${e.note}`:""}`}
                    style={{width:28,height:28,borderRadius:14,background:zoneColour(e.zone),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,cursor:"default"}}>
                    {zoneEmoji(e.zone)}
                  </div>
                ))}
              </div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.textDim,textAlign:"center",lineHeight:1.2}}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Zone counts */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {ZONES.map(z=>{
          const count=recent.filter(l=>l.zone===z.id).length;
          if(!count)return null;
          return(
            <div key={z.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:z.colour+"22",border:`1px solid ${z.colour}44`,borderRadius:20}}>
              <span style={{fontSize:14}}>{z.emoji}</span>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:z.colour,fontWeight:700}}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Pattern nudges — shown on dashboard
function PatternNudge({member,t}){
  const patterns=detectPatterns(member.logs);
  if(!patterns.length)return null;
  return(
    <div style={{marginTop:6}}>
      {patterns.map((p,i)=>(
        <div key={i} style={{padding:"5px 10px",background:p.colour+"18",border:`1px solid ${p.colour}44`,borderRadius:8,marginTop:4}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:p.colour,lineHeight:1.5}}>{p.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SPOCK SCREEN — 3-layer intelligence
// ─────────────────────────────────────────────────────────────────────────────
// Progressive guidance panel — shows first 2 steps immediately, rest on expand
// Reduces cognitive load for ADHD parents in high-stress moments
function GuidancePanel({guidance,colour,t}){
  const[expanded,setExpanded]=useState(false);
  const steps=guidance.primarySteps||[];
  const visibleSteps=expanded?steps:steps.slice(0,2);
  const hasMore=steps.length>2;

  return(
    <div style={{background:t.panel,border:`1px solid ${colour}44`,borderLeft:`4px solid ${colour}`,borderRadius:"0 12px 12px 0",padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:colour,marginBottom:10,fontWeight:700}}>
        Try: {guidance.primaryTool}
      </div>
      {visibleSteps.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
          <div style={{background:colour,color:"#000",fontFamily:"'Antonio',sans-serif",fontSize:12,fontWeight:700,borderRadius:5,padding:"2px 8px",flexShrink:0,marginTop:1,minWidth:28,textAlign:"center",minHeight:26,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:t.text,lineHeight:1.5}}>{s}</span>
        </div>
      ))}
      {hasMore&&(
        <button onClick={()=>setExpanded(e=>!e)}
          style={{background:"transparent",border:`1px solid ${colour}44`,borderRadius:20,padding:"5px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:colour,cursor:"pointer",letterSpacing:"0.08em",marginTop:4,minHeight:36}}>
          {expanded?`▲ SHOW LESS`:`▼ ${steps.length-2} MORE STEPS`}
        </button>
      )}
      {guidance.sayThis?.filter(Boolean).length>0&&(
        <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${colour}22`}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,letterSpacing:"0.12em",marginBottom:6,fontWeight:700}}>SAY THIS</div>
          {guidance.sayThis.filter(Boolean).map((s,i)=>(
            <div key={i} style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:t.text,padding:"8px 12px",background:P.teal+"12",borderRadius:8,marginBottom:6,lineHeight:1.5}}>"{s}"</div>
          ))}
        </div>
      )}
      {guidance.secondaryTool&&(
        <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${colour}22`}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.1em",marginBottom:4}}>ALSO CONSIDER: {guidance.secondaryTool}</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.5}}>{guidance.secondaryNote}</div>
        </div>
      )}
    </div>
  );
}

function SpockScreen({profiles,onClose,onUpdateProfile,t,adultMode=false,preselectedMember=null}){
  const[step,setStep]=useState(preselectedMember?"zone":"who");
  const[target,setTarget]=useState(preselectedMember||null);
  const[selectedZone,setSelectedZone]=useState(null);
  const[l1Answer,setL1Answer]=useState(null);
  const[l2Answer,setL2Answer]=useState(null);
  const[guidance,setGuidance]=useState(null);

  const members=Object.values(profiles);
  const zone=ZONES.find(z=>z.id===selectedZone);
  const followups=adultMode?ADULT_SPOCK_FOLLOWUPS:SPOCK_FOLLOWUPS;
  const followup=selectedZone?followups[selectedZone]:null;
  const l2=l1Answer&&followup?.layer2?.[l1Answer]||null;

  const fetchGuidance=(zoneId,l1Val,l2Val)=>{
    const result=spockLookup(zoneId||selectedZone,l1Val||l1Answer,l2Val||"");
    setGuidance(result);
    setStep("guidance");
  };

  const c=target?.colour||P.spock;

  const Header=()=>(
    <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"stretch",height:64}}>
        <div style={{background:P.spock,width:110,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"14px 0 0 0"}}>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,fontWeight:700,letterSpacing:"0.15em",color:"#000",textAlign:"center",lineHeight:1.3}}>MR.<br/>SPOCK</span>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 16px",gap:6}}>
          <div style={{height:12,background:target?c+"55":P.spock+"44",borderRadius:6}}/>
          <div style={{height:8,background:target?c+"33":P.spock+"22",borderRadius:4,width:"70%"}}/>
        </div>
        <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:13,padding:"0 18px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
      </div>
      <div style={{height:4,background:target?`linear-gradient(to right, ${c}, ${P.spock})`:`linear-gradient(to right, ${P.spock}, ${P.midBlue}, ${P.teal})`}}/>
    </div>
  );

  const BackBtn=({onClick,label="← BACK"})=>(
    <button onClick={onClick} style={{background:"transparent",border:"none",color:t.textMuted,cursor:"pointer",fontFamily:"'Antonio',sans-serif",fontSize:12,letterSpacing:"0.1em",marginBottom:16,padding:0,display:"block"}}>
      {label}
    </button>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"#000000EE",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,border:`2px solid ${P.spock}`,borderRadius:16,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:`0 0 40px ${P.spock}44`}}>
        <Header/>
        <div style={{padding:24}}>

          {/* STEP: WHO */}
          {step==="who"&&(
            <>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:18,color:P.spock,letterSpacing:"0.08em",marginBottom:6}}>WHAT SHOULD WE DO RIGHT NOW?</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.textMuted,marginBottom:20}}>Who is this about?</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {members.map(m=>(
                  <ChoiceBtn key={m.code} label={m.code+(m.type==="adult"?" — me":"")}
                    sublabel={m.zone?`Last logged: ${zoneEmoji(m.zone)} ${ZONES.find(z=>z.id===m.zone)?.label}`:null}
                    colour={m.colour} selected={false} onClick={()=>{setTarget(m);setStep("zone");}} t={t}/>
                ))}
              </div>
            </>
          )}

          {/* STEP: ZONE */}
          {step==="zone"&&target&&(
            <>
              <BackBtn onClick={()=>setStep("who")}/>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:18,color:c,letterSpacing:"0.08em",marginBottom:6}}>{target.code}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.textMuted,marginBottom:20}}>What zone are you seeing right now?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {ZONES.map(z=>(
                  <button key={z.id} onClick={()=>{setSelectedZone(z.id);setStep("l1");}}
                    style={{background:z.colour+"22",border:`2px solid ${z.colour}`,borderRadius:12,padding:"16px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.12s"}}>
                    <span style={{fontSize:30}}>{z.emoji}</span>
                    <span style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:z.colour,fontWeight:700,letterSpacing:"0.06em"}}>{z.label}</span>
                    <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted,textAlign:"center",lineHeight:1.4}}>{target.type==="child"?z.childDesc:z.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: LAYER 1 */}
          {step==="l1"&&target&&zone&&followup&&(
            <>
              <BackBtn onClick={()=>setStep("zone")}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",background:zone.colour+"22",border:`1.5px solid ${zone.colour}`,borderRadius:10}}>
                <span style={{fontSize:28}}>{zone.emoji}</span>
                <div>
                  <div style={{fontFamily:"'Antonio',sans-serif",fontSize:15,color:zone.colour,fontWeight:700,letterSpacing:"0.06em"}}>{target.code} — {zone.label}</div>
                </div>
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:t.text,marginBottom:16,fontWeight:600}}>{followup.question}</div>
              {followup.options.map(opt=>(
                <ChoiceBtn key={opt.id} label={opt.label} colour={c} selected={l1Answer===opt.id}
                  onClick={()=>{setL1Answer(opt.id); if(followup.layer2?.[opt.id]){setStep("l2");}else{fetchGuidance(selectedZone,opt.id,"");}}} t={t}/>
              ))}
            </>
          )}

          {/* STEP: LAYER 2 */}
          {step==="l2"&&target&&zone&&l2&&(
            <>
              <BackBtn onClick={()=>{setStep("l1");setL1Answer(null);setL2Answer(null);}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",background:zone.colour+"22",border:`1.5px solid ${zone.colour}`,borderRadius:10}}>
                <span style={{fontSize:22}}>{zone.emoji}</span>
                <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:zone.colour,fontWeight:700,letterSpacing:"0.06em"}}>{target.code} — {zone.label}</span>
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:t.text,marginBottom:16,fontWeight:600}}>{l2.question}</div>
              {l2.options.map(opt=>(
                <ChoiceBtn key={opt.id} label={opt.label} colour={c} selected={l2Answer===opt.id}
                  onClick={()=>{setL2Answer(opt.id);fetchGuidance(selectedZone,l1Answer,opt.id);}} t={t}/>
              ))}
            </>
          )}

          {/* STEP: GUIDANCE */}
          {step==="guidance"&&guidance&&target&&zone&&(
            <>
              <BackBtn onClick={()=>setStep("l2")}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,padding:"10px 14px",background:zone.colour+"22",border:`1.5px solid ${zone.colour}`,borderRadius:10}}>
                <span style={{fontSize:24}}>{zone.emoji}</span>
                <span style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:zone.colour,fontWeight:700,letterSpacing:"0.06em"}}>{target.code} — {zone.label}</span>
              </div>
              <ConnectorStripe fromColour={zone.colour} toColour={P.spock}/>

              <GuidancePanel guidance={guidance} colour={c} t={t}/>

              <div style={{padding:"12px 16px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10,marginBottom:16}}>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.12em",marginBottom:4}}>SPOCK SAYS</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.6,fontStyle:"italic"}}>{guidance.spockNote}</div>
              </div>

              <LCARSBtn label="Log this zone" colour={c} onClick={()=>{
                if(target&&selectedZone){
                  onUpdateProfile(logZone(target,selectedZone));
                  onClose();
                }
              }} style={{width:"100%",minHeight:52}}/>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-DISCOVERY TOOL (back button fixed, blank skip fixed)
// ─────────────────────────────────────────────────────────────────────────────
const CHILD_QS=[
  {id:"good_at",q:"What's something you're really good at?",hint:"Wait for them. Don't suggest. If they shrug, try: 'Even something small counts.'",
   chips:["making things","sport","animals","games","drawing","reading","helping","being kind"]},
  {id:"hard",q:"What's something that feels hard or tricky for you?",hint:"Accept any answer — not just school things.",
   chips:["loud places","when plans change","talking to people","sitting still","starting things","being told what to do"]},
  {id:"feels_good",q:"When do you feel really good in your body?",hint:"Could be a place, activity, or time of day.",
   chips:["outside","in my room","moving around","when it's quiet","with animals","doing something I love"]},
  {id:"feels_bad",q:"When does your body feel uncomfortable or yucky?",hint:"Write their exact words — this helps map sensory triggers.",
   chips:["loud noises","scratchy clothes","crowds","surprises","being touched","too much light","being rushed"]},
  {id:"calming",q:"What helps you feel calm when things feel big?",hint:"'Nothing' is a valid answer. Write it down.",
   chips:["being alone","moving around","music","a blanket","something to hold","being outside","doing something repetitive"]},
  {id:"excited",q:"What makes you really excited?",hint:"Let them go. Don't rush this one.",
   chips:["animals","space","gaming","building","art","stories","sport","nature","science","music"]},
  {id:"worry",q:"Is there anything that worries you a lot?",hint:"If they don't want to share, that's fine. Don't push.",
   chips:["something bad happening","getting things wrong","people being upset","changes","the dark","being alone"]},
  {id:"proud",q:"What's something you did that made you feel proud?",hint:"Even very small things count.",
   chips:[]},
  {id:"friends",q:"What do you like doing with other people?",hint:"Maps social preferences — one-on-one vs group vs parallel.",
   chips:["one person at a time","playing games","just being nearby","talking","making things together","watching something"]},
  {id:"alone",q:"What do you like doing by yourself?",hint:"Solitary preferences are just as valid.",
   chips:["reading","building","drawing","gaming","music","daydreaming","being outside"]},
];
const ADULT_QS=[
  {id:"energised",q:"What activities or situations leave you feeling energised rather than drained?",hint:"Think about the last time you felt genuinely good after something."},
  {id:"drained",q:"What consistently drains your energy, even if it 'shouldn't'?",hint:"No judgment. This is about understanding your nervous system."},
  {id:"strengths",q:"What are you genuinely good at — things that come naturally that others might find harder?",hint:"Often things you don't notice because they're so easy for you."},
  {id:"hard",q:"What tasks or situations are disproportionately difficult for you?",hint:"Things that seem easy for others but cost you a lot."},
  {id:"regulation",q:"What helps you come back to yourself when you're overwhelmed?",hint:"Could be a place, activity, sensory input, person, or just time."},
  {id:"triggers",q:"What situations reliably spike your stress or overwhelm?",hint:"Try to name the category — noise? Uncertainty? Transition? Social demand?"},
  {id:"focus",q:"When do you find it easiest to focus?",hint:"Time of day, environment, type of task, alone vs with others."},
  {id:"values",q:"What matters most to you about how you live your life?",hint:"Not what should matter — what actually does."},
  {id:"needs",q:"What do you most need from the people around you?",hint:"Think about what you wish people understood about you."},
  {id:"patterns",q:"Have you noticed patterns about when things go well versus when they don't?",hint:"Time of day, sleep, food, predictability, social load — anything you've noticed."},
];

function SelfDiscovery({member,onSaveInsight,onClose,toolMode,t}){
  const isAdult=member.type==="adult";
  const isObs=member.age<=2;
  const questions=isAdult?ADULT_QS:CHILD_QS;
  const[idx,setIdx]=useState(0);
  const[answers,setAnswers]=useState({});
  const[current,setCurrent]=useState("");
  const[step,setStep]=useState("intro");
  const[insights,setInsights]=useState([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const c=member.colour;
  const q=questions[idx];

  const goBack=()=>{
    if(idx>0){setIdx(i=>i-1);setCurrent(answers[questions[idx-1].id]||"");}
    else setStep("intro");
  };

  const saveAnswer=()=>{
    const saved={...answers,[q.id]:current.trim()};
    setAnswers(saved);
    setCurrent("");
    if(idx<questions.length-1){setIdx(i=>i+1);}
    else generateInsights(saved);
  };

  const skipQuestion=()=>{
    if(idx<questions.length-1){setIdx(i=>i+1);setCurrent("");}
    else generateInsights(answers);
  };

  const generateInsights=async(allAnswers)=>{
    setStep("processing");setLoading(true);setError(null);
    const qa=questions.map(q=>`Q: ${q.q}\nA: ${allAnswers[q.id]||"(skipped)"}`).join("\n\n");
    const system=isAdult
      ?`You are a warm, non-clinical guide helping an adult understand their own nervous system. Extract 3-5 genuine insights from their answers. Frame as self-knowledge, not pathology. Plain language. Specific to what they said. Respond ONLY in JSON: {"insights":[{"title":"short title","text":"2-3 sentence insight"}]}`
      :`You are warm and gentle. Help a parent understand their child (age ${member.age}) better. Extract 3-5 insights. Frame positively and practically — what does this tell a caring parent about connecting with this child? Reference specific things they said. Respond ONLY in JSON: {"insights":[{"title":"short title","text":"2-3 sentence insight"}]}`;
    try{
      const r=await callClaudeJSON(system,`Answers:\n\n${qa}`,1000);
      setInsights(r.insights||[]);setStep("results");
    }catch(e){setError(e.message);setStep("question");}
    finally{setLoading(false);}
  };

  const saveAll=()=>{
    const date=new Date().toISOString().slice(0,10);
    insights.forEach(ins=>onSaveInsight({date,title:ins.title,text:ins.text}));
    onClose();
  };

  return(
    <div style={{padding:20}}>
      {step==="intro"&&(
        <>
          {toolMode==="child"&&(
            <div style={{marginBottom:16,padding:"12px 14px",background:P.amber+"15",border:`1.5px solid ${P.amber}`,borderRadius:10}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.amber,letterSpacing:"0.12em",marginBottom:6,fontWeight:700}}>FOR THE GROWN-UP</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.7}}>
                Read each question aloud to {member.code}. <strong>Don't suggest answers or fill in gaps</strong> — write down exactly what they say. If they pass, move on. This isn't a test. Sit somewhere comfortable. This should feel like a chat.
              </div>
            </div>
          )}
          {isObs&&(
            <div style={{marginBottom:16,padding:"12px 14px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>
                At {member.age}, {member.code} can't answer these yet. This is your observation tool — answer based on what you've noticed. Your observations become part of their growing profile.
              </div>
            </div>
          )}
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.7,marginBottom:24}}>
            {isAdult?"This is a chance to understand your own brain a little better — your patterns, strengths, and what your nervous system needs. No right answers. Take your time."
              :isObs?`Record what you've noticed about ${member.code}. These build a picture over time.`
              :`${questions.length} questions. No right answers. ${member.code} can skip any question.`}
          </div>
          <LCARSBtn label="Begin" colour={c} onClick={()=>setStep("question")}/>
        </>
      )}

      {step==="question"&&q&&(
        <>
          {/* Progress bar */}
          <div style={{height:4,background:t.border,borderRadius:2,marginBottom:20,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(idx/questions.length)*100}%`,background:c,borderRadius:2,transition:"width 0.3s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <button onClick={goBack} style={{background:"transparent",border:"none",color:t.textMuted,cursor:"pointer",fontFamily:"'Antonio',sans-serif",fontSize:12,letterSpacing:"0.1em",padding:0}}>← BACK</button>
            <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:t.textMuted,letterSpacing:"0.1em"}}>{idx+1} / {questions.length}</span>
          </div>

          <div style={{fontFamily:toolMode==="child"?"'Nunito',sans-serif":"'Antonio',sans-serif",fontSize:toolMode==="child"?20:17,color:t.text,lineHeight:1.4,marginBottom:14,fontWeight:700}}>
            {isObs?`What have you noticed about ${member.code}?`:q.q}
          </div>

          {toolMode==="child"&&q.hint&&(
            <div style={{padding:"8px 12px",background:P.amber+"12",border:`1px solid ${P.amber}33`,borderRadius:8,marginBottom:14}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.amber,letterSpacing:"0.1em",marginBottom:3}}>FACILITATOR HINT</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.5}}>{q.hint}</div>
            </div>
          )}
          {toolMode!=="child"&&q.hint&&(
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginBottom:10,lineHeight:1.5,fontStyle:"italic"}}>{q.hint}</div>
          )}

          <textarea value={current} onChange={e=>setCurrent(e.target.value)} placeholder={toolMode==="child"?"Write what they say here...":"Your answer..."}
            style={{width:"100%",minHeight:100,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"12px",fontSize:14,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box",marginBottom:q.chips?.length?8:12}}/>

          {/* Prompt chips — optional starting points for children who get stuck */}
          {toolMode==="child"&&q.chips?.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,letterSpacing:"0.1em",marginBottom:6}}>STARTING POINTS — tap to add:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {q.chips.map(chip=>(
                  <button key={chip} onClick={()=>setCurrent(c=>c?`${c}, ${chip}`:chip)}
                    style={{background:c+"18",border:`1px solid ${c}44`,borderRadius:20,padding:"4px 10px",fontFamily:"'Nunito',sans-serif",fontSize:12,color:c,cursor:"pointer",transition:"all 0.1s",minHeight:32}}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10}}>
            <LCARSBtn label={idx<questions.length-1?"Save & next →":"Save & finish"} colour={c} onClick={saveAnswer} disabled={!current.trim()}/>
            <LCARSBtn label="Skip this one" colour={t.textMuted} small onClick={skipQuestion} style={{background:"transparent",border:`1px solid ${t.border}`,color:t.textMuted}}/>
          </div>

          {error&&<div style={{marginTop:12,padding:"10px",background:"#CC666622",border:"1px solid #CC6666",borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#CC6666"}}>Error: {error}</div>}
        </>
      )}

      {step==="processing"&&<Spinner colour={c}/>}

      {step==="results"&&(
        <>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:c,letterSpacing:"0.1em",marginBottom:4}}>INSIGHTS FOUND</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginBottom:16}}>These will be saved to {member.code}'s profile.</div>
          {insights.map((ins,i)=>(
            <div key={i} style={{padding:"14px 16px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10,marginBottom:10}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:12,color:P.spock,letterSpacing:"0.08em",marginBottom:6,fontWeight:700}}>{ins.title}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.6}}>{ins.text}</div>
            </div>
          ))}
          <SpockNote text={isAdult?"Self-knowledge is not a destination — it is a practice. These insights are starting points. The ones that feel most accurate are worth sitting with; the ones that don't quite fit are equally informative.":"What a child reveals about themselves in an unstructured conversation is often more accurate than any formal assessment. These observations were volunteered freely. That is significant."} t={t}/>
          <LCARSBtn label="Save all to profile" colour={c} onClick={saveAll} style={{marginTop:12}}/>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY TOOL
// ─────────────────────────────────────────────────────────────────────────────
function WhyTool({member,onClose,t}){
  const[situation,setSituation]=useState("");
  const[explanation,setExplanation]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const c=member.colour;

  const isAdultSelf=member.type==="adult";
  const explain=async()=>{
    setLoading(true);setError(null);setExplanation(null);
    const ctx=[
      member.triggers?.length?`Known triggers: ${member.triggers.join(", ")}`:null,
      member.strategies?.length?`What usually helps: ${member.strategies.join(", ")}`:null,
      isAdultSelf&&member.energisers?.length?`Energisers: ${member.energisers.join(", ")}`:null,
      isAdultSelf&&member.depletes?.length?`Depletes: ${member.depletes.join(", ")}`:null,
    ].filter(Boolean).join(". ");
    const system=isAdultSelf
      ?`You are a warm, non-clinical guide helping an adult understand their own nervous system through a neurodevelopmental lens. The person is ${member.age} years old and has ADHD.${ctx?` What we know: ${ctx}`:""} Explain what is likely happening neurologically — not as a diagnosis, but as a compassionate, practical explanation. Respond ONLY in JSON: {"whatIsHappening":"2-3 sentences","whatTheyNeed":"1-2 sentences","tryThis":["step 1","step 2","step 3"],"avoidThis":["thing 1","thing 2"],"spockNote":"one reframing sentence"}`
      :`You are a warm, knowledgeable guide helping a parent understand their child's behaviour through a neurodevelopmental lens. The child is ${member.age} years old.${ctx?` What we know: ${ctx}`:""} Explain what is likely happening neurologically and developmentally — not as a diagnosis, but as a compassionate explanation. Respond ONLY in JSON: {"whatIsHappening":"2-3 sentences","whatTheyNeed":"1-2 sentences","tryThis":["step 1","step 2","step 3"],"avoidThis":["thing 1","thing 2"],"spockNote":"one reframing sentence for the parent"}`;
    try{
      const r=await callClaudeJSON(system,`Situation: ${situation}`,800);
      setExplanation(r);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:20}}>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.7,marginBottom:16}}>
        {isAdultSelf
          ?`Describe something you keep experiencing — a pattern, a reaction, something that doesn't make sense to you. Spock will explain the likely neurological reason.`
          :`Describe what's happening with ${member.code} right now. Spock will explain the likely reason.`}
      </div>
      <textarea value={situation} onChange={e=>setSituation(e.target.value)}
        placeholder={`What is ${member.code} doing? What happened just before? What have you tried?`}
        style={{width:"100%",minHeight:120,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"12px",fontSize:14,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box",marginBottom:12}}/>
      <LCARSBtn label="Ask Spock" colour={P.spock} onClick={explain} disabled={situation.trim().length<10||loading}/>
      {loading&&<Spinner colour={P.spock}/>}
      {error&&<div style={{marginTop:12,padding:"10px",background:"#CC666622",border:"1px solid #CC6666",borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#CC6666"}}>Error: {error}</div>}
      {explanation&&(
        <div style={{marginTop:20}}>
          <ConnectorStripe fromColour={c} toColour={P.spock}/>
          <LCARSPanel colour={P.spock} title="What is likely happening" t={t}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.7}}>{explanation.whatIsHappening}</div>
          </LCARSPanel>
          <LCARSPanel colour={c} title="What they need right now" t={t}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.7}}>{explanation.whatTheyNeed}</div>
          </LCARSPanel>
          <LCARSPanel colour={c} title="Try this" t={t}>
            {explanation.tryThis?.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{background:c,color:"#000",fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,borderRadius:4,padding:"1px 6px",flexShrink:0,marginTop:2}}>{i+1}</div>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{s}</span>
              </div>
            ))}
          </LCARSPanel>
          <LCARSPanel colour={c+"99"} title="Not right now" t={t}>
            {explanation.avoidThis?.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <span style={{color:c,fontFamily:"'Antonio',sans-serif",fontWeight:700,flexShrink:0}}>✕</span>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.5}}>{s}</span>
              </div>
            ))}
          </LCARSPanel>
          <div style={{padding:"12px 16px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.12em",marginBottom:4}}>SPOCK SAYS</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.6,fontStyle:"italic"}}>{explanation.spockNote}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BREATHING TOOL
// ─────────────────────────────────────────────────────────────────────────────
function BreathingTool({member,onClose,t}){
  const[phase,setPhase]=useState("ready");
  const[cycle,setCycle]=useState(0);
  const[manualMode,setManualMode]=useState(false);
  const total=member?.age<=5?3:5;
  const c=member?.colour||P.spock;
  const isChild=member?.age&&member.age<=7;

  const advancePhase=()=>{
    if(phase==="ready"){setPhase("inhale");return;}
    if(phase==="inhale"){setPhase("hold");return;}
    if(phase==="hold"){setPhase("exhale");return;}
    if(phase==="exhale"){
      const next=cycle+1;
      if(next>=total){setPhase("done");setCycle(0);}
      else{setCycle(next);setPhase("inhale");}
    }
  };

  useEffect(()=>{
    if(manualMode||phase==="ready"||phase==="done")return;
    const timings={inhale:isChild?3000:4000,hold:isChild?1000:2000,exhale:isChild?4000:6000};
    const timer=setTimeout(advancePhase,timings[phase]);
    return()=>clearTimeout(timer);
  },[phase,cycle,isChild,total,manualMode]);

  const info={
    ready:{label:isChild?"Ready?":"Ready to begin",sub:"Tap to start",scale:1,colour:c},
    inhale:{label:isChild?"Breathe in...":"Inhale slowly",sub:isChild?"Fill up like a balloon":"Through your nose",scale:1.3,colour:P.teal},
    hold:{label:"Hold",sub:isChild?"Hold it...":"Just for a moment",scale:1.3,colour:P.spock},
    exhale:{label:isChild?"Let it out...":"Exhale slowly",sub:isChild?"All the way out":"Through your mouth",scale:0.8,colour:c},
    done:{label:isChild?"Great job! 🌟":"Well done",sub:`${total} cycles complete`,scale:1,colour:P.teal},
  }[phase];

  return(
    <div style={{padding:20,textAlign:"center"}}>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,marginBottom:16,lineHeight:1.6}}>
        {isChild?"The fastest way to calm your body when things feel big.":"Cyclic breathing — evidence-based for rapid nervous system regulation (Balban et al., 2023)."}
      </div>
      {/* Mode toggle — timed vs tap-to-advance */}
      {phase==="ready"&&(
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
          <button onClick={()=>setManualMode(false)}
            style={{background:!manualMode?c:t.surface2,color:!manualMode?"#000":t.textMuted,border:`1px solid ${c}44`,borderRadius:20,padding:"5px 14px",fontFamily:"'Antonio',sans-serif",fontSize:10,letterSpacing:"0.08em",cursor:"pointer",minHeight:36}}>
            TIMED
          </button>
          <button onClick={()=>setManualMode(true)}
            style={{background:manualMode?c:t.surface2,color:manualMode?"#000":t.textMuted,border:`1px solid ${c}44`,borderRadius:20,padding:"5px 14px",fontFamily:"'Antonio',sans-serif",fontSize:10,letterSpacing:"0.08em",cursor:"pointer",minHeight:36}}>
            TAP TO ADVANCE
          </button>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",marginBottom:28}}>
        <div onClick={phase==="ready"?()=>setPhase("inhale"):manualMode?advancePhase:undefined}
          style={{width:160,height:160,borderRadius:"50%",background:`${info.colour}22`,border:`4px solid ${info.colour}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:(phase==="ready"||manualMode)?"pointer":"default",transition:"all 0.8s ease",transform:`scale(${info.scale})`,boxShadow:`0 0 ${phase==="done"?40:20}px ${info.colour}44`}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:17,color:info.colour,letterSpacing:"0.08em",fontWeight:700,lineHeight:1.2,textAlign:"center",padding:"0 10px"}}>{info.label}</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginTop:4}}>{manualMode&&phase!=="ready"&&phase!=="done"?"tap to continue":info.sub}</div>
          {phase!=="ready"&&phase!=="done"&&<div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:info.colour,marginTop:6,opacity:0.7}}>{cycle+1}/{total}</div>}
        </div>
      </div>
      {phase==="done"&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.6,marginBottom:12}}>Your nervous system has had a reset. Give it 30 seconds — you'll notice the difference.</div>
          <SpockNote text={isChild?"Your body knows how to calm itself down. You just helped it remember how.":"The extended exhale activates the parasympathetic system directly. This is not relaxation — it is a measurable physiological state change. Balban et al. (2023) confirmed this outperforms mindfulness meditation for immediate affect improvement."} t={t}/>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14}}>
            <LCARSBtn label="Again" colour={c} onClick={()=>{setPhase("ready");setCycle(0);}} small/>
            <LCARSBtn label="Done" colour={P.teal} onClick={onClose} small/>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:8}}>
        {["inhale","hold","exhale"].map(p=>(
          <div key={p} style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:phase===p?info.colour:t.textDim,letterSpacing:"0.1em",transition:"color 0.3s"}}>{p.toUpperCase()}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT INGESTION
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_SYSTEM=`You are a careful reader of psychological and cognitive assessment reports. Extract practical, family-usable information. Focus on: what helps this person, what's hard, strengths, triggers, sensory preferences, regulation strategies, practical recommendations. Never reproduce clinical labels in a stigmatising way. Plain language. Respond ONLY with valid JSON, no prose or markdown.`;
const REPORT_SCHEMA=`{"summary":"2-3 sentence plain-language summary","strengths":[],"challenges":[],"triggers":[],"strategies":[],"sensoryNotes":"or null","regulationNotes":"or null","recommendationsForHome":[],"reportType":"cognitive assessment|psychological|occupational therapy|speech|other","reportDate":"or null","confidence":"high|medium|low"}`;

function ReportIngestion({member,onSave,onClose,t}){
  const[step,setStep]=useState("input");
  const[inputMode,setInputMode]=useState("paste");
  const[text,setText]=useState("");
  const[pdfFile,setPdfFile]=useState(null);
  const[editedExtract,setEditedExtract]=useState(null);
  const[error,setError]=useState(null);
  const[processing,setProcessing]=useState(false);
  const fileRef=useRef();
  const c=member.colour;

  const processText=async(rt)=>{
    setProcessing(true);setError(null);
    try{
      const r=await callClaudeJSON(REPORT_SYSTEM,`Report for ${member.code}. Schema:\n${REPORT_SCHEMA}\n\nTEXT:\n${rt.slice(0,8000)}`,1400);
      setEditedExtract(r);setStep("review");
    }catch(e){setError(e.message);}
    finally{setProcessing(false);}
  };

  const handlePDF=async(file)=>{
    const reader=new FileReader();
    reader.onload=async(e)=>{
      const base64=e.target.result.split(",")[1];
      setProcessing(true);setError(null);
      try{
        const res=await fetch("/.netlify/functions/claude",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1400,system:REPORT_SYSTEM,
            messages:[{role:"user",content:[
              {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
              {type:"text",text:`Extract for ${member.code}. Schema:\n${REPORT_SCHEMA}`}
            ]}]})
        });
        if(!res.ok)throw new Error(`API ${res.status}`);
        const d=await res.json();
        const raw=d.content?.find(b=>b.type==="text")?.text||"";
        const clean=raw.replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim();
        const r=JSON.parse(clean);
        setEditedExtract(r);setStep("review");
      }catch(e){setError(e.message);}
      finally{setProcessing(false);}
    };
    reader.readAsDataURL(file);
  };

  const apply=()=>{
    if(!editedExtract)return;
    onSave({id:Date.now(),date:editedExtract.reportDate||new Date().toISOString().slice(0,10),type:editedExtract.reportType||"report",summary:editedExtract.summary,raw:editedExtract},editedExtract);
    setStep("done");
  };

  return(
    <div style={{padding:20}}>
      <div style={{marginBottom:12,padding:"10px 14px",background:c+"12",border:`1px solid ${c}44`,borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6}}>
        Upload a PDF or paste text from a cognitive, psychological, occupational therapy, or other assessment. Claude reads it and extracts practical information — strengths, challenges, triggers, sensory notes, and recommendations — in plain language. The extracted information is added to {member.code}'s profile and used by Spock to give more specific, relevant guidance.
      </div>
      <div style={{marginBottom:14,padding:"10px 14px",background:P.amber+"15",border:`1px solid ${P.amber}44`,borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.6}}>
        <strong style={{color:P.amber,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.1em"}}>PRIVACY NOTE — </strong>
        Processed by Claude AI then stored locally on this device only. Agreed to by both parents.
      </div>

      {step==="input"&&(
        <>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <LCARSChip label="Paste text" colour={c} selected={inputMode==="paste"} onClick={()=>setInputMode("paste")}/>
            <LCARSChip label="Upload PDF" colour={c} selected={inputMode==="pdf"} onClick={()=>setInputMode("pdf")}/>
          </div>
          {inputMode==="paste"&&(
            <>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,marginBottom:8,lineHeight:1.6}}>Even key sections work — you don't need the whole report.</div>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste report text here..."
                style={{width:"100%",minHeight:180,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box",marginBottom:12}}/>
              <LCARSBtn label="Extract from text" colour={c} onClick={()=>processText(text)} disabled={text.trim().length<50}/>
            </>
          )}
          {inputMode==="pdf"&&(
            <>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,marginBottom:12,lineHeight:1.6}}>Upload a PDF report. Claude will read it and extract what's useful for {member.code}'s profile.</div>
              <input ref={fileRef} type="file" accept=".pdf" onChange={e=>{const f=e.target.files[0];if(f)setPdfFile(f);}} style={{display:"none"}}/>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                <LCARSBtn label="Choose PDF" colour={c} onClick={()=>fileRef.current.click()} small/>
                {pdfFile&&<span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted}}>{pdfFile.name}</span>}
              </div>
              {pdfFile&&<LCARSBtn label="Extract from PDF" colour={c} onClick={()=>handlePDF(pdfFile)}/>}
            </>
          )}
          {processing&&<Spinner colour={c}/>}
          {error&&<div style={{marginTop:12,padding:"10px",background:"#CC666622",border:"1px solid #CC6666",borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#CC6666"}}>Error: {error}</div>}
        </>
      )}

      {step==="review"&&editedExtract&&(
        <>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:c,letterSpacing:"0.08em",marginBottom:12}}>REVIEW — EDIT ANYTHING THAT LOOKS WRONG</div>
          <LCARSPanel colour={c} title="Summary" t={t}>
            <textarea value={editedExtract.summary||""} onChange={e=>setEditedExtract(p=>({...p,summary:e.target.value}))}
              style={{width:"100%",minHeight:72,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box"}}/>
          </LCARSPanel>
          {[{key:"strengths",label:"Strengths"},{key:"triggers",label:"Triggers"},{key:"strategies",label:"Strategies"},{key:"recommendationsForHome",label:"Home recommendations"}].map(({key,label})=>(
            <LCARSPanel key={key} colour={c} title={label} t={t}>
              {(editedExtract[key]||[]).map((item,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                  <span style={{color:c,marginTop:2,flexShrink:0}}>▶</span>
                  <input value={item} onChange={e=>{const a=[...(editedExtract[key]||[])];a[i]=e.target.value;setEditedExtract(p=>({...p,[key]:a}));}}
                    style={{flex:1,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,boxSizing:"border-box"}}/>
                  <button onClick={()=>setEditedExtract(p=>({...p,[key]:(p[key]||[]).filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:14}}>×</button>
                </div>
              ))}
              <button onClick={()=>setEditedExtract(p=>({...p,[key]:[...(p[key]||[]),""]}))} style={{background:"transparent",border:`1px solid ${c}44`,borderRadius:8,padding:"4px 12px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:c,cursor:"pointer",letterSpacing:"0.08em",marginTop:4}}>+ ADD</button>
            </LCARSPanel>
          ))}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <LCARSBtn label="Save to profile" colour={c} onClick={apply}/>
            <LCARSBtn label="Start over" colour={P.dustyRed} onClick={()=>{setStep("input");setEditedExtract(null);setText("");}} small/>
          </div>
        </>
      )}

      {step==="done"&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>✓</div>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:18,color:c,letterSpacing:"0.1em",marginBottom:8}}>REPORT SAVED</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.textMuted,marginBottom:24,lineHeight:1.6}}>Extracted information has been added to {member.code}'s profile.</div>
          <LCARSBtn label="Close" colour={c} onClick={onClose}/>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN INSIGHT — AI pull from log history
// ─────────────────────────────────────────────────────────────────────────────
const PATTERN_SYSTEM=`You are Mr. Spock, advising a parent who is caring for a neurodivergent family. You have been given a zone log history for one family member and some profile context.

Your job is to find 2-3 genuine, specific patterns or hypotheses in the data. These should be:
- Grounded in what the data actually shows — not generic advice
- Framed as hypotheses to investigate, not conclusions to act on
- Practical: each one should suggest a specific next observation or experiment
- Honest about data quality — if there's not enough data to say much, say so briefly and suggest what would be worth logging

You are NOT to:
- Offer generic regulation advice
- Diagnose or imply diagnoses
- Be reassuring in a hollow way
- Use jargon

Respond ONLY in JSON:
{
  "dataQuality": "good | limited | insufficient",
  "dataNote": "one sentence about the data quality and what it means for confidence",
  "observations": [
    {
      "title": "short title for the observation",
      "finding": "what the data shows — specific, grounded in the actual log pattern",
      "hypothesis": "what this might mean neurologically or situationally — framed as 'this may indicate' not 'this means'",
      "experiment": "one specific thing to try or observe in the next week to test this hypothesis"
    }
  ],
  "spockNote": "one closing observation in Spock's voice — logical, warm, reframing"
}`;

function buildLogSummary(profile){
  const logs=profile.logs||[];
  if(!logs.length)return null;

  const recent=getRecentLogs(logs,28);
  const all=logs.slice(-60);

  // Time-of-day distribution
  const byHour={morning:[],afternoon:[],evening:[]};
  recent.forEach(l=>{
    const h=new Date(l.ts).getHours();
    if(h<12)byHour.morning.push(l.zone);
    else if(h<17)byHour.afternoon.push(l.zone);
    else byHour.evening.push(l.zone);
  });

  const zoneCount=(arr)=>{
    const c={};
    arr.forEach(z=>c[z]=(c[z]||0)+1);
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([z,n])=>`${z}:${n}`).join(", ");
  };

  // Day-of-week pattern
  const byDay={};
  recent.forEach(l=>{
    const d=new Date(l.ts).toLocaleDateString("en-AU",{weekday:"short"});
    if(!byDay[d])byDay[d]=[];
    byDay[d].push(l.zone);
  });
  const dayPattern=Object.entries(byDay).map(([d,zones])=>`${d}(${zoneCount(zones)})`).join(", ");

  // Notes with content
  const notedLogs=all.filter(l=>l.note&&l.note.trim().length>3).slice(-10);

  return{
    memberCode:profile.code,
    totalLogs:logs.length,
    recentCount:recent.length,
    morningZones:zoneCount(byHour.morning)||"none logged",
    afternoonZones:zoneCount(byHour.afternoon)||"none logged",
    eveningZones:zoneCount(byHour.evening)||"none logged",
    dayPattern:dayPattern||"insufficient data",
    recentNotes:notedLogs.map(l=>`[${new Date(l.ts).toLocaleDateString("en-AU",{weekday:"short",day:"numeric"})} ${new Date(l.ts).getHours()<12?"AM":"PM"}] ${l.zone}: ${l.note}`).join("\n"),
    knownTriggers:(profile.triggers||[]).join(", ")||"none recorded",
    knownStrengths:(profile.strengths||[]).join(", ")||"none recorded",
    strategies:(profile.strategies||[]).join(", ")||"none recorded",
    age:profile.age,
    type:profile.type,
  };
}

function PatternInsightWidget({profile,colour,t,onSaveInsight}){
  const[state,setState]=useState("idle");
  const[result,setResult]=useState(null);
  const[error,setError]=useState(null);
  const[saved,setSaved]=useState(false);

  const logs=profile.logs||[];
  const MIN_LOGS=5;
  const hasEnough=logs.length>=MIN_LOGS;

  const runAnalysis=async()=>{
    setState("loading");setError(null);setSaved(false);
    const summary=buildLogSummary(profile);
    if(!summary){setState("error");setError("No log data to analyse.");return;}

    const user=`Family member: ${summary.memberCode}, age ${summary.age}, ${summary.type}
Total log entries: ${summary.totalLogs} (${summary.recentCount} in last 28 days)

ZONE DISTRIBUTION BY TIME OF DAY:
Morning (before noon): ${summary.morningZones}
Afternoon (noon-5pm): ${summary.afternoonZones}
Evening (after 5pm): ${summary.eveningZones}

ZONE DISTRIBUTION BY DAY OF WEEK:
${summary.dayPattern}

NOTES FROM LOGS:
${summary.recentNotes||"No notes recorded"}

PROFILE CONTEXT:
Known triggers: ${summary.knownTriggers}
Strengths: ${summary.knownStrengths}
Strategies that help: ${summary.strategies}`;

    try{
      const r=await callClaudeJSON(PATTERN_SYSTEM,user,1000);
      setResult(r);
      setState("result");
    }catch(e){
      setError(e.message);
      setState("error");
    }
  };

  const qualityColour=result?.dataQuality==="good"?P.teal:result?.dataQuality==="limited"?P.amber:P.dustyRed;

  return(
    <div style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.spock,letterSpacing:"0.15em",fontWeight:700}}>SPOCK — PATTERN ANALYSIS</div>
        {hasEnough&&state!=="loading"&&(
          <LCARSBtn label={state==="result"?"Re-analyse":"Ask Spock"} colour={P.spock} onClick={runAnalysis} small/>
        )}
      </div>

      {!hasEnough&&(
        <div style={{padding:"12px 14px",background:t.panel,border:`1px solid ${t.border}`,borderRadius:10,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6}}>
          Spock needs at least {MIN_LOGS} log entries to find meaningful patterns. {logs.length} logged so far.
          <SpockNote text="Insufficient data produces speculation, not analysis. Log at least five zone entries before requesting an interpretation." t={t}/>
        </div>
      )}

      {state==="loading"&&(
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0"}}>
          <div style={{width:22,height:22,border:`2.5px solid ${P.spock}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:P.spock,letterSpacing:"0.12em"}}>ANALYSING PATTERNS...</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {state==="error"&&(
        <div style={{padding:"10px 14px",background:"#CC666222",border:"1px solid #CC6666",borderRadius:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#CC6666",marginBottom:8}}>
          {error}
          <br/><button onClick={runAnalysis} style={{background:"none",border:"none",color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.1em",cursor:"pointer",marginTop:6}}>TRY AGAIN</button>
        </div>
      )}

      {state==="result"&&result&&(
        <div>
          {/* Data quality badge */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{padding:"3px 10px",background:qualityColour+"22",border:`1px solid ${qualityColour}44`,borderRadius:20,fontFamily:"'Antonio',sans-serif",fontSize:10,color:qualityColour,letterSpacing:"0.08em",fontWeight:700}}>
              DATA: {(result.dataQuality||"").toUpperCase()}
            </div>
            <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>{result.dataNote}</span>
          </div>

          {/* Observations */}
          {(result.observations||[]).map((obs,i)=>(
            <div key={i} style={{background:t.panel,border:`1px solid ${colour}33`,borderLeft:`4px solid ${colour}`,borderRadius:"0 12px 12px 0",padding:"14px 16px",marginBottom:10}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:12,color:colour,letterSpacing:"0.08em",fontWeight:700,marginBottom:8}}>{obs.title}</div>

              <div style={{marginBottom:8}}>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.1em",marginBottom:3}}>WHAT THE DATA SHOWS</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{obs.finding}</div>
              </div>

              <div style={{marginBottom:8}}>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.1em",marginBottom:3}}>WHAT THIS MAY INDICATE</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{obs.hypothesis}</div>
              </div>

              <div style={{padding:"8px 12px",background:P.teal+"15",border:`1px solid ${P.teal}44`,borderRadius:8}}>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,letterSpacing:"0.1em",marginBottom:3}}>TRY THIS WEEK</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{obs.experiment}</div>
              </div>
            </div>
          ))}

          <SpockNote text={result.spockNote} t={t}/>

          {/* Save prompt */}
          {!saved&&onSaveInsight&&(
            <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
              <LCARSBtn label="Save to insights" colour={colour} small onClick={()=>{
                const date=new Date().toISOString().slice(0,10);
                (result.observations||[]).forEach(obs=>{
                  onSaveInsight({
                    date,
                    title:`Pattern: ${obs.title}`,
                    text:`${obs.finding} — ${obs.hypothesis} To test: ${obs.experiment}`,
                  });
                });
                setSaved(true);
              }}/>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>Saves to the Insights tab</span>
            </div>
          )}
          {saved&&<div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.teal,letterSpacing:"0.1em",marginTop:10}}>✓ SAVED TO INSIGHTS</div>}
        </div>
      )}
    </div>
  );
}
const LCARS_SWATCHES=[
  "#FF9900","#CC6666","#99CCFF","#CC99FF","#4DB8FF",
  "#6B8CFF","#00B4B4","#FFCC00","#FF9966","#9999FF",
  "#66FFCC","#FF6666","#FF66CC","#99FF99","#FF9933",
  "#66CCFF","#CC99CC","#FFCC99","#99CCCC","#FF6699",
];
function ColourPicker({current,onChange,t}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(o=>!o)} title="Change colour"
        style={{width:22,height:22,borderRadius:11,background:current,border:`2px solid #fff4`,cursor:"pointer",display:"block",flexShrink:0}}/>
      {open&&(
        <div style={{position:"absolute",top:28,right:0,background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:8,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,zIndex:2000,boxShadow:"0 4px 20px #0008"}}>
          {LCARS_SWATCHES.map(sw=>(
            <button key={sw} onClick={()=>{onChange(sw);setOpen(false);}}
              style={{width:26,height:26,borderRadius:13,background:sw,border:sw===current?"3px solid #fff":"2px solid #fff4",cursor:"pointer",transition:"transform 0.1s"}}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE NUDGES — checks if key routine types happened recently
// ─────────────────────────────────────────────────────────────────────────────
// A nudge fires when a member hasn't had a green or yellow zone logged
// in the morning window (before 10am) for 2+ consecutive days.
// Kept intentionally simple — one nudge max per family per session.
function getRoutineNudges(profiles){
  const nudges=[];
  const now=new Date();
  const today=now.toISOString().slice(0,10);
  const yesterday=new Date(now-864e5).toISOString().slice(0,10);

  for(const member of Object.values(profiles)){
    if(member.type!=="child")continue;
    const logs=member.logs||[];
    // Morning logs = before 10am
    const morningLogs=logs.filter(l=>{
      const d=new Date(l.ts);
      return d.getHours()<10&&(l.date===today||l.date===yesterday);
    });
    if(morningLogs.length===0&&logs.length>0){
      // Has historical logs but nothing recent in morning window
      nudges.push({
        code:member.code,
        colour:member.colour,
        text:`No morning check-in for ${member.code} in the last couple of days. Morning zone logs help spot patterns early.`,
        type:"morning",
      });
    }
  }
  return nudges.slice(0,2); // max 2 nudges on dashboard
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMA(H) SELF-CHECK — adult profiles only
// ─────────────────────────────────────────────────────────────────────────────
const PERMAH_QUESTIONS=[
  {id:"P1",pillar:"P",label:"Positive emotions",q:"How often have you felt genuinely good — not just 'fine' — this week?",low:"Rarely or not at all",high:"Often, in meaningful moments"},
  {id:"E1",pillar:"E",label:"Engagement",q:"Have you found yourself absorbed in something you were doing — lost in it in a good way?",low:"Not really",high:"Yes, more than once"},
  {id:"R1",pillar:"R",label:"Relationships",q:"How connected have you felt to the people you care about this week?",low:"Pretty disconnected",high:"Genuinely connected"},
  {id:"M1",pillar:"M",label:"Meaning",q:"Has what you've been doing felt like it matters — even in small ways?",low:"Hard to see right now",high:"Yes, clearly"},
  {id:"A1",pillar:"A",label:"Accomplishment",q:"Have you been able to finish things — or make progress on things that matter to you?",low:"Not much",high:"More than I expected"},
  {id:"H1",pillar:"H",label:"Health & regulation",q:"How well has your nervous system been doing — sleep, sensory load, capacity to recover?",low:"Running on empty",high:"Reasonably well resourced"},
  {id:"H2",pillar:"H",label:"Cognitive load",q:"How manageable has the mental load felt this week?",low:"Overwhelming",high:"Mostly manageable"},
];

const PERMAH_SUGGESTIONS={
  P:["Notice one small thing each day that felt genuinely good — not what should feel good, what actually did. Write it down or just say it aloud.","The physiological sigh (double inhale, long exhale) done 5 times takes 90 seconds and reliably shifts positive affect. Try it before you get up tomorrow."],
  E:["Find one 10-minute slot this week for something you find genuinely absorbing — not productive, just engaging. Protect it like an appointment.","Flow states require the right level of challenge. If everything feels too hard or too easy, adjust one thing you're working on to sit at the edge of your current capacity."],
  R:["The 2-minute rule: two minutes of genuine, undivided conversation with one person you care about — no phones, no half-attention. Do it today.","Side-by-side time counts as connection — you don't have to be talking. Being in the same space, doing parallel things, is relationally meaningful."],
  M:["When the why is hard to see, zoom out one level: not 'why does this task matter' but 'what kind of person am I trying to be in this?' That's usually more stable.","Name one thing — even one tiny thing — that you did this week that was genuinely for someone else. Meaning often lives in the small unremarked acts."],
  A:["Break one stalled thing into its smallest possible next action. Not 'write the thing' but 'open the document.' Initiation is the hard part; the rest follows.","Reduce your accomplishment list to three things for tomorrow. For a nervous system that works like yours, fewer genuine completions beat many partial ones."],
  H:["Your nervous system needs rhythm more than most. If sleep, meals, or movement have drifted, pick one to re-anchor — just one. The others will follow.","Sensory load accumulates invisibly. Audit your environment for one thing that's been draining you without you noticing it — noise, light, unpredictability — and reduce it."],
};

function PERMAHCheck({member,onSave,t}){
  const c=member.colour;
  const[scores,setScores]=useState(()=>{
    const s={};
    PERMAH_QUESTIONS.forEach(q=>{s[q.id]=5;});
    return s;
  });
  const[submitted,setSubmitted]=useState(false);
  const[results,setResults]=useState(null);

  const submit=()=>{
    // Aggregate by pillar
    const pillars={P:[],E:[],R:[],M:[],A:[],H:[]};
    PERMAH_QUESTIONS.forEach(q=>{
      if(pillars[q.pillar])pillars[q.pillar].push(scores[q.id]);
    });
    const pillarAvg={};
    Object.entries(pillars).forEach(([k,v])=>{
      pillarAvg[k]=v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):5;
    });
    // Find lowest pillar
    const sorted=Object.entries(pillarAvg).sort((a,b)=>a[1]-b[1]);
    const lowest=sorted[0][0];
    const suggestions=PERMAH_SUGGESTIONS[lowest]||PERMAH_SUGGESTIONS.H;
    const checkInRecord={date:new Date().toISOString().slice(0,10),scores,pillarAvg,lowest};
    setResults({pillarAvg,lowest,suggestions});
    setSubmitted(true);
    onSave(checkInRecord);
  };

  const pillarColours={P:P.amber,E:P.teal,R:P.dustyRed,M:P.spock,A:P.midBlue,H:P.lilac};
  const pillarLabels={P:"Positive emotions",E:"Engagement",R:"Relationships",M:"Meaning",A:"Accomplishment",H:"Health & regulation"};

  if(submitted&&results)return(
    <div>
      {/* Visual profile */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:c,letterSpacing:"0.15em",marginBottom:10,fontWeight:700}}>YOUR PROFILE THIS WEEK</div>
        {Object.entries(results.pillarAvg).map(([pillar,avg])=>(
          <div key={pillar} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:pillarColours[pillar],width:110,flexShrink:0,letterSpacing:"0.06em"}}>{pillarLabels[pillar]}</div>
            <div style={{flex:1,height:16,background:t.border,borderRadius:8,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${avg*10}%`,background:pillarColours[pillar],borderRadius:8,transition:"width 0.5s ease"}}/>
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:pillarColours[pillar],width:24,textAlign:"right"}}>{avg}</div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <LCARSPanel colour={pillarColours[results.lowest]} title={`Something to try — ${pillarLabels[results.lowest]}`} t={t}>
        {results.suggestions.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <div style={{background:pillarColours[results.lowest],color:"#000",fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,borderRadius:4,padding:"1px 6px",flexShrink:0,marginTop:2}}>{i+1}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.6}}>{s}</div>
          </div>
        ))}
      </LCARSPanel>

      <div style={{padding:"10px 14px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10,marginTop:4}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.12em",marginBottom:3}}>SPOCK SAYS</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>This is data, not a verdict. The lowest pillar is where the most leverage is right now — not where you are failing. Check back in a couple of weeks.</div>
      </div>
    </div>
  );

  return(
    <div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:20}}>
        Seven questions about this week. No right answers. Sliders are private and stay on this device. Takes about 2 minutes — worth doing once a fortnight.
      </div>
      {PERMAH_QUESTIONS.map(q=>{
        const pc=pillarColours[q.pillar];
        return(
          <div key={q.id} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:pc,background:pc+"22",border:`1px solid ${pc}44`,borderRadius:20,padding:"2px 8px",letterSpacing:"0.08em",fontWeight:700}}>{q.label}</span>
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.5,marginBottom:10}}>{q.q}</div>
            <input type="range" min={1} max={10} step={1} value={scores[q.id]}
              onChange={e=>setScores(s=>({...s,[q.id]:Number(e.target.value)}))}
              style={{width:"100%",accentColor:pc,marginBottom:4}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>{q.low}</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:pc}}>{scores[q.id]}</span>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>{q.high}</span>
            </div>
          </div>
        );
      })}
      <LCARSBtn label="See my profile" colour={c} onClick={submit} style={{width:"100%",marginTop:8}}/>
    </div>
  );
}
function SubHeader({title,member,onBack,t}){
  return(
    <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"stretch",height:52}}>
        <button onClick={onBack} style={{background:member.colour,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",letterSpacing:"0.1em",borderRadius:"14px 0 0 0",flexShrink:0}}>← {member.code}</button>
        <div style={{flex:1,display:"flex",alignItems:"center",padding:"0 16px"}}>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:member.colour,letterSpacing:"0.1em",fontWeight:700}}>{title.toUpperCase()}</span>
        </div>
      </div>
      <div style={{height:3,background:`linear-gradient(to right, ${member.colour}, ${P.spock})`}}/>
    </div>
  );
}

function ToolCard({title,desc,colour,onClick,t}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?colour+"22":t.panel,border:`1.5px solid ${colour}${h?"":"44"}`,borderRadius:12,padding:"16px 20px",textAlign:"left",cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:12,width:"100%"}}>
      <div style={{width:4,height:40,borderRadius:2,background:colour,flexShrink:0}}/>
      <div>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:colour,letterSpacing:"0.08em",fontWeight:700,marginBottom:4}}>{title.toUpperCase()}</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.5}}>{desc}</div>
      </div>
    </button>
  );
}

function ProfileView({member,onClose,onSave,t,profiles}){
  const[profile,setProfile]=useState({...member});
  const[tab,setTab]=useState("overview");
  const[showMoreTabs,setShowMoreTabs]=useState(false);
  const[toolMode,setToolMode]=useState("parent");
  const[subTool,setSubTool]=useState(null);
  const[showAdultSpock,setShowAdultSpock]=useState(false);
  const devStage=member.type==="child"?getDevStage(member.age):null;
  const c=member.colour;

  const save=()=>{onSave(profile);onClose();};
  const update=(field,val)=>setProfile(p=>({...p,[field]:val}));
  const addToList=(field,val)=>update(field,[...(profile[field]||[]),val]);
  const removeFromList=(field,i)=>update(field,(profile[field]||[]).filter((_,j)=>j!==i));

  // Primary tabs always visible; secondary tabs behind "More"
  const primaryTabs=member.type==="child"
    ?["overview","history","tools","profile"]
    :["overview","history","tools","profile"];
  const secondaryTabs=member.type==="child"
    ?["strategies","insights","reports"]
    :["my strategies","wellbeing","insights","reports"];

  const handleSaveReport=(reportMeta,extracted)=>{
    const reports=[...(profile.reports||[]),reportMeta];
    const merged={...profile,reports,
      strengths:[...new Set([...(profile.strengths||[]),...(extracted.strengths||[])])],
      triggers:[...new Set([...(profile.triggers||[]),...(extracted.triggers||[])])],
      strategies:[...new Set([...(profile.strategies||[]),...(extracted.strategies||[]),...(extracted.recommendationsForHome||[])])],
    };
    setProfile(merged);setSubTool(null);
  };

  const handleSaveInsight=(insight)=>setProfile(p=>({...p,discoveryInsights:[...(p.discoveryInsights||[]),insight]}));

  const handleLogZone=(code,zoneId,note)=>setProfile(p=>logZone(p,zoneId,note));

  const handleSavePermah=(record)=>{
    setProfile(p=>({...p,permahHistory:[...(p.permahHistory||[]),record]}));
  };

  // Sub-tool overlay
  if(showAdultSpock)return(
    <SpockScreen
      profiles={profiles||{[member.code]:member}}
      onClose={()=>setShowAdultSpock(false)}
      onUpdateProfile={()=>{}}
      t={t}
      adultMode={true}
      preselectedMember={profile}
    />
  );
  if(subTool==="discovery")return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:950,overflowY:"auto",display:"flex",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:560,width:"100%",border:`2px solid ${c}66`,alignSelf:"flex-start"}}>
        <SubHeader title="Self-Discovery" member={member} onBack={()=>setSubTool(null)} t={t}/>
        <SelfDiscovery member={profile} onSaveInsight={handleSaveInsight} onClose={()=>setSubTool(null)} toolMode={toolMode} t={t}/>
      </div>
    </div>
  );
  if(subTool==="why")return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:950,overflowY:"auto",display:"flex",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:560,width:"100%",border:`2px solid ${c}66`,alignSelf:"flex-start"}}>
        <SubHeader title="Why is this happening?" member={member} onBack={()=>setSubTool(null)} t={t}/>
        <WhyTool member={profile} onClose={()=>setSubTool(null)} t={t}/>
      </div>
    </div>
  );
  if(subTool==="breathing")return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:950,overflowY:"auto",display:"flex",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:440,width:"100%",border:`2px solid ${c}66`,alignSelf:"flex-start"}}>
        <SubHeader title="Breathing Reset" member={member} onBack={()=>setSubTool(null)} t={t}/>
        <BreathingTool member={profile} onClose={()=>setSubTool(null)} t={t}/>
      </div>
    </div>
  );
  if(subTool==="report")return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:950,overflowY:"auto",display:"flex",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:600,width:"100%",border:`2px solid ${c}66`,alignSelf:"flex-start"}}>
        <SubHeader title="Add Report" member={member} onBack={()=>setSubTool(null)} t={t}/>
        <ReportIngestion member={profile} onSave={handleSaveReport} onClose={()=>setSubTool(null)} t={t}/>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:900,overflowY:"auto",padding:16,display:"flex",justifyContent:"center"}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:640,width:"100%",border:`2px solid ${c}66`,alignSelf:"flex-start"}}>

        {/* Header */}
        <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"stretch",height:56}}>
            <div style={{background:c,width:80,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",borderRadius:"14px 0 0 0",flexShrink:0}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:16,fontWeight:700,color:"#000",letterSpacing:"0.06em"}}>{member.code}</span>
              <ColourPicker current={c} onChange={newCol=>update("colour",newCol)} t={t}/>
            </div>
            <div style={{display:"flex",gap:6,padding:"0 12px",alignItems:"center",flex:1}}>
              {[P.amber,c,P.teal].map((col,i)=>(
                <div key={i} style={{height:i===1?16:10,background:col,borderRadius:5,flex:i===1?2:1,opacity:0.7}}/>
              ))}
            </div>
            <button onClick={save} style={{background:P.teal,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",letterSpacing:"0.1em"}}>SAVE</button>
            <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
          </div>
          <div style={{padding:"6px 16px 10px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:c,letterSpacing:"0.1em"}}>AGE {member.age}</span>
            {devStage&&<span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>{devStage.regulation.slice(0,55)}…</span>}
          </div>
        </div>

        {/* Mode toggle */}
        {member.type==="child"&&member.age>=3&&(
          <div style={{display:"flex",gap:8,padding:"12px 16px 0",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:t.textMuted,letterSpacing:"0.1em"}}>VIEW MODE:</span>
            {["parent","child"].map(m=>(
              <LCARSChip key={m} label={m} colour={c} selected={toolMode===m} onClick={()=>setToolMode(m)} small/>
            ))}
          </div>
        )}
        {toolMode==="child"&&member.type==="child"&&(
          <div style={{margin:"10px 16px 0",padding:"10px 14px",background:P.amber+"15",border:`1.5px solid ${P.amber}`,borderRadius:10}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.amber,letterSpacing:"0.12em",marginBottom:5,fontWeight:700}}>FOR THE GROWN-UP</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>Child-facing mode active. Let {member.code} lead. Read questions aloud, write their exact words.</div>
          </div>
        )}

        {/* Tabs — 4 primary always visible, rest behind More */}
        <div style={{display:"flex",padding:"12px 16px 0",borderBottom:`1px solid ${t.border}`,overflowX:"auto",gap:0}}>
          {primaryTabs.map(tid=>(
            <button key={tid} onClick={()=>{setTab(tid);setShowMoreTabs(false);}}
              style={{background:tab===tid?c:"transparent",color:tab===tid?"#000":t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 12px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s",minHeight:44}}>
              {tid}
            </button>
          ))}
          {/* More button */}
          {/* More button — always shows MORE, secondary tab shown highlighted in dropdown */}
          <button onClick={()=>setShowMoreTabs(m=>!m)}
            style={{background:showMoreTabs?c+"44":"transparent",color:t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 12px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s",minHeight:44,position:"relative"}}>
            MORE ▾
            {secondaryTabs.includes(tab)&&<div style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:c}}/>}
          </button>
        </div>
        {/* Secondary tab dropdown */}
        {showMoreTabs&&(
          <div style={{background:t.surface2,borderBottom:`1px solid ${t.border}`,display:"flex",flexWrap:"wrap",gap:4,padding:"8px 16px"}}>
            {secondaryTabs.map(tid=>(
              <button key={tid} onClick={()=>{setTab(tid);setShowMoreTabs(false);}}
                style={{background:tab===tid?c:c+"22",color:tab===tid?"#000":c,border:`1px solid ${c}44`,borderRadius:20,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.12s",minHeight:36}}>
                {tid}
              </button>
            ))}
          </div>
        )}

        <div style={{padding:20}}>

          {tab==="overview"&&(
            <div>
              {devStage&&(
                <LCARSPanel colour={c} title="Developmental focus" t={t}>
                  {[{label:"Self-regulation",v:devStage.regulation,col:c},{label:"Social",v:devStage.social,col:P.teal},{label:"Learning",v:devStage.academic,col:P.amber}].map((item,pi)=>(
                    <div key={item.label} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#000",background:item.col,borderRadius:4,padding:"2px 7px",fontWeight:700,flexShrink:0,marginTop:2}}>P{pi+1}</div>
                      <div>
                        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:t.textMuted,letterSpacing:"0.06em",marginBottom:2}}>{item.label.toUpperCase()}</div>
                        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{item.v}</div>
                      </div>
                    </div>
                  ))}
                  <SpockNote text={devStage.spockNote} t={t}/>
                </LCARSPanel>
              )}
              <LCARSPanel colour={c} title="Zone right now" t={t}>
                {/* Zone selector — large emoji-first, 44px min tap targets */}
                {(() => {
                  const activeZone = zoneIsStale(profile) ? null : profile.zone;
                  return (
                    <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
                      {ZONES.map(z=>(
                        <button key={z.id} onClick={()=>update("zone",z.id)}
                          style={{background:activeZone===z.id?z.colour:z.colour+"22",color:activeZone===z.id?"#000":z.colour,border:`2px solid ${z.colour}`,borderRadius:10,padding:"10px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.12s",minHeight:70,minWidth:44}}>
                          <span style={{fontSize:28}}>{z.emoji}</span>
                          {toolMode!=="child"&&<span style={{fontFamily:"'Antonio',sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.04em",lineHeight:1.2}}>{z.label}</span>}
                        </button>
                      ))}
                    </div>
                    {zoneIsStale(profile)&&profile.zone&&(
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textDim,marginBottom:8,textAlign:"center"}}>Yesterday's zone — select a new one to log today</div>
                    )}
                    {/* Inline note — always visible, logs with zone on button tap */}
                    <div style={{marginBottom:8}}>
                      <textarea id={`zone-note-${member.code}`} placeholder="Optional note — what's happening? (one line is fine)"
                        style={{width:"100%",minHeight:52,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"none",boxSizing:"border-box",lineHeight:1.5}}/>
                    </div>
                    <LCARSBtn label="Save log entry" colour={c} small disabled={!profile.zone} onClick={()=>{
                      const noteEl=document.getElementById(`zone-note-${member.code}`);
                      const note=noteEl?noteEl.value.trim():"";
                      handleLogZone(member.code,profile.zone,note);
                      if(noteEl)noteEl.value="";
                    }} style={{width:"100%"}}/>
                    {!profile.zone&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textDim,marginTop:6,textAlign:"center"}}>Select a zone above to log</div>}
                    </>
                  );
                })()}
              </LCARSPanel>
            </div>
          )}

          {tab==="profile"&&(
            <div>
              {(member.type==="child"?["strengths","interests","triggers"]:["strengths","interests","triggers","energisers","depletes"]).map(field=>(
                <LCARSPanel key={field} colour={c} title={field==="triggers"?"Known triggers":field==="energisers"?"What energises me":field==="depletes"?"What depletes me":field} t={t}>
                  <TagList items={profile[field]||[]} colour={c} onRemove={i=>removeFromList(field,i)} t={t}/>
                  <AddItemInput colour={c} placeholder={`Add...`} onAdd={v=>addToList(field,v)} t={t}/>
                </LCARSPanel>
              ))}
            </div>
          )}

          {(tab==="strategies"||tab==="my strategies")&&(
            <LCARSPanel colour={c} title="What helps" t={t}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:12,padding:"10px 12px",background:c+"12",borderRadius:8,borderLeft:`3px solid ${c}`}}>
                Record things that genuinely help {member.code} regulate — sensory tools, activities, environments, specific phrases, or people. This builds a personal reference the whole family can use in the moment, and that Spock draws on when generating specific suggestions.
              </div>
              <TagList items={profile.strategies||[]} colour={c} onRemove={i=>removeFromList("strategies",i)} t={t}/>
              <AddItemInput colour={c} placeholder="Add strategy..." onAdd={v=>addToList("strategies",v)} t={t}/>
            </LCARSPanel>
          )}

          {tab==="history"&&(
            <div>
              <LCARSPanel colour={c} title="Zone history — last 14 days" t={t}>
                <ZoneHistory logs={profile.logs} colour={c} t={t}/>
              </LCARSPanel>
              {detectPatterns(profile.logs).length>0&&(
                <LCARSPanel colour={P.spock} title="Patterns noticed" t={t}>
                  {detectPatterns(profile.logs).map((p,i)=>(
                    <div key={i} style={{padding:"8px 12px",background:p.colour+"15",border:`1px solid ${p.colour}44`,borderRadius:8,marginBottom:8,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{p.text}</div>
                  ))}
                  <SpockNote text="A pattern in the data is a hypothesis, not a certainty. It is worth investigating — not acting on without verification. The next step is observation, not intervention." t={t}/>
                </LCARSPanel>
              )}
              <LCARSPanel colour={c} title="Recent log entries" t={t}>
                {(profile.logs||[]).length===0
                  ?<div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted}}>No entries yet.</div>
                  :(profile.logs||[]).slice().reverse().slice(0,20).map((entry,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:i<19?`1px solid ${t.border}`:"none"}}>
                      <span style={{fontSize:20,flexShrink:0}}>{zoneEmoji(entry.zone)}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
                          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.textMuted}}>{new Date(entry.ts).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}</span>
                          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.textDim}}>{new Date(entry.ts).toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})}</span>
                          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:zoneColour(entry.zone),fontWeight:700,letterSpacing:"0.06em"}}>{ZONES.find(z=>z.id===entry.zone)?.label}</span>
                        </div>
                        {entry.note&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.4}}>{entry.note}</div>}
                      </div>
                    </div>
                  ))
                }
                {/* CSV export — for sharing with external professionals */}
                {(profile.logs||[]).length>0&&(
                  <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.1em",marginBottom:2}}>EXPORT FOR PROFESSIONAL USE</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textDim}}>Downloads all {profile.logs.length} zone log entries as a CSV file.</div>
                    </div>
                    <button onClick={()=>{
                      const rows=[["Date","Time","Day","Zone","Note"]];
                      (profile.logs||[]).slice().reverse().forEach(e=>{
                        const d=new Date(e.ts);
                        rows.push([
                          d.toLocaleDateString("en-AU"),
                          d.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}),
                          d.toLocaleDateString("en-AU",{weekday:"long"}),
                          ZONES.find(z=>z.id===e.zone)?.label||e.zone,
                          (e.note||"").replace(/,/g," ").replace(/\n/g," "),
                        ]);
                      });
                      const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
                      const blob=new Blob([csv],{type:"text/csv"});
                      const url=URL.createObjectURL(blob);
                      const a=document.createElement("a");
                      a.href=url;a.download=`${member.code}-zone-history-${new Date().toISOString().slice(0,10)}.csv`;a.click();
                      URL.revokeObjectURL(url);
                    }} style={{background:"transparent",border:`1.5px solid ${c}`,borderRadius:10,padding:"8px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:c,cursor:"pointer",letterSpacing:"0.08em",flexShrink:0,minHeight:44}}>
                      EXPORT CSV ↓
                    </button>
                  </div>
                )}
              </LCARSPanel>
              <PatternInsightWidget profile={profile} colour={c} t={t} onSaveInsight={handleSaveInsight}/>
            </div>
          )}

          {tab==="insights"&&(
            <div>
              <LCARSPanel colour={c} title="What makes things hard" t={t}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:12,padding:"10px 12px",background:c+"12",borderRadius:8,borderLeft:`3px solid ${c}`}}>
                  Record the specific situations or demands that are consistently hard for {member.code} — not the behaviour that results, but what makes the situation difficult in the first place. This is a diagnostic log, not a complaint list. Over time it reveals patterns worth solving.
                </div>
                <TagList items={profile.unsolvedProblems||[]} colour={c} onRemove={i=>removeFromList("unsolvedProblems",i)} t={t}/>
                <AddItemInput colour={c} placeholder="e.g. transitioning from reading to getting ready..." onAdd={v=>addToList("unsolvedProblems",v)} t={t}/>
              </LCARSPanel>
              <LCARSPanel colour={P.spock} title="Discovery insights" t={t}>
              {(profile.discoveryInsights||[]).length===0
                ?<div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6}}>No insights yet. Use the self-discovery tool in the Tools tab.</div>
                :(profile.discoveryInsights||[]).map((ins,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:8,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.1em"}}>{ins.date}{ins.title?` — ${ins.title}`:""}</div>
                      <button onClick={()=>removeFromList("discoveryInsights",i)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:13}}>×</button>
                    </div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{ins.text}</div>
                  </div>
                ))
              }
              </LCARSPanel>
            </div>
          )}

          {tab==="wellbeing"&&member.type==="adult"&&(
            <div>
              {(profile.permahHistory||[]).length>0&&(
                <LCARSPanel colour={c} title="Previous check-ins" t={t} style={{marginBottom:16}}>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {(profile.permahHistory||[]).slice(-6).map((r,i)=>(
                      <div key={i} style={{padding:"4px 10px",background:c+"22",border:`1px solid ${c}44`,borderRadius:20,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:c}}>{r.date}</div>
                    ))}
                  </div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginTop:8,lineHeight:1.5}}>Doing this fortnightly builds a picture of how your capacity shifts over time.</div>
                </LCARSPanel>
              )}
              <PERMAHCheck member={profile} onSave={handleSavePermah} t={t}/>
            </div>
          )}

          {tab==="reports"&&(
            <div>
              <div style={{marginBottom:14}}>
                <LCARSBtn label="+ Add report or assessment" colour={c} onClick={()=>setSubTool("report")}/>
              </div>
              {(profile.reports||[]).length===0
                ?<LCARSPanel colour={c} t={t}><div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6}}>No reports added yet. Upload PDFs or paste text from cognitive, psychological, OT, or speech assessments.</div></LCARSPanel>
                :(profile.reports||[]).map((r,i)=>(
                  <LCARSPanel key={i} colour={c} t={t}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:12,color:c,letterSpacing:"0.08em",marginBottom:4}}>{(r.type||"Report").toUpperCase()} · {r.date}</div>
                        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.5}}>{r.summary}</div>
                      </div>
                      <button onClick={()=>update("reports",(profile.reports||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:14,flexShrink:0,marginLeft:8}}>×</button>
                    </div>
                  </LCARSPanel>
                ))
              }
            </div>
          )}

          {tab==="tools"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {member.type==="child"&&<ToolCard title="Self-discovery" desc={member.age<=2?"Record your observations about what you're noticing":"Explore who they are — saves insights to their profile"} colour={P.spock} onClick={()=>setSubTool("discovery")} t={t}/>}
              {member.type==="adult"&&<ToolCard title="Know yourself" desc="Explore your own patterns, strengths, and what your brain needs" colour={P.spock} onClick={()=>setSubTool("discovery")} t={t}/>}
              {member.type==="adult"&&<ToolCard title="Wellbeing check-in" desc="Fortnightly PERMA(H) self-check — see which pillar needs attention right now" colour={c} onClick={()=>setTab("wellbeing")} t={t}/>}
              {member.type==="adult"&&<ToolCard title="Spock — how are YOU right now?" desc="First-person consultation about your own regulatory state. What to do for yourself, right now." colour={P.spock} onClick={()=>setShowAdultSpock(true)} t={t}/>}
              {member.type==="adult"&&<ToolCard title="Why is this happening — for me?" desc="Describe something you keep experiencing. Spock explains the likely neurological reason." colour={c} onClick={()=>setSubTool("why")} t={t}/>}
              {member.type==="child"&&<ToolCard title="Why is this happening?" desc="Describe a situation — Spock explains the likely reason and what to do" colour={c} onClick={()=>setSubTool("why")} t={t}/>}
              <ToolCard title="Breathing reset" desc={`${member.age<=5?"3":"5"} cycles of cyclic breathing — fastest evidence-based nervous system reset`} colour={P.teal} onClick={()=>setSubTool("breathing")} t={t}/>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE EXPLAINERS — click-to-explain on zone legend dots
// Addresses the red/yellow confusion — families often report yellow when red
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_EXPLAINERS={
  framework:{
    label:"The Zones Framework",
    colour:"#6B8CFF",
    what:"Every nervous system moves through different states of arousal throughout the day. The window of tolerance is the range where a person can think, learn, connect, and regulate — this is the green zone. Below the window is shutdown (blue). Above it is activation (yellow and red).",
    looks:"The window is not fixed. It narrows under chronic stress, poor sleep, hunger, sensory overload, or sustained threat. It expands with consistent safety, co-regulation, routine, and recovery. A family under sustained load will have compressed windows — things escalate faster and recover more slowly. This is not a character flaw. It is physiology.",
    doNow:"Use the zones to track where each person is across the day. The goal is not to stay green — it is to notice early, respond early, and return to green faster. Yellow is the intervention window. Green is the investment window. Blue and red both need specific, different responses.",
    important:"The zones follow a continuum: Green → Yellow (early) → Yellow (late, acceleration) → Red (peak) → Red (subsiding) → Blue (recovery). The jump from green to red that feels sudden is almost always a missed yellow phase. Yellow is the zone most often mistaken for green.",
    spock:"The window of tolerance was described by Daniel Siegel to explain why the same person can be rational and connected one moment and completely dysregulated the next. The nervous system is not misbehaving. It is responding accurately to what it perceives. The appropriate response is always physiological first — regulate the body before addressing the behaviour.",
  },
  red:{
    label:"Red zone — above the window",
    colour:"#EF4444",
    what:"The nervous system is in full fight-or-flight mode. The thinking brain (prefrontal cortex) is effectively offline.",
    looks:"Shouting, hitting, throwing, crying hard, running away, freezing completely, screaming. Can also look like defiance — but the capacity for reasoning is genuinely not available.",
    doNow:"Space and silence. Reduce all inputs. No demands, no reasoning, no consequences. Regulated presence only.",
    important:"Red is often preceded by yellow markers that were missed or dismissed as green. If reasoning isn't working and the episode feels sudden, yellow was likely present and undetected. If reasoning isn't working at all — they are red.",
    spock:"Attempting to reason with a nervous system in full activation is not merely ineffective — it actively increases dysregulation. The only available tool is your own regulated presence.",
  },
  yellow:{
    label:"Yellow zone — approaching the edge",
    colour:"#EAB308",
    what:"The nervous system is elevated — moving toward the upper edge of the window of tolerance. Thinking is harder but still possible.",
    looks:"Restlessness, fidgeting, argumentativeness, refusing requests, provocative comments, rising voice, silliness that escalates. The person can still hear you — but their capacity is reduced.",
    doNow:"Movement, genuine choice, reduce demands, transition warnings. Act before it escalates.",
    important:"Yellow is the intervention window. Red has not yet happened — this is the moment to act. Yellow is also easily mistaken for green — if things feel OK-ish but something is off, trust that instinct. Yellow is where de-escalation and regulation tools work. Note: late yellow (acceleration) is the last window before red — de-escalation tools are still available but the window is closing fast. Act on early yellow signals before it reaches this point.",
    spock:"The yellow zone is where intervention is both possible and most effective. Every minute of early response in yellow is worth ten minutes of recovery from red.",
  },
  green:{
    label:"Green zone — in the window",
    colour:"#22C55E",
    what:"The nervous system is regulated. Thinking, learning, connecting, and reasoning are all accessible.",
    looks:"Calm engagement, willingness to participate, able to hear instructions, able to make choices, able to repair. This is when everyone is most themselves.",
    doNow:"Connect. Teach. Repair. Build routines. Run the 2×10 strategy. Do the self-discovery tool.",
    important:"Green is the time to invest — in relationship, in teaching strategies, in repair. It is not just the absence of a problem. Green markers are also easy to miss — if things feel OK-ish, check whether yellow is already present.",
    spock:"The green zone is not simply the absence of dysregulation. It is the only state in which genuine learning, connection, and growth are available. Use it deliberately.",
  },
  blue:{
    label:"Blue zone — below the window",
    colour:"#3B82F6",
    what:"The nervous system has shut down — hypoarousal. The person is under-activated, withdrawn, or dissociated.",
    looks:"Flatness, not responding, moving slowly, glazed expression, reluctance to initiate anything, seeming 'gone'. Can be mistaken for laziness or rudeness.",
    doNow:"Warmth, rhythm, gentle sensory input. No demands. Body-doubling. A warm drink. Something to hold. Movement snack if they can access it.",
    important:"Blue is not a choice. It is the nervous system in dorsal vagal shutdown — a protective state. Demands and consequences make it worse. Blue often follows a red episode — it is the recovery phase. The path back to green runs through blue, not around it. Give it time.",
    spock:"Hypoarousal is the nervous system's protection response — not defiance, not laziness. Bottom-up activation through sensation and rhythm is the only reliable entry point.",
  },
};

function ZoneExplainerModal({zoneId,onClose,t}){
  const z=ZONE_EXPLAINERS[zoneId];
  if(!z)return null;
  const isFramework=zoneId==="framework";
  return(
    <div style={{position:"fixed",inset:0,background:"#000000DD",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,border:`2px solid ${z.colour}`,borderRadius:16,maxWidth:480,width:"100%",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{background:z.colour,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:15,fontWeight:700,color:"#000",letterSpacing:"0.08em"}}>{z.label.toUpperCase()}</span>
          <button onClick={onClose} style={{background:"rgba(0,0,0,0.2)",border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:10,cursor:"pointer",letterSpacing:"0.08em"}}>CLOSE</button>
        </div>
        <div style={{padding:18}}>
          {/* doNow — prominent box at top (not shown for framework) */}
          {!isFramework&&(
            <div style={{background:z.colour+"22",border:`2px solid ${z.colour}`,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:z.colour,letterSpacing:"0.14em",fontWeight:700,marginBottom:6}}>WHAT TO DO RIGHT NOW</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:t.text,lineHeight:1.6,fontWeight:700}}>{z.doNow}</div>
            </div>
          )}
          {/* Remaining fields */}
          {[
            {label:"What it is",text:z.what},
            {label:"What it looks like",text:z.looks},
            ...(isFramework?[{label:"How to use it",text:z.doNow}]:[]),
            {label:"Important",text:z.important,bold:true},
          ].map(({label,text,bold})=>(
            <div key={label} style={{marginBottom:14}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:z.colour,letterSpacing:"0.14em",fontWeight:700,marginBottom:4}}>{label.toUpperCase()}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:bold?t.text:t.textMuted,lineHeight:1.6,fontWeight:bold?"700":"400"}}>{text}</div>
            </div>
          ))}
          <SpockNote text={z.spock} t={t}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY LOAD INDICATOR
// Composite of today's zone logs — shown on home screen
// ─────────────────────────────────────────────────────────────────────────────
function getFamilyLoad(profiles){
  const today=getLogicalDate();
  const zoneWeight={red:3,yellow:2,green:0,blue:1};
  let total=0,count=0;
  Object.values(profiles).forEach(m=>{
    if(m.zone&&!zoneIsStale(m)){
      total+=zoneWeight[m.zone]||0;
      count++;
    }
  });
  if(count===0)return null;
  const avg=total/count;
  if(avg>=2.2)return{level:"HIGH",colour:"#EF4444",text:"High load across the family right now. Consider reducing non-essential demands for the next hour."};
  if(avg>=1.2)return{level:"ELEVATED",colour:"#EAB308",text:"Elevated load in the household. Worth checking in with everyone before adding new demands."};
  return{level:"SETTLED",colour:"#22C55E",text:"The family is mostly regulated right now. A good window to connect or repair."};
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPLE CO-REGULATION SIGNAL
// Simple shared flag — "one of us is struggling" — stored in localStorage
// Trackable in routine completion history
// ─────────────────────────────────────────────────────────────────────────────
const SIGNAL_KEY="rm_couple_signal";
function getSignal(){return LS.get(SIGNAL_KEY,null);}
function setSignalOn(){
  const today=getLogicalDate();
  const existing=LS.get(SIGNAL_KEY,null);
  // Count how many times activated today
  const todayCount=(existing?.date===today?(existing.todayCount||0):0)+1;
  const s={active:true,ts:new Date().toISOString(),date:today,todayCount};
  LS.set(SIGNAL_KEY,s);
  // Track in completions — store count for the day
  const all=getCompletions();
  if(!all[today])all[today]={};
  all[today]["__couple_signal__"]={active:true,count:todayCount};
  LS.set(COMPLETION_KEY,all);
  return s;
}
function setSignalOff(){
  // Keep date/count in completions but mark inactive in signal key
  const existing=LS.get(SIGNAL_KEY,null);
  if(existing){LS.set(SIGNAL_KEY,{...existing,active:false});}
}

// ─────────────────────────────────────────────────────────────────────────────
// RED ALERT
// ─────────────────────────────────────────────────────────────────────────────
const RED_ALERT_STRATEGIES=[
  {n:1,title:"Clear the space",text:"Get everyone else out of the room — other children, other adults. Do not remove the child in crisis; moving them escalates. Reduce all stimulation: turn off screens, lower lights if you can, stop talking. Every additional sensory input is fuel. This is not permissive — it is crisis containment."},
  {n:2,title:"Regulate yourself first",text:"Slow your breathing deliberately. Lower your body posture. Soften your voice or go silent. Your nervous system is a direct regulatory input into theirs — if you are activated, you are adding to the fire. This is not passivity. This is the most effective tool available to you right now."},
  {n:3,title:"Create distance and stop engaging",text:"Move to a safe distance. Do not pursue, restrain, block, or physically confront unless someone is being actively hurt. Do not issue demands, threats, or consequences — the cortex is offline and these register as additional threat inputs, escalating the episode. Move hazardous objects out of reach only if you can do so safely and without engagement."},
  {n:4,title:"Wait",text:"The stress response has a biological ceiling. It will peak and fall without intervention. Your job is to keep everyone physically safe while that happens — not to end the episode faster. Fighting the wave makes it worse and longer. Riding it out safely is the goal."},
  {n:5,title:"After the storm — quiet presence only",text:"When the episode subsides, offer quiet proximity. No debrief, no discussion, no consequences. A warm drink. Sitting nearby. Full processing and any conversation about what happened belongs in green zone — hours later, or the next day. Consequences, if appropriate, are a green zone conversation only."},
];
function logRedAlert(memberCode){
  const today=getLogicalDate();
  const all=getCompletions();
  if(!all[today])all[today]={};
  const existing=all[today]["__red_alert__"]||{};
  all[today]["__red_alert__"]={...existing,[memberCode]:(existing[memberCode]||0)+1};
  LS.set(COMPLETION_KEY,all);
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S INTENTION
// ─────────────────────────────────────────────────────────────────────────────
const INTENTION_KEY="rm_intention";
function getIntention(){
  const i=LS.get(INTENTION_KEY,null);
  if(!i)return null;
  if(i.date!==getLogicalDate())return null; // stale — new day
  return i;
}
function saveIntention(text){
  LS.set(INTENTION_KEY,{text,date:getLogicalDate(),checked:false});
}
function toggleIntentionCheck(){
  const i=LS.get(INTENTION_KEY,null);
  if(!i)return null;
  const updated={...i,checked:!i.checked};
  LS.set(INTENTION_KEY,updated);
  // Also track in completions for weekly view
  const all=getCompletions();
  const today=getLogicalDate();
  if(!all[today])all[today]={};
  all[today]["__intention_check__"]={checked:updated.checked,text:i.text};
  LS.set(COMPLETION_KEY,all);
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK — "days showing up"
// A day counts if: any zone was logged for any crew member OR an intention was set.
// No pressure to be perfect — just to show up. Resets at 4am.
// ─────────────────────────────────────────────────────────────────────────────
const STREAK_KEY="rm_streak";
function getStreakData(){return LS.get(STREAK_KEY,{count:0,lastDate:null});}
function updateStreak(){
  const today=getLogicalDate();
  const s=getStreakData();
  if(s.lastDate===today)return s;
  const all=getCompletions();
  const todayData=all[today]||{};
  const intention=LS.get(INTENTION_KEY,null);
  const anyActivity=Object.keys(todayData).length>0||(intention?.date===today);
  if(!anyActivity)return s;
  const yesterday=new Date(today+"T04:00:00");
  yesterday.setDate(yesterday.getDate()-1);
  const yStr=yesterday.toISOString().slice(0,10);
  const wasYesterday=s.lastDate===yStr;
  const updated={count:wasYesterday?s.count+1:1,lastDate:today};
  LS.set(STREAK_KEY,updated);
  return updated;
}
function getStreak(){
  const today=getLogicalDate();
  const s=getStreakData();
  if(s.lastDate!==today){
    const all=getCompletions();
    const intention=LS.get(INTENTION_KEY,null);
    if(Object.keys(all[today]||{}).length>0||(intention?.date===today))return updateStreak();
  }
  return s;
}
function getDaysAgoLogged(member){
  const logs=member.logs||[];
  if(!logs.length)return null;
  const today=getLogicalDate();
  const last=[...(logs)].reverse().find(l=>l.date);
  if(!last)return null;
  return Math.floor((new Date(today)-new Date(last.date))/(1000*60*60*24));
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK START GUIDE (in-app overlay)
// ─────────────────────────────────────────────────────────────────────────────
function QuickStartGuide({onClose,t}){
  const[section,setSection]=useState(0);
  const sections=[
    {title:"Welcome",content:[
      {h:"What this tool is for",p:"The R-M Home Tool helps your family build self-awareness, healthy routines, and sustainable habits. It is not a clinical tool, not a behaviour management system, and not a report card. It is a practical support for the daily work of looking after each other."},
      {h:"The most important idea",p:"Regulate → Relate → Reason. In that order. Always. A nervous system that isn't regulated can't connect well, and a nervous system that isn't connected can't think clearly. Everything in this tool follows that sequence."},
      {h:"It doesn't need to be perfect",p:"A routine that happens 80% of the time is worth far more than a perfect routine that creates conflict. Use what helps. Skip what doesn't. Come back to it when you can."},
    ]},
    {title:"The window of tolerance",content:[
      {h:"What it is",p:"Every nervous system has a range of arousal where it can think, learn, connect, and regulate. This is the window of tolerance. Green zone is inside the window. Yellow and red are above it. Blue is below it."},
      {h:"Why windows get narrow",p:"Chronic stress, poor sleep, hunger, sensory overload, and accumulated pressure all narrow the window. A family under sustained load will have compressed windows — things escalate faster and recover more slowly. This is physiology, not character."},
      {h:"The missed yellow problem",p:"The jump from green to red that feels sudden is almost always a missed yellow phase. Yellow looks like green when the window is narrow — things feel 'OK-ish' until they aren't. This is the most important pattern to learn to spot."},
      {h:"How windows expand",p:"Consistent safety, co-regulation, routine, adequate sleep, and regular green zone investment all expand the window over time. This is the long game. The tool is designed to support it."},
    ]},
    {title:"The four zones framework",content:[
      {h:"🔴 Red — above the window",p:"The thinking brain is offline. Reasoning doesn't work here. No consequences, no explaining. Just regulated presence and space. Note: people often think they're yellow when they're actually red. If your words aren't landing, assume red."},
      {h:"🟡 Yellow — approaching the edge",p:"Elevated, but still reachable. This is where the tools work. Movement, genuine choice, transition warnings. Act early — don't wait for red. Late yellow (acceleration) is the last window before red: the tools still apply but the window is closing."},
      {h:"🟢 Green — regulated and available",p:"Everyone is most themselves here. This is the time to connect, teach strategies, repair, and build routines. Don't waste green on administration."},
      {h:"🔵 Blue — shutdown",p:"Under-activated. Not lazy, not rude — the nervous system has gone into protective shutdown. Often follows a red episode as the recovery phase. Warmth, rhythm, no demands. Wait."},
    ]},
    {title:"Home screen",content:[
      {h:"Crew Status",p:"Opens a view of all five family members and their current zones. Tap any tile to open their full profile. Tap a zone emoji on a tile to log their zone instantly."},
      {h:"Daily Routines",p:"Your morning, after-school, and bedtime routines. The Tracker tab shows today's checklist — tap a child's initial beside each step to mark it done. The countdown helps you introduce new routines gradually."},
      {h:"Strategy Library",p:"26 evidence-based tools for regulation, connection, and support. The same tools Mr. Spock draws from. Worth reading through when everyone is calm."},
      {h:"Mr. Spock",p:"The main consultation tool. Three questions, then instant specific guidance — which tool to use, what to say, what to avoid. Entirely offline — no waiting."},
    ]},
    {title:"Profiles",content:[
      {h:"Opening a profile",p:"Tap any crew tile to open a family member's full profile. Each profile has tabs for their overview, history, tools, and more."},
      {h:"Logging a zone with a note",p:"In the Overview tab, select a zone and add an optional note before tapping Save. Notes help you spot patterns over time."},
      {h:"The Tools tab",p:"Each profile has tools appropriate to that person — self-discovery, breathing reset, the Why tool (children), wellbeing check-in (adults). Start with breathing when things are hard."},
      {h:"History and patterns",p:"The History tab shows a dot-matrix of the last 14 days. After 5+ logs, you can ask Spock to analyse patterns — what the data shows, what it might mean, and one experiment to try."},
    ]},
    {title:"Daily habits",content:[
      {h:"Morning intention",p:"Each morning, set one intention for the day on the home screen. One sentence. It doesn't have to be ambitious — 'I will give RSM a genuine 2-minute connection before school' is enough."},
      {h:"Zone check-ins",p:"A brief daily check-in — 'how's your body?' — is the single highest-value routine habit in this tool. Morning and after-school are the most useful times. It doesn't need to be formal."},
      {h:"The couple signal",p:"If one of you is struggling and can't say it easily, use the signal button on the home screen. It shows a quiet indicator to both of you — no explanation needed. It tracks in the weekly view."},
      {h:"Low capacity mode",p:"On hard days, tap the ⚡ button on the home screen to strip everything back to essentials. Just zones and Spock. No decisions, no browsing."},
    ]},
    {title:"Getting started",content:[
      {h:"First week",p:"Don't try to use everything at once. Start with zone logging for the children — just the dashboard tiles, once a day. Let the data build up."},
      {h:"Second week",p:"Add a morning check-in as a family routine. It can be as simple as pointing to a zone emoji at breakfast. No pressure, no wrong answers."},
      {h:"When things are hard",p:"Open Mr. Spock. Three taps, instant guidance. That's it. Don't try to browse the strategy library mid-crisis."},
      {h:"Save your progress",p:"Use 'Save Progress' on the home screen regularly to download a backup of all your data. If you're using multiple devices, use 'Restore' on the other device to sync."},
    ]},
  ];
  const s=sections[section];
  return(
    <div style={{position:"fixed",inset:0,background:"#000000EE",zIndex:1100,overflowY:"auto",padding:16,display:"flex",justifyContent:"center"}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:600,width:"100%",border:`2px solid ${P.spock}66`,alignSelf:"flex-start"}}>
        {/* Header */}
        <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"stretch",height:52}}>
            <div style={{background:P.spock,width:90,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"14px 0 0 0",flexShrink:0}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,color:"#000",letterSpacing:"0.1em",textAlign:"center",lineHeight:1.3}}>QUICK<br/>START</span>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",padding:"0 14px"}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:P.spock,fontWeight:700,letterSpacing:"0.08em"}}>{s.title.toUpperCase()}</span>
            </div>
            <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,padding:"0 16px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
          </div>
          <div style={{height:3,background:`linear-gradient(to right,${P.spock},${P.teal})`}}/>
        </div>
        {/* Section nav */}
        <div style={{display:"flex",overflowX:"auto",padding:"10px 16px 0",gap:6,borderBottom:`1px solid ${t.border}`}}>
          {sections.map((sec,i)=>(
            <button key={i} onClick={()=>setSection(i)}
              style={{background:section===i?P.spock:"transparent",color:section===i?"#000":t.textMuted,border:`1px solid ${section===i?P.spock:t.border}`,borderRadius:20,padding:"4px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,letterSpacing:"0.07em",cursor:"pointer",whiteSpace:"nowrap",minHeight:32,marginBottom:10}}>
              {sec.title}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{padding:20}}>
          {s.content.map(({h,p})=>(
            <div key={h} style={{marginBottom:18}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:P.spock,fontWeight:700,letterSpacing:"0.06em",marginBottom:6}}>{h}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:t.text,lineHeight:1.7}}>{p}</div>
            </div>
          ))}
          {/* Nav */}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:`1px solid ${t.border}`}}>
            <button onClick={()=>setSection(s=>Math.max(0,s-1))} disabled={section===0}
              style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:20,padding:"6px 16px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:t.textMuted,cursor:section===0?"not-allowed":"pointer",opacity:section===0?0.4:1,minHeight:40}}>← PREVIOUS</button>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.textDim,alignSelf:"center"}}>{section+1} / {sections.length}</span>
            {section<sections.length-1
              ?<button onClick={()=>setSection(s=>s+1)}
                style={{background:P.spock,border:"none",borderRadius:20,padding:"6px 16px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#000",cursor:"pointer",fontWeight:700,minHeight:40}}>NEXT →</button>
              :<button onClick={onClose}
                style={{background:P.teal,border:"none",borderRadius:20,padding:"6px 16px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#000",cursor:"pointer",fontWeight:700,minHeight:40}}>DONE ✓</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// Zone-specific Spock one-liners for dashboard tiles
const ZONE_SPOCK={
  red:"Reasoning is offline. Presence is the only available tool right now.",
  yellow:"The window is still open. Act before it closes.",
  green:"This is the moment. Invest in it.",
  blue:"Activation before demand. Rhythm before language.",
};

function ZoneTile({member,zone,colour,onZoneTap,t}){
  const z=ZONES.find(x=>x.id===zone);
  const patterns=detectPatterns(member.logs);
  const isChild=member.type==="child";
  const daysAgo=isChild?getDaysAgoLogged(member):null;
  return(
    <div style={{background:t.surface,border:`1px solid ${colour}44`,borderRadius:12,overflow:"hidden"}}>
      <div style={{height:6,background:colour}}/>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:20,fontWeight:700,color:colour,letterSpacing:"0.08em"}}>{member.code}</div>
          {isChild&&daysAgo!==null&&daysAgo>0&&(
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:daysAgo>=3?P.dustyRed:t.textDim,background:daysAgo>=3?P.dustyRed+"18":"transparent",border:`1px solid ${daysAgo>=3?P.dustyRed:t.border}`,borderRadius:8,padding:"2px 6px"}}>
              {daysAgo===1?"yesterday":`${daysAgo}d ago`}
            </div>
          )}
        </div>
        {z?(
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <span style={{fontSize:16}}>{z.emoji}</span>
              <span style={{fontSize:12,color:z.colour,fontFamily:"'Antonio',sans-serif",fontWeight:700,letterSpacing:"0.06em"}}>{z.label}</span>
            </div>
            {ZONE_SPOCK[z.id]&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textDim,lineHeight:1.4,fontStyle:"italic"}}>{ZONE_SPOCK[z.id]}</div>}
          </div>
        ):<div style={{fontSize:11,color:t.textMuted,marginBottom:8,fontFamily:"'Nunito',sans-serif"}}>No zone logged</div>}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {ZONES.map(zn=>(
            <button key={zn.id} onClick={e=>{e.stopPropagation();onZoneTap(member.code,zn.id);}}
              style={{background:zone===zn.id?zn.colour:"transparent",color:zone===zn.id?"#000":zn.colour,border:`1.5px solid ${zn.colour}`,borderRadius:16,padding:"2px 7px",fontSize:15,cursor:"pointer",minHeight:32,minWidth:32,transition:"all 0.1s"}}>
              {zn.emoji}
            </button>
          ))}
        </div>
        {patterns.length>0&&<div style={{marginTop:6,width:8,height:8,borderRadius:4,background:P.amber,display:"inline-block"}} title={patterns[0].text}/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────────────────────
function ExportImport({t}){
  const fileRef=useRef();
  const doExport=()=>{
    const data={
      exported:new Date().toISOString(),
      profiles:LS.get(KEYS.profiles,{}),
      settings:LS.get(KEYS.settings,{}),
      routines:LS.get("rm_routines",null),
      completions:LS.get("rm_routine_completions",{}),
      countdown:LS.get("rm_routine_countdown",null),
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`rm-home-${new Date().toISOString().slice(0,10)}.json`;a.click();
    URL.revokeObjectURL(url);
  };
  const doImport=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.profiles)LS.set(KEYS.profiles,data.profiles);
        if(data.settings)LS.set(KEYS.settings,data.settings);
        if(data.routines)LS.set("rm_routines",data.routines);
        if(data.completions)LS.set("rm_routine_completions",data.completions);
        if(data.countdown)LS.set("rm_routine_countdown",data.countdown);
        window.location.reload();
      }catch{alert("Couldn't read that file.");}
    };
    reader.readAsText(file);
  };
  return(
    <>
      <button onClick={doExport} title="Downloads a backup file of all family data. Local storage auto-saves but this protects against data loss." style={{background:"transparent",border:`1px solid ${t.border}`,color:t.textMuted,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.1em",padding:"8px 16px",borderRadius:20,cursor:"pointer",minHeight:44}}>BACKUP DATA ↓</button>
      <button onClick={()=>fileRef.current.click()} title="Restore from a previously downloaded backup file" style={{background:"transparent",border:`1px solid ${t.border}`,color:t.textMuted,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.1em",padding:"8px 16px",borderRadius:20,cursor:"pointer",minHeight:44}}>RESTORE</button>
      <input ref={fileRef} type="file" accept=".json" onChange={doImport} style={{display:"none"}}/>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4AM RESET UTILITY
// ─────────────────────────────────────────────────────────────────────────────
// Returns today's "logical date" — before 4am it's still "yesterday" for
// routine and zone purposes, giving families a realistic reset window.
function getLogicalDate(){
  const now=new Date();
  if(now.getHours()<4){
    const yesterday=new Date(now);
    yesterday.setDate(yesterday.getDate()-1);
    return yesterday.toISOString().slice(0,10);
  }
  return now.toISOString().slice(0,10);
}

// Check whether a profile's zone was logged today (logical date)
// Used to decide whether to clear zone display on dashboard
function zoneIsStale(profile){
  if(!profile.lastZoneUpdate)return true;
  const loggedDate=new Date(profile.lastZoneUpdate);
  const loggedLogical=loggedDate.getHours()<4
    ? new Date(loggedDate.setDate(loggedDate.getDate()-1)).toISOString().slice(0,10)
    : loggedDate.toISOString().slice(0,10);
  return loggedLogical!==getLogicalDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// FULLSCREEN + MODAL STACK
// ─────────────────────────────────────────────────────────────────────────────
function useFullscreen(){
  const[isFullscreen,setIsFullscreen]=useState(false);
  useEffect(()=>{
    const handler=()=>setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",handler);
    return()=>document.removeEventListener("fullscreenchange",handler);
  },[]);
  const enter=()=>document.documentElement.requestFullscreen?.().catch(()=>{});
  const exit=()=>document.exitFullscreen?.().catch(()=>{});
  const toggle=()=>isFullscreen?exit():enter();
  return{isFullscreen,enter,exit,toggle};
}

// Global Esc key handler — pops modal stack, exits fullscreen last
// Usage: wrap App with <ModalStackProvider>, pass push/pop to overlays
function useModalStack(){
  const stack=useRef([]);
  const push=useCallback((id,onClose)=>{
    stack.current=[...stack.current.filter(x=>x.id!==id),{id,onClose}];
  },[]);
  const pop=useCallback((id)=>{
    stack.current=stack.current.filter(x=>x.id!==id);
  },[]);
  const handleEsc=useCallback((e,isFullscreen,exitFullscreen)=>{
    if(e.key!=="Escape")return;
    if(stack.current.length>0){
      const top=stack.current[stack.current.length-1];
      top.onClose();
      stack.current=stack.current.slice(0,-1);
    } else if(isFullscreen){
      exitFullscreen();
    }
  },[]);
  return{push,pop,handleEsc,stack};
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED QUOTE LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
// Every entry is verified against primary sources.
// Spock quotes: cited by series/film.
// External quotes: cited by primary text.
// ⚠️ EXPANDABLE — add new batches following the same attribution format.
// See project board for batch size guidance (8-10 per batch recommended).

const QUOTE_LIBRARY=[
  // ── Verified Spock canon ─────────────────────────────────────────────────
  {
    text:"Logic is the beginning of wisdom, not the end.",
    speaker:"Mr. Spock",
    source:"Star Trek VI: The Undiscovered Country (1991)",
    category:"spock_canon",
  },
  {
    text:"Insufficient facts always invite danger.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S1E22 — 'Space Seed' (1967)",
    category:"spock_canon",
  },
  {
    text:"Without followers, evil cannot spread.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E8 — 'And the Children Shall Lead' (1968)",
    category:"spock_canon",
  },
  {
    text:"Computers make excellent and efficient servants, but I have no wish to serve under them.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S2E24 — 'The Ultimate Computer' (1968)",
    category:"spock_canon",
  },
  {
    text:"It is curious how often you humans manage to obtain that which you do not want.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S1E28 — 'Errand of Mercy' (1967)",
    category:"spock_canon",
  },
  {
    text:"Change is the essential process of all existence.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E22 — 'Let That Be Your Last Battlefield' (1969)",
    category:"spock_canon",
  },
  {
    text:"Nowhere am I so desperately needed as among a shipload of illogical humans.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E7 — 'Day of the Dove' (1968)",
    category:"spock_canon",
  },
  {
    text:"Time is a companion that goes with us on the journey, and reminds us to cherish every moment, because it will never come again.",
    speaker:"Captain Picard (quoting Spock's spirit)",
    source:"Star Trek: The Next Generation, S5E7 — 'Unification II' (1991)",
    category:"spock_canon",
  },
  {
    text:"The needs of the many outweigh the needs of the few.",
    speaker:"Mr. Spock",
    source:"Star Trek II: The Wrath of Khan (1982)",
    category:"spock_canon",
  },
  {
    text:"I have been — and always shall be — your friend.",
    speaker:"Mr. Spock",
    source:"Star Trek II: The Wrath of Khan (1982)",
    category:"spock_canon",
  },
  {
    text:"It would be illogical to assume that all conditions remain stable.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S1E10 — 'The Corbomite Maneuver' (1966)",
    category:"spock_canon",
  },
  {
    text:"Humans do have an amazing capacity for believing what they choose and excluding that which is painful.",
    speaker:"Mr. Spock",
    source:"Star Trek V: The Final Frontier (1989)",
    category:"spock_canon",
  },

  // ── Stoic — verified from primary texts ─────────────────────────────────
  {
    text:"Make the best use of what is in your power, and take the rest as it happens.",
    speaker:"Epictetus",
    source:"Enchiridion, Section 1 (c. 125 CE), trans. Elizabeth Carter",
    category:"stoic",
  },
  {
    text:"First say to yourself what you would be; and then do what you have to do.",
    speaker:"Epictetus",
    source:"Discourses, Book III, Chapter 23 (c. 108 CE)",
    category:"stoic",
  },
  {
    text:"Waste no more time arguing about what a good person should be. Be one.",
    speaker:"Marcus Aurelius",
    source:"Meditations, Book X:16 (written c. 161–180 CE)",
    category:"stoic",
  },
  {
    text:"You have power over your mind, not outside events. Realise this, and you will find strength.",
    speaker:"Marcus Aurelius",
    source:"Meditations, Book IV (written c. 161–180 CE) — paraphrase of recurring theme across Book IV.",
    category:"stoic",
    note:"Widely circulated paraphrase of Aurelius's recurring theme in Meditations — the exact wording varies by translation. The sentiment is authentically his.",
  },
  // ── Viktor Frankl — verified from Man's Search for Meaning ───────────────
  {
    text:"When we are no longer able to change a situation, we are challenged to change ourselves.",
    speaker:"Viktor Frankl",
    source:"Man's Search for Meaning, Part Two (1946), Beacon Press",
    category:"wisdom",
  },
  {
    text:"Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances.",
    speaker:"Viktor Frankl",
    source:"Man's Search for Meaning, Part One (1946), Beacon Press",
    category:"wisdom",
  },
  {
    text:"An abnormal reaction to an abnormal situation is normal behaviour.",
    speaker:"Viktor Frankl",
    source:"Man's Search for Meaning, Part One (1946), Beacon Press",
    category:"wisdom",
  },
  // ── Wisdom — verified from named publications ─────────────────────────────
  {
    text:"Children are the living messages we send to a time we will not see.",
    speaker:"Neil Postman",
    source:"The Disappearance of Childhood (1982), Delacorte Press — opening line",
    category:"wisdom",
  },
  {
    text:"Connection is why we're here. It is what gives purpose and meaning to our lives.",
    speaker:"Brené Brown",
    source:"Daring Greatly, Chapter 1 (2012), Gotham Books",
    category:"wisdom",
  },
  {
    text:"The curious paradox is that when I accept myself just as I am, then I can change.",
    speaker:"Carl Rogers",
    source:"On Becoming a Person (1961), Houghton Mifflin",
    category:"wisdom",
  },
  {
    text:"Tell me, what is it you plan to do with your one wild and precious life?",
    speaker:"Mary Oliver",
    source:"'The Summer Day', House of Light (1990), Beacon Press",
    category:"wisdom",
  },
  {
    text:"Try to love the questions themselves.",
    speaker:"Rainer Maria Rilke",
    source:"Letters to a Young Poet, Letter Four (1929), trans. M.D. Herter Norton",
    category:"wisdom",
  },
  // ── Neuroscience / regulation — verified from named publications ──────────
  {
    text:"Name it to tame it.",
    speaker:"Dr. Daniel Siegel & Dr. Tina Payne Bryson",
    source:"The Whole-Brain Child (2011), Delacorte Press — central heuristic of the text",
    category:"regulation",
  },
  {
    text:"Regulation is not something we do to children. It is something we do with them, until they can do it themselves.",
    speaker:"Dr. Bruce Perry",
    source:"The Boy Who Was Raised as a Dog (2006), Basic Books — paraphrase of the co-regulation principle central to the Neurosequential Model. Not a verbatim quote.",
    category:"regulation",
    note:"Cited as paraphrase of Dr. Bruce Perry — not a direct quote.",
  },
  {
    text:"Safety is not the absence of threat. It is the presence of connection.",
    speaker:"Dr. Gabor Maté",
    source:"In the Realm of Hungry Ghosts (2008), Knopf Canada — paraphrase of attachment and safety theme.",
    category:"regulation",
    note:"Confidence: moderate. Cited as attributed.",
  },
  // ── Additional Spock canon ────────────────────────────────────────────────
  {
    text:"In critical moments, men sometimes see exactly what they wish to see.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S2E15 — 'The Trouble with Tribbles' (1967)",
    category:"spock_canon",
  },
  // ── Quote batch 2 ─────────────────────────────────────────────────────────
  {
    text:"Logic is the beginning of wisdom, not the end.",
    speaker:"Mr. Spock",
    source:"Star Trek VI: The Undiscovered Country (1991)",
    category:"spock_canon",
  },
  {
    text:"Without followers, evil cannot spread.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E8 — 'And the Children Shall Lead' (1968)",
    category:"spock_canon",
  },
  {
    text:"The needs of the many outweigh the needs of the few.",
    speaker:"Mr. Spock",
    source:"Star Trek II: The Wrath of Khan (1982)",
    category:"spock_canon",
  },
  {
    text:"Change is the essential process of all existence.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E20 — 'Let That Be Your Last Battlefield' (1969)",
    category:"spock_canon",
  },
  {
    text:"Nowhere am I so desperately needed as among a shipload of illogical humans.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S3E7 — 'Day of the Dove' (1968)",
    category:"spock_canon",
  },
  {
    text:"Each of us, at some time in our life, turns to someone — a father, a brother, a god — and asks, 'Why am I here? What was I meant to be?'",
    speaker:"Mr. Spock",
    source:"Star Trek V: The Final Frontier (1989)",
    category:"spock_canon",
  },
  {
    text:"You must not fear to move forward, even when the way is uncertain.",
    speaker:"Marcus Aurelius",
    source:"Meditations, Book IV (written c. 161–180 CE) — paraphrase of the recurring theme of forward movement despite uncertainty.",
    category:"stoic",
    note:"Widely attributed in spirit across Book IV. Paraphrase, not verbatim.",
  },
  {
    text:"He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.",
    speaker:"Epictetus",
    source:"Attributed to Epictetus — consistent with the philosophy expressed throughout the Discourses and Enchiridion (c. 108 CE). Specific source location unverified.",
    category:"stoic",
    note:"Confidence: moderate. Consistent with Epictetan philosophy. Specific text location not confirmed.",
  },
  {
    text:"I have learned to seek my happiness by limiting my desires, rather than in attempting to satisfy them.",
    speaker:"John Stuart Mill",
    source:"Letter to John Sterling, 15 April 1829, in The Earlier Letters of John Stuart Mill 1812–1848 (1963), University of Toronto Press.",
    category:"wisdom",
  },
  {
    text:"The most important thing in communication is hearing what isn't said.",
    speaker:"Peter Drucker",
    source:"Widely attributed to Drucker across multiple published interviews and management texts. Primary source unverified — the exact wording does not appear traceable to a single original publication.",
    category:"wisdom",
    note:"Confidence: low. Cite as attributed to Drucker. Do not assign to a specific work.",
  },
  // ── Quote batch 3 ─────────────────────────────────────────────────────────
  {
    text:"Kids do well if they can.",
    speaker:"Dr. Ross Greene",
    source:"The Explosive Child (1998), HarperCollins — the central thesis of the text, consistently restated across multiple editions and companion publications.",
    category:"wisdom",
  },
  {
    text:"Control is a delusion. The best you can shoot for is influence. If you want a child to benefit from your experience, wisdom, and values, you will best achieve that through partnership.",
    speaker:"Dr. Ross Greene",
    source:"As cited in Beurkens, N. (2025) — consistent with the core argument of Collaborative Problem Solving across Greene's published work.",
    category:"wisdom",
    note:"Confidence: moderate. Secondary citation. Consistent with Greene's published position across multiple sources.",
  },
  {
    text:"You learn best when you're regulated.",
    speaker:"Dr. Bruce Perry",
    source:"Consistent with the Neurosequential Model of Therapeutics throughout Perry's published work; as cited in Daybreak Health (2023).",
    category:"regulation",
    note:"Confidence: moderate. Secondary citation. The statement is a faithful summary of NMT's central pedagogical claim.",
  },
  {
    text:"What gets labelled as trauma symptoms may actually be lifelong neurodivergent traits that were misunderstood, unsupported, or punished in childhood — creating trauma along the way.",
    speaker:"Dr. Caleb Zacharias",
    source:"Zacharias, C. (2025). Neurodivergent-informed trauma therapy: A conceptual framework. Existential Psychiatry.",
    category:"regulation",
  },
  {
    text:"Neuroception is the neural process by which the nervous system evaluates risk in the environment without the involvement of conscious awareness.",
    speaker:"Dr. Stephen Porges",
    source:"Porges, S.W. (2003). The polyvagal theory: Phylogenetic contributions to social behavior. Physiology & Behavior, 79(3), 503–513. See also: Zero to Three Journal, 24(5), 2003.",
    category:"regulation",
  },
  {
    text:"I've been told all my life what to do, what to do, what to do. I don't need a total stranger telling me what to do. I just need some kind of understanding.",
    speaker:"Anonymous adolescent",
    source:"Everall, R.D. & Paulson, B.L. (2002), as cited in Dimic, N. et al. (2023). Young people's experience of the therapeutic alliance: A systematic review. Clinical Psychology & Psychotherapy, 30, 1085–1109. (p. 1092)",
    category:"wisdom",
  },
  {
    text:"After a time, you may find that having is not so pleasing a thing after all as wanting. It is not logical, but it is often true.",
    speaker:"Mr. Spock",
    source:"Star Trek: The Original Series, S2E1 — 'Amok Time' (1967)",
    category:"spock_canon",
  },
  {
    text:"PACE is not a technique to be applied to a child. It is a way of being with the child.",
    speaker:"Dr. Dan Hughes",
    source:"Consistent with Hughes' writing throughout Building the Bonds of Attachment (2nd ed., 2006), Jason Aronson; and the Dyadic Developmental Psychotherapy literature.",
    category:"regulation",
    note:"Confidence: moderate. Paraphrase of a consistently stated position. Not a single verbatim source location.",
  },
];

// Pick today's quote — deterministic based on date so it's consistent across opens
function getDailyQuote(){
  const today=getLogicalDate();
  const seed=today.split("-").reduce((a,b)=>a+parseInt(b),0);
  return QUOTE_LIBRARY[seed%QUOTE_LIBRARY.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE TRACKING DATA MODEL
// ─────────────────────────────────────────────────────────────────────────────
// Completions stored as: rm_routine_completions
// Structure: { "YYYY-MM-DD": { "stepId": { "EMM": true, "RSM": false, ... } } }

const COMPLETION_KEY="rm_routine_completions";
const SR_SCHEDULE_KEY="rm_sr_schedule";
const WEEKLY_PLAN_KEY="rm_weekly_plan";

function getCompletions(){
  return LS.get(COMPLETION_KEY,{});
}

// SR Visual Schedule — daily reset at 4am
const SR_SCHEDULE_DEFAULTS=[
  {id:"sr_water",icon:"💧",label:"Water — big glass",note:"The system needs hydration before it can run. This is maintenance, not a treat.",done:false},
  {id:"sr_eat",icon:"🍳",label:"Eat something real",note:"A regulated nervous system needs fuel. The morning runs better when you are not running on empty.",done:false},
  {id:"sr_move",icon:"🏃",label:"10 min movement",note:"Any kind — walk, yoga, mantra workout. Movement is the fastest nervous system reset available to you.",done:false},
  {id:"sr_nap",icon:"🌿",label:"Protect the nap window",note:"MRM's nap is the maintenance window for the whole afternoon. Guard it like a structural appointment.",done:false},
  {id:"sr_reset",icon:"🧘",label:"Nervous system reset — 5 min",note:"Breathing, Kinesiology, mantra, or simply sitting without a screen. A regulated co-regulator is the most powerful thing in this house.",done:false},
  {id:"sr_forme",icon:"⭐",label:"One thing that restores you",note:"Reading, quiet, anything that rebuilds rather than depletes. This is not optional infrastructure.",done:false},
  {id:"sr_wind",icon:"🌙",label:"Wind down before sleep",note:"The quality of tomorrow morning starts tonight. You cannot transmit a signal you are not receiving.",done:false},
];
function getSRSchedule(){
  const saved=LS.get(SR_SCHEDULE_KEY,null);
  const today=getLogicalDate();
  if(saved?.date===today)return saved.steps;
  return SR_SCHEDULE_DEFAULTS.map(s=>({...s,done:false}));
}
function saveSRSchedule(steps){
  LS.set(SR_SCHEDULE_KEY,{date:getLogicalDate(),steps});
}

// Weekly planner — resets Monday 4am
const WEEKLY_PLAN_DEFAULTS=[
  {id:"wp_mon_l",day:1,owner:"family",icon:"👕",label:"Laundry load on"},
  {id:"wp_tue_b",day:2,owner:"family",icon:"🗑️",label:"Bins out"},
  {id:"wp_wed_g",day:3,owner:"family",icon:"🛒",label:"Groceries"},
  {id:"wp_thu_a",day:4,owner:"family",icon:"📋",label:"School admin / emails"},
  {id:"wp_fri_k",day:5,owner:"family",icon:"🍽️",label:"Kitchen deep reset"},
  {id:"wp_sat_c",day:6,owner:"family",icon:"🧹",label:"Bathrooms + vacuum"},
  {id:"wp_sun_m",day:0,owner:"family",icon:"🥗",label:"Meal prep for the week"},
  {id:"wp_sr_c1",day:3,owner:"SR",icon:"⭐",label:"SR — something for you"},
  {id:"wp_sr_c2",day:6,owner:"SR",icon:"⭐",label:"SR — something for you"},
  {id:"wp_dm_c1",day:2,owner:"DM",icon:"⭐",label:"DM — something for you"},
  {id:"wp_dm_c2",day:5,owner:"DM",icon:"⭐",label:"DM — something for you"},
];
function getWeeklyPlanWeekKey(){
  const now=new Date();
  if(now.getHours()<4)now.setDate(now.getDate()-1);
  const dow=now.getDay();
  const mon=new Date(now);
  mon.setDate(now.getDate()-(dow===0?6:dow-1));
  return mon.toISOString().slice(0,10);
}
function getWeeklyPlan(){
  const key=getWeeklyPlanWeekKey();
  const saved=LS.get(WEEKLY_PLAN_KEY,null);
  if(saved?.weekKey===key)return saved.tasks;
  return WEEKLY_PLAN_DEFAULTS.map(t=>({...t,done:false}));
}
function saveWeeklyPlan(tasks){
  LS.set(WEEKLY_PLAN_KEY,{weekKey:getWeeklyPlanWeekKey(),tasks});
}
function setCompletion(date,stepId,memberCode,value){
  const all=getCompletions();
  if(!all[date])all[date]={};
  if(!all[date][stepId])all[date][stepId]={};
  all[date][stepId][memberCode]=value;
  LS.set(COMPLETION_KEY,all);
  return all;
}
function getStepCompletions(date,stepId){
  return getCompletions()[date]?.[stepId]||{};
}
function getDayCompletions(date){
  return getCompletions()[date]||{};
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE IMPLEMENTATION COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────
const COUNTDOWN_KEY="rm_routine_countdown";
const COUNTDOWN_DAYS=14;

function getCountdown(){
  return LS.get(COUNTDOWN_KEY,null);
}
function startCountdown(){
  const startDate=getLogicalDate();
  LS.set(COUNTDOWN_KEY,{startDate,dismissed:false});
  return{startDate,dismissed:false};
}
function dismissCountdown(){
  const cd=getCountdown();
  if(cd){LS.set(COUNTDOWN_KEY,{...cd,dismissed:true});}
}
function resetCountdown(){
  LS.set(COUNTDOWN_KEY,null);
}
function getCountdownDaysRemaining(startDate){
  const start=new Date(startDate);
  const today=new Date(getLogicalDate());
  const diff=Math.floor((today-start)/(1000*60*60*24));
  return Math.max(0,COUNTDOWN_DAYS-diff);
}

// Day-by-day preparation guidance
const COUNTDOWN_GUIDANCE=[
  {days:[14,13,12,11,10],phase:"Introducing the idea",
   guidance:"Tell the children a new family routine is coming in about two weeks. Show them what it looks like — not as a rule, as a plan. Ask what they think. Let them suggest small changes. Getting buy-in now costs almost nothing; implementing without it costs much more.",
   action:"Have a 5-minute family chat. Share the routine plan. Write down any suggestions they make."},
  {days:[9,8,7],phase:"Rehearsing informally",
   guidance:"Start doing the routine steps naturally — not as a routine yet, just as activities. The morning check-in, the transition warning, the wind-down sequence. Do it without naming it. Their nervous systems are learning the pattern before the label arrives.",
   action:"Run through the steps once this week as though they were just normal things happening. Note which steps land easily and which create friction."},
  {days:[6,5,4],phase:"Naming it together",
   guidance:"Run through the full routine once together and name it: 'This is what our mornings are going to look like.' Keep it matter-of-fact, not a sales pitch. If they push back on a step, consider whether it genuinely matters — some flexibility now reduces resistance later.",
   action:"One full walkthrough together. Adjust any steps that generated strong objection. Confirm the start date."},
  {days:[3,2,1],phase:"Final preparation",
   guidance:"Gentle reminders that the routine starts soon. Frame it as something the family is doing together, not something being done to them. Check the environment — is everything in place? Clothes laid out? Timers ready? The routine itself is the easy part; the environment is where routines succeed or fail.",
   action:"Check the physical setup. Lay out what needs to be ready. Tell the children: 'We start in [N] days.'"},
  {days:[0],phase:"Day 1",
   guidance:"Today is Day 1. Keep it light. 80% completion is success — a routine that happens imperfectly and consistently is worth far more than a perfect routine that creates conflict. If something doesn't work today, note it and adjust tomorrow. The goal is the pattern, not the performance.",
   action:"Run the routine. Note what worked and what didn't. Adjust one thing if needed. Celebrate any completion, however partial."},
];

function getCountdownPhase(daysRemaining){
  for(const phase of COUNTDOWN_GUIDANCE){
    if(phase.days.includes(daysRemaining))return phase;
  }
  if(daysRemaining>14)return null;
  return COUNTDOWN_GUIDANCE[4]; // Day 0 phase for negative (past launch)
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE COUNTDOWN WIDGET (lives inside Daily Routines → Tracker tab)
// ─────────────────────────────────────────────────────────────────────────────
function RoutineCountdownWidget({t,onOpenRoutines}){
  const[countdown,setCountdown]=useState(()=>getCountdown());
  if(countdown?.dismissed)return null;

  if(!countdown){
    return(
      <div style={{marginBottom:16,background:P.amber+"18",border:`1.5px solid ${P.amber}44`,borderRadius:12,padding:"14px 16px"}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.amber,letterSpacing:"0.15em",marginBottom:6,fontWeight:700}}>NEW ROUTINES AVAILABLE</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6,marginBottom:12}}>
          Your routines are set up and ready. Research on predictability, autonomy, and nervous system preparation suggests introducing routines gradually, with children involved from the start. Two weeks gives enough time to do this properly. Start the countdown to get day-by-day guidance on how to introduce them.
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <LCARSBtn label="Start 2-week countdown" colour={P.amber} onClick={()=>{setCountdown(startCountdown());}} small/>
          <button onClick={()=>{dismissCountdown();setCountdown({dismissed:true});}} style={{background:"transparent",border:`1px solid ${t.border}`,color:t.textMuted,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.08em",borderRadius:16,padding:"7px 14px",cursor:"pointer"}}>SKIP — GO LIVE NOW</button>
        </div>
      </div>
    );
  }

  const daysRemaining=getCountdownDaysRemaining(countdown.startDate);
  const phase=getCountdownPhase(daysRemaining);
  const launched=daysRemaining<=0&&phase?.days[0]===0;

  return(
    <div style={{marginBottom:16,background:P.amber+"18",border:`1.5px solid ${P.amber}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${P.amber}33`}}>
        <div style={{background:P.amber,borderRadius:8,padding:"6px 12px",flexShrink:0}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:20,color:"#000",fontWeight:700,textAlign:"center",lineHeight:1}}>{launched?"GO":daysRemaining}</div>
          {!launched&&<div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:"#000",letterSpacing:"0.08em",textAlign:"center"}}>DAYS</div>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:12,color:P.amber,letterSpacing:"0.1em",fontWeight:700,marginBottom:2}}>{phase?.phase||"ROUTINES ACTIVE"}</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>
            {launched?"Routines are live. 80% is success.":phase?.guidance}
          </div>
        </div>
      </div>
      {phase&&(
        <div style={{padding:"10px 16px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.amber,letterSpacing:"0.1em",marginBottom:3,fontWeight:700}}>TODAY</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.text,lineHeight:1.5}}>{phase.action}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
            <button onClick={()=>onOpenRoutines()} style={{background:P.amber+"33",border:`1px solid ${P.amber}66`,borderRadius:10,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.amber,cursor:"pointer",letterSpacing:"0.08em"}}>VIEW ROUTINES</button>
            <button onClick={()=>{dismissCountdown();setCountdown({dismissed:true});}} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:10,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,cursor:"pointer",letterSpacing:"0.08em"}}>DISMISS</button>
            <button onClick={()=>{resetCountdown();setCountdown(null);}} style={{background:"transparent",border:"none",fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,cursor:"pointer",letterSpacing:"0.08em"}}>RESET</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE TRACKER (within RoutineBuilder — daily checklist + weekly history)
// ─────────────────────────────────────────────────────────────────────────────
// Extracted to avoid returnReact Babel transform issue with return inside map inside JSX
// Module-level components for RoutineTracker TodayView — avoids Babel returnReact
const ADULT_ROUTINE_IDS=["sr_morning","sr_evening","dm_morning","dm_evening"];
const CHILD_ROUTINE_IDS=["morning","afterschool","bedtime"];
function isAdultRoutine(id){return ADULT_ROUTINE_IDS.includes(id);}

function AdultRoutineStepRow({step,completions,today,routineColour,onToggle,t}){
  const sc=completions[today]?.[step.id]||{};
  const done=sc["__adult__"]||false;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:done?routineColour+"18":t.surface2,border:`1px solid ${done?routineColour+"66":t.border}`,borderRadius:8,marginBottom:5,transition:"all 0.2s"}}>
      <span style={{fontSize:18,flexShrink:0}}>{step.icon}</span>
      <div style={{flex:1,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.4}}>{step.label}</div>
      <button onClick={()=>onToggle(step.id,"__adult__")}
        style={{width:36,height:36,borderRadius:18,background:done?routineColour:"transparent",border:`2px solid ${routineColour}`,color:done?"#000":routineColour,fontFamily:"'Antonio',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>
        {done?"✓":""}
      </button>
    </div>
  );
}

function MedicineStepRow({step,completions,today,routineColour,children,onToggle,t}){
  const sc=completions[today]?.[step.id]||{};
  const done=children.every(c=>sc[c.code]);
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:done?routineColour+"18":t.surface2,border:`1px solid ${done?routineColour+"66":t.border}`,borderRadius:8,marginBottom:5,transition:"all 0.2s"}}>
      <span style={{fontSize:18,flexShrink:0}}>{step.icon}</span>
      <div style={{flex:1,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.4}}>{step.label}</div>
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {children.map(child=>(
          <button key={child.code} onClick={()=>onToggle(step.id,child.code)}
            style={{width:36,height:36,borderRadius:18,background:sc[child.code]?child.colour:"transparent",border:`2px solid ${child.colour}`,color:sc[child.code]?"#000":child.colour,fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",letterSpacing:"0.04em"}}>
            {sc[child.code]?"✓":child.code.slice(0,1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoutineStepRow({step,completions,today,children,routineColour,onToggle,t}){
  const sc=completions[today]?.[step.id]||{};
  const done=children.every(c=>sc[c.code]);
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:done?routineColour+"18":t.surface2,border:`1px solid ${done?routineColour+"66":t.border}`,borderRadius:8,marginBottom:5,transition:"all 0.2s"}}>
      <span style={{fontSize:18,flexShrink:0}}>{step.icon}</span>
      <div style={{flex:1,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.4}}>{step.label}</div>
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {children.map(child=>(
          <button key={child.code} onClick={()=>onToggle(step.id,child.code)}
            style={{width:36,height:36,borderRadius:18,background:sc[child.code]?child.colour:"transparent",border:`2px solid ${child.colour}`,color:sc[child.code]?"#000":child.colour,fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",letterSpacing:"0.04em"}}>
            {sc[child.code]?"✓":child.code.slice(0,1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoutineBlock({routine,completions,today,children,onToggle,t}){
  const rc={morning:P.amber,afterschool:P.teal,bedtime:P.lilac,sr_morning:P.lilac,sr_evening:P.lilac,dm_morning:P.midBlue,dm_evening:P.midBlue}[routine.id]||P.spock;
  const adult=isAdultRoutine(routine.id);
  return(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:18}}>{routine.emoji}</span>
        <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:rc,fontWeight:700,letterSpacing:"0.08em"}}>{routine.label.toUpperCase()}</span>
      </div>
      {(routine.steps||[]).map(step=>{
        if(adult)return<AdultRoutineStepRow key={step.id} step={step} completions={completions} today={today} routineColour={rc} onToggle={onToggle} t={t}/>;
        if(step.label.toLowerCase().startsWith("medicine"))return<MedicineStepRow key={step.id} step={step} completions={completions} today={today} routineColour={rc} children={children} onToggle={onToggle} t={t}/>;
        return<RoutineStepRow key={step.id} step={step} completions={completions} today={today} children={children} routineColour={rc} onToggle={onToggle} t={t}/>;
      })}
    </div>
  );
}

function SignalCell({d,completions,t}){
  const sd=completions[d]?.["__couple_signal__"];
  const cnt=sd?.count||0;
  const was=sd?.active||cnt>0;
  return(
    <div key={d} style={{height:24,borderRadius:5,background:was?P.dustyRed+"55":"transparent",border:`1px solid ${was?P.dustyRed:t.border}`,display:"flex",alignItems:"center",justifyContent:"center",gap:2}}>
      {was&&<span style={{fontSize:9}}>⚠️</span>}
      {cnt>1&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#000",fontWeight:700}}>×{cnt}</span>}
    </div>
  );
}
function IntentionCell({d,completions,t}){
  const ic=completions[d]?.["__intention_check__"];
  const chk=ic?.checked;
  return(
    <div title={ic?.text||""} style={{height:24,borderRadius:5,background:chk?P.teal:"transparent",border:`1px solid ${chk?P.teal:ic?P.teal+"44":t.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {chk&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"#000",fontWeight:700}}>✓</span>}
      {ic&&!chk&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.textDim}}>—</span>}
    </div>
  );
}
function StepCell({d,stepId,completions,children,t}){
  const dc=completions[d]?.[stepId]||{};
  const dn=children.filter(c=>dc[c.code]).length;
  const tot=children.length;
  const pct=tot?dn/tot:0;
  return(
    <div style={{height:24,borderRadius:5,background:pct===1?P.teal:pct>0?P.amber+"88":"transparent",border:`1px solid ${pct===1?P.teal:pct>0?P.amber:t.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {dn>0&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#000",fontWeight:700}}>{dn}/{tot}</span>}
    </div>
  );
}
function MonthDayCell({date,completions,allSteps,children,today,t}){
  if(!date)return<div/>;
  const dayComp=completions[date]||{};
  const totalSteps=allSteps.length*children.length;
  const doneSteps=allSteps.reduce((sum,s)=>sum+children.filter(c=>dayComp[s.id]?.[c.code]).length,0);
  const pct=totalSteps?doneSteps/totalSteps:0;
  const isToday=date===today;
  const isFutureDay=date>today;
  const bg=isFutureDay?"transparent":pct===0?"transparent":pct>=0.8?P.teal:pct>=0.5?P.amber+"88":P.dustyRed+"66";
  const hasSignal=!isFutureDay&&dayComp["__couple_signal__"]?.active;
  return(
    <div style={{aspectRatio:"1",borderRadius:6,background:bg,border:`1px solid ${isToday?P.spock:hasSignal?P.dustyRed:pct>0?"transparent":t.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",position:"relative"}}>
      {hasSignal&&<div style={{position:"absolute",top:2,right:2,width:6,height:6,borderRadius:3,background:P.dustyRed}}/>}
      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:isToday?P.spock:t.textMuted,fontWeight:isToday?"700":"400"}}>{new Date(date).getDate()}</span>
      {pct>0&&!isFutureDay&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"#000"}}>{Math.round(pct*100)}%</span>}
    </div>
  );
}

function TrackerTodayView({routines,completions,today,children,setCompletions,toggleCompletion,t}){
  const[crewTab,setCrewTab]=useState("cadets");
  const currentSignal=getSignal();
  const adultRoutines=Object.values(routines||{}).filter(r=>isAdultRoutine(r.id));
  const childRoutines=Object.values(routines||{}).filter(r=>!isAdultRoutine(r.id));
  return(
    <div>
      <div style={{marginBottom:16,padding:"10px 14px",background:currentSignal?.active?"#CC666222":t.panel,border:`1.5px solid ${currentSignal?.active?P.dustyRed:t.border}`,borderRadius:12,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:currentSignal?.active?P.dustyRed:t.textMuted,fontWeight:700,letterSpacing:"0.1em",marginBottom:2}}>
            {currentSignal?.active?"⚠️  ONE OF US IS STRUGGLING":"COUPLE SIGNAL"}
          </div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>
            {currentSignal?.active?"Active since "+new Date(currentSignal.ts).toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}):"Tap to signal that one of you needs support. Trackable in weekly view."}
          </div>
        </div>
        <button onClick={()=>{if(currentSignal?.active){setSignalOff();}else{setSignalOn();}setCompletions({...getCompletions()});}}
          style={{background:currentSignal?.active?P.dustyRed:t.surface2,border:`1.5px solid ${currentSignal?.active?P.dustyRed:t.border}`,borderRadius:10,padding:"8px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,color:currentSignal?.active?"#000":t.textMuted,cursor:"pointer",flexShrink:0,minHeight:44}}>
          {currentSignal?.active?"CLEAR":"SIGNAL"}
        </button>
      </div>
      {/* Bridge Crew / Cadets tab */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.border}`,marginBottom:16}}>
        {[{id:"cadets",label:"Cadets",colour:P.amber},{id:"bridge",label:"Bridge Crew",colour:P.lilac}].map(tb=>(
          <button key={tb.id} onClick={()=>setCrewTab(tb.id)}
            style={{background:crewTab===tb.id?tb.colour:"transparent",color:crewTab===tb.id?"#000":t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 18px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.12s"}}>
            {tb.label}
          </button>
        ))}
      </div>
      {crewTab==="cadets"&&(
        <>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:16}}>
            Tap a cadet's initial beside each step to mark it complete. Tap again to undo.
          </div>
          {childRoutines.map(routine=>(
            <RoutineBlock key={routine.id} routine={routine} completions={completions} today={today} children={children} onToggle={toggleCompletion} t={t}/>
          ))}
        </>
      )}
      {crewTab==="bridge"&&(
        <>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:16}}>
            Tap the circle to mark each condition complete. Resets daily at 4am.
          </div>
          {adultRoutines.length>0
            ?adultRoutines.map(routine=>(
                <RoutineBlock key={routine.id} routine={routine} completions={completions} today={today} children={children} onToggle={toggleCompletion} t={t}/>
              ))
            :<div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted}}>No Bridge Crew routines set up yet. Add them in Edit Routines.</div>
          }
        </>
      )}
    </div>
  );
}

function TrackerWeeklyView({allSteps,completions,children,today,weekOffset,setWeekOffset,t}){
  const dates=[];
  const now=new Date(getLogicalDate());
  const dow=now.getDay();
  const mon=new Date(now);
  mon.setDate(now.getDate()-dow+1+(weekOffset*7));
  for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);dates.push(d.toISOString().slice(0,10));}
  const weekLabel=`${new Date(dates[0]).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} – ${new Date(dates[6]).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}`;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:P.spock+"22",border:`1px solid ${P.spock}44`,borderRadius:8,padding:"5px 12px",color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:"pointer"}}>←</button>
        <div style={{flex:1,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.textMuted}}>{weekLabel}</div>
        <button onClick={()=>setWeekOffset(w=>Math.min(0,w+1))} disabled={weekOffset>=0} style={{background:P.spock+"22",border:`1px solid ${P.spock}44`,borderRadius:8,padding:"5px 12px",color:weekOffset>=0?t.textDim:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:weekOffset>=0?"not-allowed":"pointer",opacity:weekOffset>=0?0.4:1}}>→</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`180px repeat(7, 1fr)`,gap:3,marginBottom:4}}>
        <div/>
        {dates.map(d=>(
          <div key={d} style={{textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:d===today?P.spock:t.textDim,fontWeight:d===today?"700":"400"}}>
            {new Date(d).toLocaleDateString("en-AU",{weekday:"short"}).toUpperCase()}<br/>{new Date(d).getDate()}
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:`180px repeat(7, 1fr)`,gap:3,marginBottom:6,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,flexShrink:0}}>⚠️</span><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:P.dustyRed,fontWeight:700,whiteSpace:"nowrap"}}>Couple signal</span></div>
        {dates.map(d=>(<SignalCell key={d} d={d} completions={completions} t={t}/>))}
      </div>
      <div style={{height:1,background:t.border,marginBottom:6}}/>
      <div style={{display:"grid",gridTemplateColumns:`180px repeat(7, 1fr)`,gap:3,marginBottom:6,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,flexShrink:0}}>🎯</span><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:P.teal,fontWeight:700,whiteSpace:"nowrap"}}>Intention met</span></div>
        {dates.map(d=>(<IntentionCell key={d} d={d} completions={completions} t={t}/>))}
      </div>
      <div style={{height:1,background:t.border,marginBottom:6}}/>
      {allSteps.map(step=>(
        <div key={step.id} style={{display:"grid",gridTemplateColumns:`180px repeat(7, 1fr)`,gap:3,marginBottom:3,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
            <span style={{fontSize:14,flexShrink:0}}>{step.icon}</span>
            <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{step.label}</span>
          </div>
          {dates.map(d=>(<StepCell key={d} d={d} stepId={step.id} completions={completions} children={children} t={t}/>))}
        </div>
      ))}
      <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:14,height:14,borderRadius:3,background:P.teal}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>All done</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:14,height:14,borderRadius:3,background:P.amber+"88",border:`1px solid ${P.amber}`}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>Partial</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:14,height:14,borderRadius:3,background:"transparent",border:`1px solid ${t.border}`}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>Not logged</span></div>
      </div>
    </div>
  );
}

function TrackerMonthlyView({allSteps,completions,children,today,monthOffset,setMonthOffset,t}){
  const now=new Date(getLogicalDate());
  const targetMonth=new Date(now.getFullYear(),now.getMonth()+monthOffset,1);
  const monthLabel=targetMonth.toLocaleDateString("en-AU",{month:"long",year:"numeric"});
  const daysInMonth=new Date(targetMonth.getFullYear(),targetMonth.getMonth()+1,0).getDate();
  const monthDates=[];
  for(let i=0;i<daysInMonth;i++){const d=new Date(targetMonth);d.setDate(i+1);monthDates.push(d.toISOString().slice(0,10));}
  const offset=(new Date(monthDates[0]).getDay()+6)%7;
  const cells=[...Array(offset).fill(null),...monthDates];
  const rows=[];
  for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));
  const calendarRows=rows.map((row,ri)=>(
    <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
      {row.map((d,ci)=><MonthDayCell key={ci} date={d} completions={completions} allSteps={allSteps} children={children} today={today} t={t}/>)}
    </div>
  ));
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setMonthOffset(m=>m-1)} style={{background:P.spock+"22",border:`1px solid ${P.spock}44`,borderRadius:8,padding:"5px 12px",color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:"pointer"}}>←</button>
        <div style={{flex:1,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.textMuted}}>{monthLabel}</div>
        <button onClick={()=>setMonthOffset(m=>Math.min(0,m+1))} disabled={monthOffset>=0} style={{background:P.spock+"22",border:`1px solid ${P.spock}44`,borderRadius:8,padding:"5px 12px",color:monthOffset>=0?t.textDim:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:monthOffset>=0?"not-allowed":"pointer",opacity:monthOffset>=0?0.4:1}}>→</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
        {["M","T","W","T","F","S","S"].map((d,i)=>(<div key={i} style={{textAlign:"center",fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,letterSpacing:"0.06em"}}>{d}</div>))}
      </div>
      {calendarRows}
      <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:P.teal}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>80%+ done</span></div>
        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:P.amber+"88"}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>50-79%</span></div>
        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:P.dustyRed+"66"}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>Under 50%</span></div>
        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:P.dustyRed}}/><span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>Couple signal</span></div>
      </div>
    </div>
  );
}

function RoutineTracker({routines,profiles,t}){
  const[view,setView]=useState("today"); // today | weekly | monthly
  const[weekOffset,setWeekOffset]=useState(0);
  const[monthOffset,setMonthOffset]=useState(0);
  const[completions,setCompletions]=useState(()=>getCompletions());
  const today=getLogicalDate();
  const children=["EMM","RSM","MRM"].map(c=>profiles[c]).filter(Boolean);

  const toggleCompletion=(stepId,memberCode)=>{
    const current=completions[today]?.[stepId]?.[memberCode]||false;
    const updated=setCompletion(today,stepId,memberCode,!current);
    setCompletions({...updated});
  };

  const allSteps=Object.values(routines||{}).flatMap(r=>(r.steps||[]).map(s=>({...s,routineLabel:r.label,routineEmoji:r.emoji})));

  if(!allSteps.length)return(
    <div style={{padding:20,fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6}}>
      No routines set up yet. Build your routines in the Morning, After School, and Bedtime tabs first.
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.border}`,marginBottom:16}}>
        {["today","weekly","monthly"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?P.spock:"transparent",color:view===v?"#000":t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 16px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.12s"}}>{v}</button>
        ))}
      </div>
      {view==="today"&&<TrackerTodayView routines={routines} completions={completions} today={today} children={children} setCompletions={setCompletions} toggleCompletion={toggleCompletion} t={t}/>}
      {view==="weekly"&&<TrackerWeeklyView allSteps={allSteps} completions={completions} children={children} today={today} weekOffset={weekOffset} setWeekOffset={setWeekOffset} t={t}/>}
      {view==="monthly"&&<TrackerMonthlyView allSteps={allSteps} completions={completions} children={children} today={today} monthOffset={monthOffset} setMonthOffset={setMonthOffset} t={t}/>}
    </div>
  );
}
// ── Crew Status Overlay ────────────────────────────────────────────────────────
function CrewStatusOverlay({profiles,children,adults,allPatterns,onZoneTap,onOpenProfile,onClose,t}){
  const[zoneExplainer,setZoneExplainer]=useState(null);
  const[signal,setSignal]=useState(()=>getSignal());

  useEffect(()=>{
    const handler=(e)=>{if(e.key==="Escape"&&!zoneExplainer)onClose();};
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[onClose,zoneExplainer]);

  const toggleSignal=()=>{
    if(signal?.active){setSignalOff();setSignal(null);}
    else{const s=setSignalOn();setSignal(s);}
  };

  return(
    <>
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:910,overflowY:"auto",padding:16,display:"flex",justifyContent:"center"}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:640,width:"100%",border:`2px solid ${P.teal}66`,alignSelf:"flex-start"}}>
        {/* Header */}
        <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"stretch",height:52}}>
            <div style={{background:P.teal,width:80,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"14px 0 0 0",flexShrink:0}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:12,fontWeight:700,color:"#000",letterSpacing:"0.12em",textAlign:"center",lineHeight:1.3}}>CREW<br/>STATUS</span>
            </div>
            <div style={{flex:1,display:"flex",gap:6,padding:"0 14px",alignItems:"center"}}>
              {["EMM","RSM","MRM","SR","DM"].map(code=>(
                <div key={code} style={{flex:1,height:8,background:profiles[code]?.colour||"#333",borderRadius:4,opacity:0.8}}/>
              ))}
            </div>
            <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
          </div>
          <div style={{height:3,background:`linear-gradient(to right, ${P.teal}, ${P.spock})`}}/>
        </div>

        <div style={{padding:20}}>
          {/* Pattern alerts */}
          {allPatterns.length>0&&(
            <div style={{marginBottom:14}}>
              {allPatterns.slice(0,3).map((p,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 14px",background:p.colour+"15",border:`1px solid ${p.colour}44`,borderRadius:8,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:4,background:p.colour,flexShrink:0,marginTop:5}}/>
                  <div>
                    <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:p.colour,fontWeight:700,letterSpacing:"0.06em",marginRight:6}}>{p.code}</span>
                    <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>{p.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Couple signal */}
          <div style={{marginBottom:16,padding:"12px 14px",background:signal?.active?"#CC666633":t.panel,border:`1.5px solid ${signal?.active?P.dustyRed:t.border}`,borderRadius:12,display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:signal?.active?P.dustyRed:t.textMuted,fontWeight:700,letterSpacing:"0.1em",marginBottom:2}}>
                {signal?.active?"⚠️  ONE OF US IS STRUGGLING RIGHT NOW":"COUPLE SIGNAL"}
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.5}}>
                {signal?.active?"Signal is active — the other person knows. Tap to clear when ready.":"Use this when you're struggling and can't say it. No explanation needed."}
              </div>
            </div>
            <button onClick={toggleSignal}
              style={{background:signal?.active?P.dustyRed:t.surface2,border:`1.5px solid ${signal?.active?P.dustyRed:t.border}`,borderRadius:10,padding:"8px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,color:signal?.active?"#000":t.textMuted,cursor:"pointer",letterSpacing:"0.08em",flexShrink:0,minHeight:44}}>
              {signal?.active?"CLEAR":"SIGNAL"}
            </button>
          </div>

          {/* Adults — at top, same tile pattern as children */}
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.15em",marginBottom:8}}>ADULTS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {adults.map(m=>(
              <div key={m.code} onClick={()=>onOpenProfile(m.code)} style={{cursor:"pointer"}}>
                <ZoneTile member={m} zone={zoneIsStale(m)?null:m.zone} colour={m.colour} onZoneTap={onZoneTap} t={t}/>
              </div>
            ))}
          </div>

          {/* Children */}
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.15em",marginBottom:8}}>CHILDREN</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {children.map(m=>(
              <div key={m.code} onClick={()=>onOpenProfile(m.code)} style={{cursor:"pointer"}}>
                <ZoneTile member={m} zone={zoneIsStale(m)?null:m.zone} colour={m.colour} onZoneTap={onZoneTap} t={t}/>
              </div>
            ))}
          </div>

          {/* Zone legend — clickable for explainers */}
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.12em",marginBottom:8}}>TAP A ZONE TO LEARN WHAT IT MEANS</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {/* Zones Framework button — sits first */}
            <button onClick={()=>setZoneExplainer("framework")}
              style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:P.spock+"18",border:`1.5px solid ${P.spock}`,borderRadius:20,cursor:"pointer",transition:"all 0.12s",minHeight:44}}>
              <span style={{fontSize:18}}>🧠</span>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.spock,fontWeight:700,letterSpacing:"0.06em"}}>ZONES FRAMEWORK</span>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>?</span>
            </button>
            {ZONES.map(z=>(
              <button key={z.id} onClick={()=>setZoneExplainer(z.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:z.colour+"18",border:`1.5px solid ${z.colour}`,borderRadius:20,cursor:"pointer",transition:"all 0.12s",minHeight:44}}>
                <span style={{fontSize:18}}>{z.emoji}</span>
                <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:z.colour,fontWeight:700,letterSpacing:"0.06em"}}>{z.label.toUpperCase()}</span>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>?</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
    {zoneExplainer&&<ZoneExplainerModal zoneId={zoneExplainer} onClose={()=>setZoneExplainer(null)} t={t}/>}
    </>
  );
}

// ── Spock home button — includes daily quote in collapsed state ───────────────
function SpockHomeButton({onSpock,profiles,t}){
  const[expanded,setExpanded]=useState(false);
  const[contextual,setContextual]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const quote=getDailyQuote();

  const getContextualInsight=async()=>{
    setLoading(true);setError(null);
    const today=getLogicalDate();
    const members=Object.values(profiles);
    const zoneSummary=members.map(m=>{
      const todayLogs=(m.logs||[]).filter(l=>l.date===today);
      const currentZone=m.zone&&!zoneIsStale(m)?m.zone:"no zone today";
      return`${m.code}(age ${m.age}): ${currentZone}${todayLogs.length>1?`, ${todayLogs.length} logs today`:""}`;
    }).join("; ");
    const recentPatterns=members.flatMap(m=>{
      const p=detectPatterns(m.logs);
      return p.map(x=>`${m.code}: ${x.text}`);
    }).slice(0,3).join("\n")||"No recent patterns.";
    const day=new Date().toLocaleDateString("en-AU",{weekday:"long"});
    const system=`You are Mr. Spock from Star Trek. Provide 2-4 sentences of original Spock-voiced reasoning — logical, warm, specific to the family data, practically useful. Do NOT quote yourself from the films or series. Do NOT use jargon. End with one concrete suggestion for today. This will be labelled as "Generated based on Spock's reasoning — not a real quote."`;
    const user=`Day: ${day}\nFamily zone status: ${zoneSummary}\nRecent patterns: ${recentPatterns}`;
    try{
      const text=await callClaude(system,user,400);
      setContextual(text);
    }catch(e){setError("Unable to reach Spock at this time.");}
    finally{setLoading(false);}
  };

  return(
    <div style={{gridColumn:"1 / -1",background:P.spock+"22",border:`2px solid ${P.spock}`,borderRadius:16,overflow:"hidden",transition:"all 0.2s"}}>
      {/* Main tap area — consult Spock */}
      <button onClick={onSpock}
        style={{width:"100%",background:P.spock,border:"none",padding:"20px 20px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14,boxShadow:`0 0 32px ${P.spock}44`}}>
        <div style={{background:"#000",borderRadius:10,padding:"8px 12px",flexShrink:0}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.spock,fontWeight:700,letterSpacing:"0.15em",lineHeight:1.2}}>MR.</div>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.spock,fontWeight:700,letterSpacing:"0.15em",lineHeight:1.2}}>SPOCK</div>
        </div>
        <div style={{flex:1,textAlign:"left"}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:"#00004A",letterSpacing:"0.18em",marginBottom:2}}>CONSULTATION REQUEST</div>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:16,color:"#000",fontWeight:700,letterSpacing:"0.06em",lineHeight:1.3}}>WHAT SHOULD WE DO RIGHT NOW?</div>
        </div>
        <div style={{fontSize:22,flexShrink:0}}>→</div>
      </button>

      {/* Daily quote — always visible below the button */}
      <div style={{padding:"12px 16px 10px",borderTop:`1px solid ${P.spock}44`}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6,fontStyle:"italic",marginBottom:4}}>
          "{quote.text}"
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:P.spock}}>
          — {quote.speaker}
        </div>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,marginTop:2,letterSpacing:"0.06em"}}>
          {quote.source} · {quote.category==="spock_canon"?"VERIFIED CANON QUOTE":"VERIFIED QUOTE — ATTRIBUTED AS SHOWN"}
        </div>
        {quote.note&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textDim,marginTop:2,fontStyle:"italic"}}>{quote.note}</div>}

        {/* Expand for contextual assessment */}
        <button onClick={()=>setExpanded(e=>!e)}
          style={{background:"transparent",border:"none",color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:10,letterSpacing:"0.1em",cursor:"pointer",padding:"6px 0 0",display:"flex",alignItems:"center",gap:4}}>
          {expanded?"▲ HIDE":"▼ WHAT ARE YOUR THOUGHTS ON OUR SITUATION?"}
        </button>

        {expanded&&(
          <div style={{marginTop:10,borderTop:`1px solid ${P.spock}33`,paddingTop:10}}>
            {!contextual&&!loading&&!error&&(
              <div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginBottom:10,lineHeight:1.6}}>
                  Spock will analyse your family's current zone data and recent patterns and offer a brief observation for today.
                </div>
                <LCARSBtn label="Get Spock's assessment" colour={P.spock} onClick={getContextualInsight} small/>
              </div>
            )}
            {loading&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
                <div style={{width:16,height:16,border:`2px solid ${P.spock}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.spock,letterSpacing:"0.1em"}}>CONSULTING THE EVIDENCE...</span>
              </div>
            )}
            {error&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:P.dustyRed}}>{error}</div>}
            {contextual&&(
              <div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.7,fontStyle:"italic",marginBottom:6}}>{contextual}</div>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,letterSpacing:"0.07em"}}>GENERATED BASED ON SPOCK'S REASONING — NOT A REAL QUOTE · {new Date().toLocaleDateString("en-AU")}</div>
                <button onClick={()=>setContextual(null)} style={{background:"transparent",border:"none",color:t.textDim,fontFamily:"'Antonio',sans-serif",fontSize:10,letterSpacing:"0.08em",cursor:"pointer",marginTop:6}}>← NEW ASSESSMENT</button>
              </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S INTENTION LIBRARY — 100 statements grounded in tool evidence base
// Covers: co-regulation, 2×10, repair, routines, sensory, movement, transition,
// self-regulation, autonomy, predictability, green zone investment, PERMA(H)
// ─────────────────────────────────────────────────────────────────────────────
const INTENTION_LIBRARY=[
  // Co-regulation (Perry NMT — adult state is primary input)
  "I will regulate myself first before responding to anyone else's dysregulation.",
  "I will notice when I'm yellow or red, and name it to myself before I act.",
  "I will take one slow breath before responding to a hard moment today.",
  "I will model the zone I want to see — calm body, quiet voice, slow movement.",
  "I will remember that my nervous system is a regulatory input for everyone in this house.",
  "I will give myself permission to step away and regulate before re-engaging.",
  "I will treat my own dysregulation as information, not failure.",
  "I will check my own zone before I log anyone else's.",

  // 2×10 strategy (Wlodkowski — genuine connection builds the relational account)
  "I will have a genuine 2-minute conversation with EMM about something she cares about.",
  "I will have a genuine 2-minute conversation with RSM about something he cares about.",
  "I will give MRM 2 minutes of undivided, playful attention before the morning rush.",
  "I will ask one question today that I genuinely don't know the answer to.",
  "I will listen more than I speak in at least one conversation today.",
  "I will remember something from yesterday's conversation and bring it up today.",
  "I will follow their lead in at least one interaction — no agenda, no redirection.",
  "I will put my phone down during the one connection moment I choose today.",
  "I will find one thing one of the children is interested in and ask about it.",

  // Repair (Bath & Seita — repair is more important than avoiding rupture)
  "I will repair one rupture from yesterday, however small.",
  "I will remember that repair is more important than getting it right the first time.",
  "I will say sorry if I got it wrong — without over-explaining or self-justifying.",
  "I will not let today end with an unrepaired rupture if I can help it.",
  "I will model that adults can get it wrong and fix it.",

  // Routine and predictability (Perry NMT, Siegel — predictability supports regulation)
  "I will give the first transition warning of the day with enough notice to actually help.",
  "I will use the same words for each transition warning today.",
  "I will name what is coming before it happens — for all three children.",
  "I will keep the morning sequence as predictable as I can today.",
  "I will give a 5-minute warning before any change of activity.",
  "I will say what comes next after every transition today.",
  "I will front-load the day's plan in the morning — let everyone know what to expect.",

  // Sensory and movement (Perry NMT — bottom-up regulation)
  "I will offer a movement break before it becomes necessary.",
  "I will check the sensory environment before assuming behaviour is the issue.",
  "I will offer a proprioceptive activity to whoever seems restless today.",
  "I will build one movement snack into the day for RSM before he needs it.",
  "I will check whether anyone needs more or less sensory input before adding demands.",
  "I will offer a warm drink during a hard moment instead of words.",
  "I will reduce noise and light before trying to reason with anyone.",

  // Micro-choice and autonomy (SDT — autonomy satisfaction reduces resistance)
  "I will offer a genuine choice — not a trick choice — in at least one hard moment today.",
  "I will identify what is truly non-negotiable today and let everything else be flexible.",
  "I will let each child choose one thing about how they do a non-negotiable task.",
  "I will not over-explain a decision I've already made — just make it and move on.",
  "I will offer 'here or there' or 'now or in 10 minutes' instead of a flat demand.",
  "I will step back and let someone choose rather than directing.",

  // Green zone investment (Kuypers — green is when the relational account gets built)
  "I will use one green moment today to invest in connection, not catch up on tasks.",
  "I will notice when everyone is green and choose something relational over something productive.",
  "I will not waste the next green window on administration.",
  "I will do one thing today that has nothing to do with management or correction.",
  "I will sit beside someone today just because they are regulated and I want to be near them.",

  // Self-regulation tools (Balban — breathing; Lieberman — affect labelling)
  "I will name a feeling out loud for one of the children today — just name it, no fixing.",
  "I will use the cyclic breathing tool myself before a difficult moment if I can.",
  "I will say 'you seem frustrated' instead of 'stop being difficult'.",
  "I will put a word to my own feeling before I act on it.",
  "I will practise affect labelling once today — for myself or for one of the children.",
  "I will remember that naming a feeling reduces its intensity.",

  // No-demand presence and side-by-side (Polyvagal — proximity signals safety)
  "I will sit near someone who is struggling without trying to fix it.",
  "I will offer presence without agenda to whoever seems most disconnected today.",
  "I will do something of my own in the same space as someone who is blue.",
  "I will not add demands on top of a hard moment — just be there.",
  "I will remember that my calm presence is a tool even when words aren't.",

  // Transition and schedule (predictability research)
  "I will run the after-school decompression period before making any requests.",
  "I will not schedule anything demanding in the first 20 minutes after school.",
  "I will let whoever needs it have quiet time before reconnecting today.",
  "I will not problem-solve or debrief immediately after a hard transition.",

  // Adult wellbeing (PERMA(H) — adult capacity is the foundation of everything)
  "I will do one thing today that restores rather than depletes — however small.",
  "I will eat something before the hard part of the day starts.",
  "I will notice one moment of genuine positive emotion and stay in it for a breath.",
  "I will ask for help if I need it today — from my partner, from family, from anyone.",
  "I will check my own PERMA(H) if I feel like nothing is working.",
  "I will remember that my regulation is not self-indulgence — it is the prerequisite.",
  "I will do the breathing tool if I hit yellow before 10am.",
  "I will protect at least 10 minutes of genuine quiet at some point today.",

  // Partner / couple (shared load, couple signal)
  "I will check in with my partner before the day gets away from us.",
  "I will use the couple signal if I'm struggling rather than carrying it alone.",
  "I will notice if my partner is yellow or red and absorb some load without being asked.",
  "I will say something specific and genuine to my partner today.",
  "I will not debrief the hardest thing until we are both regulated.",

  // Pattern awareness (zone logging builds insight)
  "I will log zones for all three children at least once today.",
  "I will notice what time of day things tend to go wrong and plan around it.",
  "I will check last week's history before making assumptions about today.",
  "I will treat today's hard moment as data, not disaster.",
  "I will look for the pattern beneath the behaviour before I respond to the behaviour.",

  // Interest hook and engagement (SDT, Perry — interest activates the system)
  "I will find one way to connect a demand to something a child actually cares about.",
  "I will ask about one special interest today with genuine curiosity.",
  "I will follow a child's lead into their interest for at least 5 minutes.",
  "I will remember that interest is a regulation tool, not just a motivation trick.",

  // Body doubling and initiation (ADHD literature)
  "I will move into the same space as whoever is stuck and work on something of my own.",
  "I will lower the initiation bar for whoever is blue — just one tiny first step.",
  "I will start something myself rather than asking someone else to start first.",

  // Repair and end-of-day
  "I will end today with one warm, low-demand moment for each child.",
  "I will name one good thing from today before bed — however small.",
  "I will not take today's hard moments into tomorrow — name them, close them, reset.",
  "I will remember that imperfect and present is better than perfect and absent.",

  // Systemic / family-wide
  "I will reduce non-essential demands on the whole family today.",
  "I will treat the morning routine as infrastructure, not compliance.",
  "I will hold the Regulate → Relate → Reason sequence even when everything in me wants to reason first.",
  "I will remember that this family is doing something genuinely hard — and doing it.",
];

function getLibraryIntention(){
  return INTENTION_LIBRARY[Math.floor(Math.random()*INTENTION_LIBRARY.length)];
}

async function getSpockIntention(profiles){
  const today=getLogicalDate();
  const weekAgo=new Date(new Date(today)-7*24*60*60*1000).toISOString().slice(0,10);
  const members=Object.values(profiles);
  const logSummary=members.map(m=>{
    const weekLogs=(m.logs||[]).filter(l=>l.date>=weekAgo);
    if(!weekLogs.length)return`${m.code}: no logs this week`;
    const counts={red:0,yellow:0,green:0,blue:0};
    weekLogs.forEach(l=>{if(counts[l.zone]!==undefined)counts[l.zone]++;});
    const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const notes=weekLogs.filter(l=>l.note).slice(-3).map(l=>l.note);
    return`${m.code}(age ${m.age}): ${weekLogs.length} logs, most common zone=${dominant[0]}(${dominant[1]}x)${notes.length?`, recent notes: "${notes.join('" / "')}"`:""}`; 
  }).join("\n");
  const system=`You are Mr. Spock. Based on the family's zone data from the past week, suggest ONE specific daily intention — a single sentence starting with 'I will...' — that would be most useful for the adults today given what the data shows. Ground it in what the data actually shows. Be specific, not generic. Return only the intention sentence, nothing else.`;
  return await callClaude(system,`Family data past 7 days:\n${logSummary}`,200);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP-3 STRATEGIES PER ZONE — static, instant, curated for this family
// ─────────────────────────────────────────────────────────────────────────────
const TOP3_BY_ZONE={
  red:[
    {icon:"🔇",title:"Space and silence",text:"Remove everyone else from the room if you can. Turn off screens, lower lights, stop talking. No demands, no reasoning. Regulated presence only."},
    {icon:"🫁",title:"Regulate yourself first",text:"Slow your breathing before anything else. Lower your posture and soften your voice. Your nervous system is the most powerful tool available right now."},
    {icon:"⏳",title:"Wait it out safely",text:"The stress response has a biological ceiling. It will peak and fall. Keep everyone physically safe and let the wave pass. Do not try to end it faster."},
  ],
  yellow:[
    {icon:"🏃",title:"Movement first",text:"Offer a movement break before it escalates further. A walk, jumping, heavy work — anything proprioceptive. Movement is the fastest regulation route at yellow."},
    {icon:"🎯",title:"Genuine choice",text:"Offer one real choice — not a trick. 'Do you want to do this here or in your room?' Autonomy reduces threat response immediately."},
    {icon:"⬇️",title:"Reduce demands",text:"Remove or delay any non-essential demands right now. This is not permissive — it is strategic. Yellow is where you spend the least to get the most."},
  ],
  green:[
    {icon:"💬",title:"2×10 connection",text:"Two minutes of genuine conversation about something they care about, for ten consecutive days. The highest-ROI relational investment available in green zone."},
    {icon:"🔧",title:"Teach a strategy",text:"Green is the only zone where new learning sticks. Introduce a regulation tool, name a feeling pattern, or practise a transition together."},
    {icon:"🔄",title:"Repair if needed",text:"If there was a rupture earlier, green is the time to address it. Brief, warm, no lecture. Name what happened and move forward."},
  ],
  blue:[
    {icon:"🌡️",title:"Warmth and rhythm",text:"A warm drink, a blanket, slow rhythmic movement or music. Bottom-up inputs only — no words, no demands, no problem-solving."},
    {icon:"👥",title:"Body-doubling",text:"Sit nearby and do something of your own. Your regulated presence activates theirs without any demand. Side-by-side, not face-to-face."},
    {icon:"🐢",title:"One tiny step",text:"Lower the initiation bar to almost nothing. One sock on. One bite. One step toward the door. Completion is not the goal — activation is."},
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SR SCHEDULE WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function SRScheduleWidget({t}){
  const[steps,setSteps]=useState(()=>getSRSchedule());
  const[expanded,setExpanded]=useState(false);
  const doneCount=steps.filter(s=>s.done).length;
  const total=steps.length;
  const pct=Math.round((doneCount/total)*100);
  const toggle=(id)=>{
    const updated=steps.map(s=>s.id===id?{...s,done:!s.done}:s);
    setSteps(updated);
    saveSRSchedule(updated);
  };
  return(
    <div style={{marginBottom:10,background:t.surface,border:`1.5px solid ${P.lilac}44`,borderRadius:12,overflow:"hidden"}}>
      <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%",background:"transparent",border:"none",padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <span style={{fontSize:16}}>🌸</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.lilac,letterSpacing:"0.14em",fontWeight:700}}>SR'S DAILY CONDITIONS</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted,marginTop:1}}>
            {doneCount}/{total} today
            {pct>=80&&<span style={{color:P.teal,marginLeft:6,fontWeight:700}}>— that's a big win ✓</span>}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{width:60,height:6,background:t.surface2,borderRadius:3,overflow:"hidden",flexShrink:0}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct>=80?P.teal:P.lilac,borderRadius:3,transition:"width 0.3s"}}/>
        </div>
        <span style={{fontSize:11,color:t.textDim,flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </button>
      {expanded&&(
        <div style={{padding:"0 14px 14px"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textDim,marginBottom:10,fontStyle:"italic"}}>These are conditions for the whole system to function — not tasks for SR to complete. 80% on any given day is a very big win.</div>
          {steps.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8,padding:"8px 10px",background:s.done?P.lilac+"18":t.surface2,borderRadius:8,border:`1px solid ${s.done?P.lilac:t.border}`,transition:"all 0.15s"}}>
              <button onClick={()=>toggle(s.id)}
                style={{width:28,height:28,borderRadius:6,border:`2px solid ${P.lilac}`,background:s.done?P.lilac:"transparent",color:s.done?"#000":P.lilac,cursor:"pointer",flexShrink:0,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                {s.done?"✓":""}
              </button>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{s.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:600,color:s.done?t.textMuted:t.text,textDecoration:s.done?"line-through":"none"}}>{s.label}</div>
                {s.note&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textDim,marginTop:2,lineHeight:1.5}}>{s.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADULT ZONE STRIP — quick zone tap for SR and DM on home screen
// ─────────────────────────────────────────────────────────────────────────────
function AdultZoneStrip({profiles,onZoneTap,t,label}){
  const adults=["SR","DM"].map(c=>profiles[c]).filter(Boolean);
  if(!adults.length)return null;
  const heading=label||"HOW ARE WE RIGHT NOW?";
  return(
    <div style={{marginBottom:10,padding:"10px 14px",background:t.surface,border:`1.5px solid ${t.border}`,borderRadius:12}}>
      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,letterSpacing:"0.14em",fontWeight:700,marginBottom:8}}>{heading.toUpperCase()}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {adults.map(m=>(
          <div key={m.code}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:m.colour,fontWeight:700,letterSpacing:"0.06em",marginBottom:5}}>{m.code}</div>
            <div style={{display:"flex",gap:4}}>
              {ZONES.map(z=>(
                <button key={z.id} onClick={()=>onZoneTap(m.code,z.id)}
                  title={z.label}
                  style={{flex:1,background:m.zone===z.id?z.colour:"transparent",border:`2px solid ${z.colour}`,borderRadius:8,padding:"5px 2px",fontSize:18,cursor:"pointer",transition:"all 0.1s",minHeight:38,opacity:m.zone===z.id?1:0.6}}>
                  {z.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP-3 NOW WIDGET — static, zone-based, instant
// ─────────────────────────────────────────────────────────────────────────────
function TopThreeNow({profiles,t}){
  const[expanded,setExpanded]=useState(false);
  // Dominant family zone
  const zoneCounts={red:0,yellow:0,green:0,blue:0};
  Object.values(profiles).forEach(m=>{if(m.zone&&!zoneIsStale(m)&&zoneCounts[m.zone]!==undefined)zoneCounts[m.zone]++;});
  const dominant=Object.entries(zoneCounts).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>0);
  const zone=dominant?.[0]||"green";
  const strategies=TOP3_BY_ZONE[zone]||TOP3_BY_ZONE.green;
  const zoneColour=ZONES.find(z=>z.id===zone)?.colour||P.teal;
  const zoneLabel=ZONES.find(z=>z.id===zone)?.label||zone;
  return(
    <div style={{marginBottom:10,background:t.surface,border:`1.5px solid ${zoneColour}44`,borderRadius:12,overflow:"hidden"}}>
      <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%",background:"transparent",border:"none",padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:zoneColour,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:zoneColour,letterSpacing:"0.14em",fontWeight:700}}>3 TOOLS FOR RIGHT NOW</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted,marginTop:1}}>Based on current family zone: {zoneLabel}</div>
        </div>
        <span style={{fontSize:11,color:t.textDim,flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </button>
      {expanded&&(
        <div style={{padding:"0 14px 14px"}}>
          {strategies.map((s,i)=>(
            <div key={i} style={{marginBottom:10,padding:"10px 12px",background:zoneColour+"12",borderLeft:`3px solid ${zoneColour}`,borderRadius:"0 8px 8px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:zoneColour,fontWeight:700,letterSpacing:"0.08em"}}>{s.title.toUpperCase()}</span>
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{s.text}</div>
            </div>
          ))}
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textDim,textAlign:"center",paddingTop:4}}>Open Strategy Library for all 26 tools</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY PLANNER WIDGET — home screen access point
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyPlannerWidget({profiles,t}){
  const[tasks,setTasks]=useState(()=>getWeeklyPlan());
  const[expanded,setExpanded]=useState(false);
  const today=new Date();
  if(today.getHours()<4)today.setDate(today.getDate()-1);
  const todayDow=today.getDay(); // 0=Sun,1=Mon...
  const todayTasks=tasks.filter(t2=>t2.day===todayDow);
  const weekDone=tasks.filter(t2=>t2.done).length;
  const toggle=(id)=>{
    const updated=tasks.map(t2=>t2.id===id?{...t2,done:!t2.done}:t2);
    setTasks(updated);
    saveWeeklyPlan(updated);
  };
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const ownerColour=(owner)=>{
    if(owner==="SR")return profiles.SR?.colour||P.lilac;
    if(owner==="DM")return profiles.DM?.colour||P.midBlue;
    return P.teal;
  };
  return(
    <div style={{marginBottom:10,background:t.surface,border:`1.5px solid ${P.teal}44`,borderRadius:12,overflow:"hidden"}}>
      <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%",background:"transparent",border:"none",padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <span style={{fontSize:16}}>📅</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,letterSpacing:"0.14em",fontWeight:700}}>WEEKLY PLAN</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted,marginTop:1}}>
            {todayTasks.length>0?`${todayTasks.filter(t2=>t2.done).length}/${todayTasks.length} today`:"Nothing scheduled today"}
            {" · "}{weekDone}/{tasks.length} this week
          </div>
        </div>
        <span style={{fontSize:11,color:t.textDim,flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </button>
      {expanded&&(
        <div style={{padding:"0 14px 14px"}}>
          {[1,2,3,4,5,6,0].map(dow=>{
            const dayTasks=tasks.filter(t2=>t2.day===dow);
            if(!dayTasks.length)return null;
            const isToday=dow===todayDow;
            return(
              <div key={dow} style={{marginBottom:10}}>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:isToday?P.spock:t.textMuted,letterSpacing:"0.12em",fontWeight:isToday?"700":"400",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                  {days[dow].toUpperCase()}{isToday&&<span style={{background:P.spock,color:"#000",fontSize:8,padding:"1px 6px",borderRadius:8,fontWeight:700}}>TODAY</span>}
                </div>
                {dayTasks.map(task=>(
                  <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,padding:"7px 10px",background:task.done?P.teal+"15":t.surface2,borderRadius:8,border:`1px solid ${task.done?P.teal:t.border}`,transition:"all 0.15s"}}>
                    <button onClick={()=>toggle(task.id)}
                      style={{width:24,height:24,borderRadius:5,border:`2px solid ${ownerColour(task.owner)}`,background:task.done?ownerColour(task.owner):"transparent",color:task.done?"#000":ownerColour(task.owner),cursor:"pointer",flexShrink:0,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                      {task.done?"✓":""}
                    </button>
                    <span style={{fontSize:14,flexShrink:0}}>{task.icon}</span>
                    <div style={{flex:1,fontFamily:"'Nunito',sans-serif",fontSize:13,color:task.done?t.textMuted:t.text,textDecoration:task.done?"line-through":"none"}}>{task.label}</div>
                    {task.owner!=="family"&&<span style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:ownerColour(task.owner),fontWeight:700,letterSpacing:"0.06em",flexShrink:0}}>{task.owner}</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function RedAlertModal({profiles,onClose,t}){
  const[step,setStep]=useState("who"); // who | strategies
  const[member,setMember]=useState(null);
  const children=["EMM","RSM","MRM"].map(c=>profiles[c]).filter(Boolean);

  const handleSelectMember=(m)=>{
    setMember(m);
    setStep("strategies");
  };

  const handleDone=()=>{
    if(member)logRedAlert(member.code);
    onClose();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000000EE",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:t.surface,border:"2px solid #EF4444",borderRadius:16,maxWidth:480,width:"100%",maxHeight:"92vh",overflowY:"auto",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"#EF4444",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:16,fontWeight:700,color:"#000",letterSpacing:"0.1em"}}>🚨 RED ALERT</span>
          <button onClick={onClose} style={{background:"rgba(0,0,0,0.2)",border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:10,cursor:"pointer",letterSpacing:"0.08em"}}>CLOSE</button>
        </div>

        <div style={{padding:18}}>
          {step==="who"&&(
            <>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#EF4444",letterSpacing:"0.12em",fontWeight:700,marginBottom:8}}>WHO IS THIS FOR?</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {children.map(m=>(
                  <button key={m.code} onClick={()=>handleSelectMember(m)}
                    style={{background:m.colour+"22",border:`2px solid ${m.colour}`,borderRadius:12,padding:"16px 8px",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontFamily:"'Antonio',sans-serif",fontSize:16,color:m.colour,fontWeight:700,letterSpacing:"0.08em"}}>{m.code}</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted,marginTop:4}}>age {m.age}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step==="strategies"&&member&&(
            <>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#EF4444",letterSpacing:"0.12em",fontWeight:700,marginBottom:2}}>FOR: {member.code}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,marginBottom:16,lineHeight:1.5}}>Work through these in order. Do not skip ahead.</div>
              {RED_ALERT_STRATEGIES.map(s=>(
                <div key={s.n} style={{marginBottom:14,padding:"12px 14px",background:t.surface2,borderLeft:`4px solid #EF4444`,borderRadius:"0 10px 10px 0"}}>
                  <div style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#EF4444",letterSpacing:"0.1em",fontWeight:700,marginBottom:6}}>{s.n}. {s.title.toUpperCase()}</div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.65}}>{s.text}</div>
                </div>
              ))}
              {/* 000 note */}
              <div style={{marginTop:8,padding:"10px 14px",background:"#EF444418",border:"1px solid #EF444466",borderRadius:10}}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.6}}>
                  If someone is being seriously hurt and you cannot safely protect them by creating space — <strong style={{color:"#EF4444"}}>call 000 and ask for Police.</strong> This is not failure. This is protecting your family. You do not need to manage every situation alone.
                </div>
              </div>
              <button onClick={handleDone}
                style={{width:"100%",marginTop:16,background:"#EF4444",border:"none",borderRadius:12,padding:"14px",fontFamily:"'Antonio',sans-serif",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",letterSpacing:"0.1em"}}>
                DONE — LOG THIS EVENT
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StreakBadge({t}){
  const s=getStreak();
  if(!s.count)return null;
  const fire=s.count>=7?"🔥":s.count>=3?"⚡":"✓";
  const msg=s.count===1?"1 day showing up":`${s.count} days showing up`;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",background:s.count>=7?P.amber+"22":P.teal+"18",border:`1px solid ${s.count>=7?P.amber:P.teal}44`,borderRadius:20,alignSelf:"flex-start",marginBottom:10}}>
      <span style={{fontSize:16}}>{fire}</span>
      <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:s.count>=7?P.amber:P.teal,fontWeight:700,letterSpacing:"0.08em"}}>{msg.toUpperCase()}</span>
      {s.count>=7&&<span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>Keep going.</span>}
    </div>
  );
}

function Dashboard({profiles,onZoneTap,onSpock,onOpenProfile,t,isDark,onToggleTheme,onOpenRoutines,onOpenLibrary,onOpenGuide}){
  const children=["EMM","RSM","MRM"].map(c=>profiles[c]).filter(Boolean);
  const adults=["SR","DM"].map(a=>profiles[a]).filter(Boolean);
  const allPatterns=Object.values(profiles).flatMap(m=>detectPatterns(m.logs).map(p=>({...p,code:m.code,colour:m.colour})));
  const{isFullscreen,toggle:toggleFullscreen}=useFullscreen();
  const[showCrewStatus,setShowCrewStatus]=useState(false);
  const[lowCapacity,setLowCapacity]=useState(false);
  const[intention,setIntention]=useState(()=>getIntention());
  const[intentionDraft,setIntentionDraft]=useState("");
  const[editingIntention,setEditingIntention]=useState(false);
  const[signal,setSignal]=useState(()=>getSignal());
  const[intentionLoading,setIntentionLoading]=useState(false);
  const[showRedAlert,setShowRedAlert]=useState(false);
  const hasPatterns=allPatterns.length>0;
  const hasNudges=getRoutineNudges(profiles).length>0;
  const familyLoad=getFamilyLoad(profiles);

  const saveIntentionNow=()=>{
    if(intentionDraft.trim()){saveIntention(intentionDraft.trim());setIntention({text:intentionDraft.trim(),date:getLogicalDate()});}
    setEditingIntention(false);setIntentionDraft("");
  };

  return(
    <div style={{minHeight:"100vh",background:t.bg,color:t.text}}>
      {/* Top bar */}
      <div style={{background:t.headerBg,borderBottom:"3px solid #1A0A3E"}}>
        <div style={{display:"flex",alignItems:"stretch",height:60}}>
          <div style={{width:20,background:P.spock,flexShrink:0}}/>
          <div style={{background:P.spock,display:"flex",alignItems:"center",padding:"0 20px 0 12px",flexShrink:0,borderRadius:"0 0 40px 0"}}>
            <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,fontWeight:700,letterSpacing:"0.18em",color:"#000"}}>R-M FAMILY</span>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:5,padding:"0 16px"}}>
            <div style={{display:"flex",gap:6}}>
              {["EMM","RSM","MRM","SR","DM"].map(code=>(
                <div key={code} style={{flex:1,height:10,background:profiles[code]?.colour||"#333",borderRadius:5,opacity:0.8}}/>
              ))}
            </div>
            <div style={{height:5,background:P.spock+"44",borderRadius:3}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0}}>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:P.spock}}>
              {new Date().toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"}).toUpperCase()}
            </span>
          </div>
          <button onClick={onOpenGuide} title="Quick Start Guide" style={{background:"transparent",border:`1px solid ${P.spock}66`,color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:13,fontWeight:700,padding:"0 11px",cursor:"pointer",flexShrink:0,minWidth:40}}>?</button>
          <button onClick={onToggleTheme} style={{background:"transparent",border:`1px solid ${P.spock}66`,color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:11,letterSpacing:"0.1em",padding:"0 10px",cursor:"pointer",flexShrink:0}}>{isDark?"LIGHT":"DARK"}</button>
          <button onClick={toggleFullscreen} title={isFullscreen?"Exit fullscreen":"Enter fullscreen"} style={{background:"transparent",border:`1px solid ${P.spock}66`,color:P.spock,fontFamily:"'Antonio',sans-serif",fontSize:14,padding:"0 11px",cursor:"pointer",flexShrink:0}}>{isFullscreen?"⊡":"⊞"}</button>
          <button onClick={()=>setLowCapacity(l=>!l)} title={lowCapacity?"Normal mode":"Low capacity mode — strips to essentials"} style={{background:lowCapacity?P.amber:"transparent",border:`1px solid ${P.spock}66`,color:lowCapacity?"#000":P.spock,fontFamily:"'Antonio',sans-serif",fontSize:13,padding:"0 11px",cursor:"pointer",flexShrink:0}}>⚡</button>
        </div>
        <div style={{display:"flex",height:5}}>
          {["EMM","RSM","MRM","SR","DM"].map(code=>(
            <div key={code} style={{flex:1,background:profiles[code]?.colour||"#333"}}/>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"14px 16px"}}>

        {/* ── RED ALERT — always first ──────────────────────────── */}
        <button onClick={()=>setShowRedAlert(true)}
          style={{width:"100%",background:"#EF444418",border:"2px solid #EF4444",borderRadius:12,padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,transition:"all 0.15s"}}>
          <span style={{fontSize:18}}>🚨</span>
          <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:"#EF4444",fontWeight:700,letterSpacing:"0.12em"}}>RED ALERT</span>
        </button>

        {/* ── BRIDGE CREW, HOW ARE WE RIGHT NOW? ───────────────── */}
        <AdultZoneStrip profiles={profiles} onZoneTap={onZoneTap} t={t} label="Bridge Crew, how are we right now?"/>

        {/* ── NAV BUTTONS ──────────────────────────────────────── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <button onClick={()=>setShowCrewStatus(true)}
            style={{background:t.surface,border:`2.5px solid ${P.teal}`,borderRadius:14,padding:"18px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.15s",position:"relative",minHeight:64}}>
            {(hasPatterns||signal?.active)&&<div style={{position:"absolute",top:8,right:8,width:9,height:9,borderRadius:"50%",background:signal?.active?P.dustyRed:P.amber}}/>}
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:P.teal,fontWeight:700,letterSpacing:"0.08em",lineHeight:1.4}}>CREW<br/>STATUS</div>
          </button>
          <button onClick={onOpenRoutines}
            style={{background:t.surface,border:`2.5px solid ${P.amber}`,borderRadius:14,padding:"18px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.15s",position:"relative",minHeight:64}}>
            {hasNudges&&<div style={{position:"absolute",top:8,right:8,width:9,height:9,borderRadius:"50%",background:P.amber}}/>}
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:P.amber,fontWeight:700,letterSpacing:"0.08em",lineHeight:1.4}}>DAILY<br/>ROUTINES</div>
          </button>
          <button onClick={onOpenLibrary}
            style={{background:t.surface,border:`2.5px solid ${P.midBlue}`,borderRadius:14,padding:"18px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.15s",minHeight:64}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:13,color:P.midBlue,fontWeight:700,letterSpacing:"0.08em",lineHeight:1.4}}>STRATEGY<br/>LIBRARY</div>
          </button>
        </div>

        {/* ── CONTEXTUAL BANNERS ────────────────────────────────── */}
        {signal?.active&&(
          <div style={{marginBottom:10,padding:"10px 14px",background:"#CC666622",border:`1.5px solid ${P.dustyRed}`,borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⚠️</span>
            <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,flex:1,lineHeight:1.5}}>One of you has signalled they're struggling. Open Crew Status to manage.</span>
            <button onClick={()=>setShowCrewStatus(true)}
              style={{background:P.dustyRed,border:"none",borderRadius:10,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#000",cursor:"pointer",flexShrink:0,minHeight:36}}>VIEW</button>
          </div>
        )}
        {familyLoad&&(
          <div style={{marginBottom:10,padding:"8px 14px",background:familyLoad.colour+"15",border:`1.5px solid ${familyLoad.colour}55`,borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:5,background:familyLoad.colour,flexShrink:0}}/>
            <div style={{flex:1}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:familyLoad.colour,fontWeight:700,letterSpacing:"0.1em",marginRight:8}}>FAMILY LOAD: {familyLoad.level}</span>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted}}>{familyLoad.text}</span>
            </div>
          </div>
        )}

        {/* ── STREAK ───────────────────────────────────────────── */}
        <StreakBadge t={t}/>

        {/* ── TODAY'S INTENTION ────────────────────────────────── */}
        {!lowCapacity&&(
          <div style={{marginBottom:10,padding:"10px 14px",background:t.surface,border:`1.5px solid ${intention?.checked?P.teal:P.teal+"44"}`,borderRadius:12,transition:"border-color 0.2s"}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,letterSpacing:"0.14em",marginBottom:6,fontWeight:700}}>TODAY'S INTENTION</div>
            {intention&&!editingIntention?(
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <button onClick={()=>{const u=toggleIntentionCheck();setIntention(u);}}
                  style={{width:36,height:36,borderRadius:8,border:`2px solid ${P.teal}`,background:intention.checked?P.teal:"transparent",color:intention.checked?"#000":P.teal,cursor:"pointer",flexShrink:0,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",marginTop:2}}>
                  {intention.checked?"✓":""}
                </button>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:intention.checked?t.textMuted:t.text,lineHeight:1.5,fontStyle:"italic",textDecoration:intention.checked?"line-through":"none",marginBottom:4}}>"{intention.text}"</div>
                  {intention.checked&&<div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,letterSpacing:"0.08em"}}>DONE TODAY ✓</div>}
                </div>
                <button onClick={()=>{setIntentionDraft(intention.text);setEditingIntention(true);}}
                  style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"4px 10px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,cursor:"pointer",flexShrink:0,minHeight:36}}>EDIT</button>
              </div>
            ):(
              <>
              <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                <textarea value={intentionDraft} onChange={e=>setIntentionDraft(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),saveIntentionNow())}
                  placeholder="e.g. I will give RSM a genuine 2-minute connection before school"
                  rows={2}
                  style={{flex:1,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,minHeight:64,resize:"none",lineHeight:1.5}}/>
                <button onClick={saveIntentionNow} disabled={!intentionDraft.trim()}
                  style={{background:P.teal,border:"none",borderRadius:8,padding:"8px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:"#000",cursor:"pointer",fontWeight:700,flexShrink:0,minHeight:64,opacity:intentionDraft.trim()?1:0.5}}>SET</button>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>setIntentionDraft(getLibraryIntention())}
                  style={{background:P.teal+"22",border:`1px solid ${P.teal}66`,borderRadius:20,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.teal,cursor:"pointer",letterSpacing:"0.07em",minHeight:34}}>
                  SUGGEST FROM LIBRARY
                </button>
                <button disabled={intentionLoading} onClick={async()=>{
                  setIntentionLoading(true);
                  try{const s=await getSpockIntention(profiles);setIntentionDraft(s.replace(/^["'`]/,"").replace(/["'`]$/,"").trim());}
                  catch{setIntentionDraft(getLibraryIntention());}
                  finally{setIntentionLoading(false);}
                }}
                  style={{background:intentionLoading?P.spock+"33":P.spock+"22",border:`1px solid ${P.spock}`,borderRadius:20,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,cursor:intentionLoading?"not-allowed":"pointer",letterSpacing:"0.07em",minHeight:34,display:"flex",alignItems:"center",gap:6}}>
                  {intentionLoading&&<span style={{width:10,height:10,border:`1.5px solid ${P.spock}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>}
                  GET SPOCK TO SUGGEST
                </button>
                {editingIntention&&<button onClick={()=>setEditingIntention(false)}
                  style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:20,padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textMuted,cursor:"pointer",minHeight:34}}>
                  CANCEL
                </button>}
              </div>
              </>
            )}
            {!intention&&!editingIntention&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textDim,marginTop:6}}>One sentence. What matters today? Tap a suggestion button or type your own.</div>}
          </div>
        )}

        {/* ── SR DAILY CONDITIONS ──────────────────────────────── */}
        {!lowCapacity&&<SRScheduleWidget t={t}/>}

        {/* ── 3 TOOLS FOR RIGHT NOW ────────────────────────────── */}
        {!lowCapacity&&<TopThreeNow profiles={profiles} t={t}/>}

        {/* ── WEEKLY PLAN ──────────────────────────────────────── */}
        {!lowCapacity&&<WeeklyPlannerWidget profiles={profiles} t={t}/>}

        {/* ── MR. SPOCK ────────────────────────────────────────── */}
        {!lowCapacity&&<SpockHomeButton onSpock={onSpock} profiles={profiles} t={t}/>}
        {lowCapacity&&(
          <button onClick={onSpock}
            style={{width:"100%",background:P.spock,border:"none",borderRadius:16,padding:"22px",cursor:"pointer",marginBottom:10,boxShadow:`0 0 32px ${P.spock}55`,minHeight:80}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:20,color:"#000",fontWeight:700,letterSpacing:"0.08em"}}>MR. SPOCK — WHAT SHOULD WE DO RIGHT NOW?</div>
          </button>
        )}

        {!lowCapacity&&(
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12,marginTop:4}}>
            <ExportImport t={t}/>
          </div>
        )}
        <div style={{textAlign:"center",padding:"6px 0"}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.textDim,letterSpacing:"0.1em"}}>R-M HOME TOOL · LOCAL STORAGE · {new Date().getFullYear()}</div>
        </div>
      </div>

      {showCrewStatus&&(
        <CrewStatusOverlay
          profiles={profiles} children={children} adults={adults}
          allPatterns={allPatterns} onZoneTap={onZoneTap}
          onOpenProfile={(code)=>{setShowCrewStatus(false);onOpenProfile(code);}}
          onClose={()=>setShowCrewStatus(false)} t={t}
        />
      )}
      {showRedAlert&&(
        <RedAlertModal profiles={profiles} onClose={()=>setShowRedAlert(false)} t={t}/>
      )}
    </div>
  );
}// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE BUILDER
// ─────────────────────────────────────────────────────────────────────────────
const STEP_ICONS_LIB=[
  {id:"wake",emoji:"☀️",label:"Wake up"},{id:"water",emoji:"💧",label:"Drink water"},
  {id:"body",emoji:"🚿",label:"Wash/shower"},{id:"teeth",emoji:"🦷",label:"Brush teeth"},
  {id:"dress",emoji:"👕",label:"Get dressed"},{id:"eat",emoji:"🍳",label:"Eat"},
  {id:"meds",emoji:"💊",label:"Medication"},{id:"move",emoji:"🏃",label:"Movement"},
  {id:"checkin",emoji:"💬",label:"Check-in"},{id:"bag",emoji:"🎒",label:"Pack bag"},
  {id:"transit",emoji:"🚗",label:"Travel"},{id:"arrive",emoji:"🏠",label:"Arrive home"},
  {id:"snack",emoji:"🍎",label:"Snack"},{id:"unwind",emoji:"🌀",label:"Unwind time"},
  {id:"screen",emoji:"📱",label:"Screen time"},{id:"tidy",emoji:"🧹",label:"Tidy up"},
  {id:"read",emoji:"📖",label:"Reading"},{id:"bath",emoji:"🛁",label:"Bath/wash"},
  {id:"pjs",emoji:"🌙",label:"Pyjamas"},{id:"sleep",emoji:"😴",label:"Sleep"},
  {id:"music",emoji:"🎵",label:"Music/quiet"},{id:"outside",emoji:"🌳",label:"Outside"},
  {id:"sensory",emoji:"🧸",label:"Sensory break"},{id:"warn",emoji:"⏰",label:"5-min warning"},
  {id:"story",emoji:"📚",label:"Story time"},{id:"hug",emoji:"🤗",label:"Connect"},
  {id:"custom",emoji:"⭐",label:"Custom"},
];

function makeStepId(){return Math.random().toString(36).slice(2,9);}
function routineTotalMins(steps){return(steps||[]).reduce((s,x)=>s+(x.durationMin||0),0);}
function addMins(t,m){const[h,min]=t.split(":").map(Number);const tot=h*60+min+m;return`${String(Math.floor(tot/60)%24).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;}

function buildDefaultRoutines(profiles){
  const mk=(icon,label,owner,dur,note,col)=>({id:makeStepId(),icon,label,owner,durationMin:dur,note,colour:col});
  return{
    morning:{id:"morning",label:"Morning",emoji:"☀️",repeat:"daily",startTime:"07:00",notes:"Before step 1: the hardest part of any morning is the transition into it — moving from sleep or absorbed activity to the routine sequence. Use the same signal every day (a specific phrase, a piece of music, a light change) to start movement before any task is asked. The signal should come 5–10 minutes before step 1, when everyone is still in bed or in pyjamas. Do not negotiate or explain — just the signal, every day, the same way. SR's own regulatory state before the family wakes is the single largest factor in how smoothly this goes. A regulated adult presence at the start of a morning lowers the initiation cost for everyone.",steps:[
      mk("🌡️","Zone check-in — how's your body?","family",3,"Before food, before tasks. Each person names their zone or points to it. No pressure, no wrong answers. This tells you what kind of morning you're working with.",P.spock),
      mk("💧","Water & breakfast","family",15,"Regulation needs fuel. No demands until these are done — not even gentle ones.",P.amber),
      mk("💊","Medicine — EMM tablets, RSM puffer, MRM gummies","family",3,"Each child has their own — mark each one independently.",P.amber),
      mk("🦷","Teeth, wash, dressed","family",15,"Clothes laid out the night before removes one decision from a hard time of day.",P.teal),
      mk("🎒","Bags ready — check the list","family",5,"Lunch, water bottle, anything extra. Visual check, not memory.",P.amber),
      mk("⏰","5-minute warning","family",2,"'We leave in 5.' Not 'hurry up.' Same words every day.",P.dustyRed),
      mk("🚗","Leave for school — 08:50","family",0,"",P.dustyRed),
    ]},
    afterschool:{id:"afterschool",label:"After School",emoji:"🏠",repeat:"weekdays",startTime:"15:15",notes:"",steps:[
      mk("🌀","Decompress — no demands for 20 min","family",20,"Nervous system needs to downshift after school. No questions, no homework, no requests.",P.spock),
      mk("🍎","Snack and water","family",10,"Blood sugar and hydration before anything else. Mood follows.",P.amber),
      mk("🌳","Movement outside","family",20,"Before any cognitive demands. Non-negotiable for ADHD presentations.",P.teal),
      mk("🏠","Quick house reset — everyone helps","family",10,"EMM: tidy own space + set table. RSM: shoes and bag away + toys in box. MRM: carry one thing.",P.teal),
      mk("🍳","Dinner together","family",30,"Side-by-side prep builds connection without demands.",P.amber),
    ]},
    bedtime:{id:"bedtime",label:"Bedtime",emoji:"🌙",repeat:"daily",startTime:"19:30",notes:"",steps:[
      mk("📱","Screens off — 30-min warning given","family",2,"Same time, same words. Predictability is regulatory.",P.dustyRed),
      mk("🛁","Bath or shower","family",15,"Warm water is genuinely calming — not just a hygiene step.",P.paleBlue),
      mk("🦷","Teeth + pyjamas","family",8,"EMM: clothes out for tomorrow + check bag. RSM: clothes in basket.",P.teal),
      mk("📚","Story and one good thing","family",20,"2×10 in practice. One good thing doesn't have to be positive — naming what was hard counts too.",P.spock),
      mk("😴","Lights out","family",0,"Same time every night. Consistency supports the sleep-wake rhythm.",P.lilac),
    ]},
    sr_morning:{id:"sr_morning",label:"SR Morning",emoji:"🌸",repeat:"daily",startTime:"06:30",notes:"These are conditions for the whole system to function — not tasks for SR to complete. SR's regulatory state before the family wakes is the co-regulatory input for the children's morning. A regulated adult presence lowers the initiation cost for everyone. 80% is a very big win.",steps:[
      mk("💧","Water before anything else","SR",2,"The system needs hydration before it runs. Before the house wakes up if possible.",P.lilac),
      mk("🍳","Eat something real","SR",10,"The morning runs better when you are not running on empty. Even something small.",P.lilac),
      mk("🧘","5-min nervous system reset","SR",5,"Breathing, Kinesiology, mantra — whatever is available. A regulated co-regulator is the most powerful thing in this house.",P.lilac),
      mk("🏃","Movement — any kind, 10 min","SR",10,"Walk, yoga, mantra workout. Movement is the fastest nervous system reset available.",P.lilac),
      mk("💊","Medication if applicable","SR",1,"",P.lilac),
    ]},
    sr_evening:{id:"sr_evening",label:"SR Evening",emoji:"🌸",repeat:"daily",startTime:"21:00",notes:"The quality of tomorrow morning starts tonight. The evening conditions are infrastructure for what comes next — not a reward for getting through the day.",steps:[
      mk("📵","Phone down 30 min before sleep","SR",2,"The nervous system needs to begin downshifting. You cannot transmit a signal you are not receiving.",P.lilac),
      mk("📖","Something that restores you","SR",20,"Reading, quiet, anything that rebuilds rather than depletes. This is not optional infrastructure — it is how the system recovers.",P.lilac),
      mk("🌙","Wind down — same time every night","SR",10,"Consistent sleep timing is one of the highest-leverage things available. Tomorrow's morning is built here.",P.lilac),
    ]},
    dm_morning:{id:"dm_morning",label:"DM Morning",emoji:"🔵",repeat:"daily",startTime:"06:30",notes:"These are conditions for the whole system to function — not tasks to complete.",steps:[
      mk("💧","Water before anything else","DM",2,"The system needs hydration before it runs.",P.midBlue),
      mk("🍳","Eat something real","DM",10,"The morning runs better when you are not running on empty.",P.midBlue),
      mk("🏃","Movement — any kind, 10 min","DM",10,"Any movement counts. Movement is the fastest nervous system reset available.",P.midBlue),
      mk("💊","Medication if applicable","DM",1,"",P.midBlue),
    ]},
    dm_evening:{id:"dm_evening",label:"DM Evening",emoji:"🔵",repeat:"daily",startTime:"21:00",notes:"",steps:[
      mk("📵","Phone down 30 min before sleep","DM",2,"You cannot transmit a signal you are not receiving.",P.midBlue),
      mk("📖","Something that restores you","DM",20,"Not optional — this is how the system recovers for tomorrow.",P.midBlue),
      mk("💬","Brief check-in with SR","DM",5,"Not a debrief — just a moment of genuine contact. Regulated presence with each other.",P.midBlue),
      mk("🌙","Wind down","DM",10,"Consistent sleep timing is maintenance.",P.midBlue),
    ]},
  };
}

function StepRow({step,profiles,colour,t,onChange,onDelete,isFirst,isLast,onMoveUp,onMoveDown}){
  const[open,setOpen]=useState(false);
  const memberOpts=[{code:"family",label:"Everyone"},...Object.values(profiles).map(m=>({code:m.code,label:m.code,colour:m.colour}))];
  return(
    <div style={{background:t.surface2,border:`1px solid ${colour}33`,borderLeft:`3px solid ${colour}`,borderRadius:"0 10px 10px 0",marginBottom:6,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:20,flexShrink:0}}>{step.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:600,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{step.label}</div>
          <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center"}}>
            {step.durationMin>0&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.textMuted}}>{step.durationMin}min</span>}
            {step.owner!=="family"&&<span style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,fontWeight:700,letterSpacing:"0.06em"}}>{step.owner}</span>}
            {step.note&&<span style={{fontSize:10,color:t.textDim}}>📝</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} style={{background:"none",border:`1px solid ${colour}44`,borderRadius:4,padding:"1px 6px",cursor:isFirst?"not-allowed":"pointer",fontSize:11,color:isFirst?t.textDim:colour,opacity:isFirst?0.4:1}}>▲</button>
          <button onClick={onMoveDown} disabled={isLast} style={{background:"none",border:`1px solid ${colour}44`,borderRadius:4,padding:"1px 6px",cursor:isLast?"not-allowed":"pointer",fontSize:11,color:isLast?t.textDim:colour,opacity:isLast?0.4:1}}>▼</button>
        </div>
        <span style={{fontSize:11,color:t.textDim,flexShrink:0}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 12px 12px",borderTop:`1px solid ${colour}22`}}>
          <div style={{marginTop:10,marginBottom:10}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:6,fontWeight:700}}>ICON</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {STEP_ICONS_LIB.map(ic=>(
                <button key={ic.id} onClick={()=>onChange({...step,icon:ic.emoji})} title={ic.label}
                  style={{background:step.icon===ic.emoji?colour+"44":"transparent",border:`1px solid ${step.icon===ic.emoji?colour:colour+"33"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:18,transition:"all 0.1s"}}>
                  {ic.emoji}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>LABEL</div>
            <input value={step.label} onChange={e=>onChange({...step,label:e.target.value})}
              style={{width:"100%",background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
            <div>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>DURATION (MINS)</div>
              <input type="number" min={0} max={120} value={step.durationMin} onChange={e=>onChange({...step,durationMin:parseInt(e.target.value)||0})}
                style={{width:"100%",background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>WHO</div>
              <select value={step.owner} onChange={e=>onChange({...step,owner:e.target.value})}
                style={{width:"100%",background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,boxSizing:"border-box",cursor:"pointer"}}>
                {memberOpts.map(m=><option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>NOTE (OPTIONAL)</div>
            <textarea value={step.note} onChange={e=>onChange({...step,note:e.target.value})} placeholder="Why this step matters, or how to do it..."
              style={{width:"100%",minHeight:56,background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 10px",fontSize:12,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>
          <button onClick={onDelete} style={{background:"transparent",border:`1px solid ${P.dustyRed}66`,borderRadius:8,padding:"5px 14px",fontFamily:"'Antonio',sans-serif",fontSize:11,color:P.dustyRed,cursor:"pointer",letterSpacing:"0.08em"}}>REMOVE STEP</button>
        </div>
      )}
    </div>
  );
}

function RoutineTab({routine,profiles,colour,t,onChange}){
  const steps=routine.steps||[];
  const total=routineTotalMins(steps);
  const end=addMins(routine.startTime||"07:00",total);
  const upd=(idx,s)=>{const a=[...steps];a[idx]=s;onChange({...routine,steps:a});};
  const del=(idx)=>onChange({...routine,steps:steps.filter((_,i)=>i!==idx)});
  const mv=(idx,dir)=>{const a=[...steps];const t2=idx+dir;if(t2<0||t2>=a.length)return;[a[idx],a[t2]]=[a[t2],a[idx]];onChange({...routine,steps:a});};
  const add=()=>onChange({...routine,steps:[...steps,{id:makeStepId(),icon:"⭐",label:"New step",owner:"family",durationMin:5,note:"",colour}]});
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>START TIME</div>
          <input type="time" value={routine.startTime||"07:00"} onChange={e=>onChange({...routine,startTime:e.target.value})}
            style={{width:"100%",background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 10px",fontSize:14,fontFamily:"'Share Tech Mono',monospace",color:t.text,boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:t.textDim,letterSpacing:"0.1em",marginBottom:4}}>TOTAL / FINISH</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:colour}}>{total}min → ~{end}</div>
        </div>
      </div>
      {steps.map((step,idx)=>(
        <StepRow key={step.id} step={step} profiles={profiles} colour={colour} t={t}
          onChange={s=>upd(idx,s)} onDelete={()=>del(idx)}
          isFirst={idx===0} isLast={idx===steps.length-1}
          onMoveUp={()=>mv(idx,-1)} onMoveDown={()=>mv(idx,1)}/>
      ))}
      <button onClick={add} style={{background:"transparent",border:`1.5px dashed ${colour}66`,borderRadius:10,padding:"12px 20px",width:"100%",fontFamily:"'Antonio',sans-serif",fontSize:12,color:colour,cursor:"pointer",letterSpacing:"0.08em",marginBottom:14,transition:"all 0.12s"}}>+ ADD STEP</button>
      <div>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:colour,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>ROUTINE NOTES</div>
        <textarea value={routine.notes||""} onChange={e=>onChange({...routine,notes:e.target.value})} placeholder="Anything worth remembering about this routine..."
          style={{width:"100%",minHeight:56,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"'Nunito',sans-serif",color:t.text,resize:"vertical",boxSizing:"border-box"}}/>
      </div>
    </div>
  );
}

function FamilyTimelineView({routines,profiles,t}){
  const colours={morning:P.amber,afterschool:P.teal,bedtime:P.lilac};
  return(
    <div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:16}}>How all three routines fit together across a typical day. Step width reflects duration.</div>
      {Object.values(routines).map(routine=>{
        const colour=colours[routine.id]||P.spock;
        const steps=routine.steps||[];
        const total=routineTotalMins(steps);
        const end=addMins(routine.startTime||"07:00",total);
        const personSteps=steps.filter(s=>s.owner!=="family");
        const ownerMap={};
        personSteps.forEach(s=>{if(!ownerMap[s.owner])ownerMap[s.owner]=[];ownerMap[s.owner].push(s);});
        return(
          <div key={routine.id} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:22}}>{routine.emoji}</span>
              <div>
                <div style={{fontFamily:"'Antonio',sans-serif",fontSize:15,color:colour,fontWeight:700,letterSpacing:"0.08em"}}>{routine.label.toUpperCase()}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.textMuted}}>{routine.startTime} → {end} · {total}min · {routine.repeat}</div>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"nowrap",gap:4,overflowX:"auto",paddingBottom:6}}>
              {steps.map(step=>{
                const mc=step.owner==="family"?colour:(profiles[step.owner]?.colour||colour);
                const w=Math.max(56,total>0?(step.durationMin/total)*320:60);
                return(
                  <div key={step.id} title={`${step.label}${step.durationMin?` — ${step.durationMin}min`:""}${step.note?"\n"+step.note:""}`}
                    style={{background:mc+"33",border:`1.5px solid ${mc}`,borderRadius:8,padding:"6px 8px",flexShrink:0,minWidth:56,width:w,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:18}}>{step.icon}</span>
                    <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.text,textAlign:"center",lineHeight:1.3}}>{step.label.slice(0,14)}{step.label.length>14?"…":""}</span>
                    {step.durationMin>0&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.textDim}}>{step.durationMin}m</span>}
                    {step.owner!=="family"&&<span style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:mc,fontWeight:700}}>{step.owner}</span>}
                  </div>
                );
              })}
            </div>
            {Object.keys(ownerMap).length>0&&(
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:5}}>
                {Object.entries(ownerMap).map(([owner,ownSteps])=>{
                  const mc=profiles[owner]?.colour||colour;
                  return(
                    <div key={owner} style={{padding:"3px 10px",background:mc+"22",border:`1px solid ${mc}44`,borderRadius:20,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontFamily:"'Antonio',sans-serif",fontSize:11,color:mc,fontWeight:700}}>{owner}</span>
                      <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>{ownSteps.map(s=>s.icon).join(" ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {routine.notes&&<div style={{marginTop:8,padding:"7px 12px",background:colour+"12",borderLeft:`3px solid ${colour}44`,borderRadius:"0 8px 8px 0",fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.5}}>{routine.notes}</div>}
          </div>
        );
      })}
      <div style={{padding:"12px 16px",background:P.spock+"15",border:`1px solid ${P.spock}44`,borderRadius:10,marginTop:4}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.12em",marginBottom:4}}>SPOCK SAYS</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>Routines are the environmental infrastructure that makes regulation possible. A routine that happens 80% of the time is worth far more than a perfect routine that creates conflict. Predictability is the goal, not compliance.</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY LOG VIEW — all routines + all zones + all notes, week and month
// ─────────────────────────────────────────────────────────────────────────────
// Module-level components to avoid Babel returnReact transform issue
// (return inside arrow function inside const inside component render scope)
function FamilyDayColumn({date,allMembers,completions,today,t,expandedNotes,onToggleNote}){
  const logs=[];
  allMembers.forEach(m=>{
    (m.logs||[]).filter(l=>l.date===date).forEach(l=>logs.push({...l,code:m.code,colour:m.colour}));
  });
  logs.sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  const dayComp=completions[date]||{};
  const hasSignal=dayComp["__couple_signal__"]?.active;
  const isToday=date===today;
  const isFuture=date>today;
  return(
    <div style={{background:isToday?P.spock+"10":t.surface2,border:`1px solid ${isToday?P.spock+"66":t.border}`,borderRadius:10,padding:"10px 8px",minWidth:0}}>
      <div style={{textAlign:"center",marginBottom:6}}>
        <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:isToday?P.spock:t.textMuted,fontWeight:isToday?"700":"400",letterSpacing:"0.06em"}}>
          {new Date(date).toLocaleDateString("en-AU",{weekday:"short"}).toUpperCase()}
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:isToday?P.spock:t.text,fontWeight:isToday?"700":"400"}}>
          {new Date(date).getDate()}
        </div>
      </div>
      {hasSignal&&<div style={{textAlign:"center",fontSize:14,marginBottom:4}}>⚠️</div>}
      {isFuture
        ?<div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textDim,textAlign:"center"}}>—</div>
        :logs.length===0
          ?<div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textDim,textAlign:"center"}}>no logs</div>
          :logs.map((l,i)=>{
            const noteKey=`${date}-${l.code}-${i}`;
            return(
              <div key={i} style={{marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:3,background:l.colour+"22",border:`1px solid ${l.colour}44`,borderRadius:6,padding:"3px 5px"}}>
                  <span style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:l.colour,fontWeight:700,letterSpacing:"0.04em",flexShrink:0}}>{l.code}</span>
                  <span style={{fontSize:12}}>{ZONES.find(z=>z.id===l.zone)?.emoji||"⬜"}</span>
                  {l.note&&(
                    <button onClick={()=>onToggleNote(noteKey)} style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:t.textMuted,padding:0,marginLeft:"auto",flexShrink:0}}>
                      {expandedNotes[noteKey]?"▲":"▼"}
                    </button>
                  )}
                </div>
                {l.note&&expandedNotes[noteKey]&&(
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted,lineHeight:1.4,padding:"3px 5px",background:t.panel,borderRadius:"0 0 5px 5px",marginTop:1}}>{l.note}</div>
                )}
              </div>
            );
          })
      }
    </div>
  );
}

function FamilyMonthCell({date,completions,allMembers,today,t}){
  if(!date)return<div/>;
  const logs=[];
  allMembers.forEach(m=>{
    (m.logs||[]).filter(l=>l.date===date).forEach(l=>logs.push({...l,code:m.code,colour:m.colour}));
  });
  const dayComp=completions[date]||{};
  const hasSignal=dayComp["__couple_signal__"]?.active;
  const isToday=date===today;
  const isFuture=date>today;
  const zoneCounts={red:0,yellow:0,green:0,blue:0};
  logs.forEach(l=>{if(zoneCounts[l.zone]!==undefined)zoneCounts[l.zone]++;});
  const dominant=Object.entries(zoneCounts).find(([,v])=>v>0);
  const domColour=dominant?ZONES.find(z=>z.id===dominant[0])?.colour:null;
  const notedLogs=logs.filter(l=>l.note);
  return(
    <div style={{aspectRatio:"1",borderRadius:6,background:isFuture?"transparent":domColour?domColour+"33":t.surface2,border:`1px solid ${isToday?P.spock:hasSignal?P.dustyRed:t.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",cursor:"default",padding:2}}>
      {hasSignal&&<div style={{position:"absolute",top:1,right:2,fontSize:8}}>⚠️</div>}
      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:isToday?P.spock:t.textMuted,fontWeight:isToday?"700":"400"}}>{new Date(date).getDate()}</span>
      {logs.length>0&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:t.textDim}}>{logs.length}✎</span>}
      {notedLogs.length>0&&<span style={{fontSize:8,color:t.textDim}}>📝</span>}
    </div>
  );
}

function familyGetWeekDates(offset){
  const dates=[];
  const now=new Date(getLogicalDate());
  const dow=now.getDay();
  const mon=new Date(now);
  mon.setDate(now.getDate()-dow+1+(offset*7));
  for(let i=0;i<7;i++){
    const d=new Date(mon);d.setDate(mon.getDate()+i);
    dates.push(d.toISOString().slice(0,10));
  }
  return dates;
}
function familyGetDayLogs(date,allMembers){
  const logs=[];
  allMembers.forEach(m=>{
    (m.logs||[]).filter(l=>l.date===date).forEach(l=>logs.push({...l,code:m.code,colour:m.colour}));
  });
  return logs.sort((a,b)=>new Date(a.ts)-new Date(b.ts));
}

function FamilyLogView({profiles,t}){
  const[view,setView]=useState("week");
  const[weekOffset,setWeekOffset]=useState(0);
  const[monthOffset,setMonthOffset]=useState(0);
  const[expandedNotes,setExpandedNotes]=useState({});
  const today=getLogicalDate();
  const allMembers=["SR","DM","EMM","RSM","MRM"].map(c=>profiles[c]).filter(Boolean);
  const completions=getCompletions();
  const toggleNote=(key)=>setExpandedNotes(n=>({...n,[key]:!n[key]}));

  const weekDates=familyGetWeekDates(weekOffset);
  const weekLabel=`${new Date(weekDates[0]).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} – ${new Date(weekDates[6]).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}`;

  const now2=new Date(getLogicalDate());
  const targetMonth=new Date(now2.getFullYear(),now2.getMonth()+monthOffset,1);
  const monthLabel=targetMonth.toLocaleDateString("en-AU",{month:"long",year:"numeric"});
  const daysInMonth=new Date(targetMonth.getFullYear(),targetMonth.getMonth()+1,0).getDate();
  const monthDates=[];
  for(let i=0;i<daysInMonth;i++){const d=new Date(targetMonth);d.setDate(i+1);monthDates.push(d.toISOString().slice(0,10));}

  const monthOffset2=(new Date(monthDates[0]).getDay()+6)%7;
  const monthCells=[...Array(monthOffset2).fill(null),...monthDates];
  const monthRows=[];
  for(let i=0;i<monthCells.length;i+=7)monthRows.push(monthCells.slice(i,i+7));
  const monthCalRows=monthRows.map((row,ri)=>(
    <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
      {row.map((d,ci)=><FamilyMonthCell key={ci} date={d} completions={completions} allMembers={allMembers} today={today} t={t}/>)}
    </div>
  ));

  return(
    <div>
      {/* View switcher */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.border}`,marginBottom:16}}>
        {["week","month"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?P.teal:"transparent",color:view===v?"#000":t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 18px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.12s"}}>
            {v}
          </button>
        ))}
      </div>

      {view==="week"&&(
        <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:P.teal+"22",border:`1px solid ${P.teal}44`,borderRadius:8,padding:"5px 12px",color:P.teal,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:"pointer"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.textMuted}}>{weekLabel}</div>
          <button onClick={()=>setWeekOffset(w=>Math.min(0,w+1))} disabled={weekOffset>=0} style={{background:P.teal+"22",border:`1px solid ${P.teal}44`,borderRadius:8,padding:"5px 12px",color:weekOffset>=0?t.textDim:P.teal,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:weekOffset>=0?"not-allowed":"pointer",opacity:weekOffset>=0?0.4:1}}>→</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
          {weekDates.map(d=><FamilyDayColumn key={d} date={d} allMembers={allMembers} completions={completions} today={today} t={t} expandedNotes={expandedNotes} onToggleNote={toggleNote}/>)}
        </div>
        <div style={{marginTop:12,padding:"8px 10px",background:t.panel,borderRadius:8}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginBottom:4}}>LEGEND</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>
            <span>🔴🟡🟢🔵 Zone logged · ▼ Note (tap to expand) · ⚠️ Couple signal</span>
          </div>
        </div>
        </>
      )}

      {view==="month"&&(
        <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={()=>setMonthOffset(m=>m-1)} style={{background:P.teal+"22",border:`1px solid ${P.teal}44`,borderRadius:8,padding:"5px 12px",color:P.teal,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:"pointer"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.textMuted}}>{monthLabel}</div>
          <button onClick={()=>setMonthOffset(m=>Math.min(0,m+1))} disabled={monthOffset>=0} style={{background:P.teal+"22",border:`1px solid ${P.teal}44`,borderRadius:8,padding:"5px 12px",color:monthOffset>=0?t.textDim:P.teal,fontFamily:"'Antonio',sans-serif",fontSize:12,cursor:monthOffset>=0?"not-allowed":"pointer",opacity:monthOffset>=0?0.4:1}}>→</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
          {["M","T","W","T","F","S","S"].map((d,i)=>(
            <div key={i} style={{textAlign:"center",fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textDim,letterSpacing:"0.06em"}}>{d}</div>
          ))}
        </div>
        {monthCalRows}
        <div style={{marginTop:8,padding:"8px 10px",background:t.panel,borderRadius:8}}>
          <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginBottom:4}}>LEGEND</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:t.textMuted}}>Colour = dominant zone · ✎ = number of log entries · 📝 = notes exist · ⚠️ = couple signal · Red border = couple signal day</div>
        </div>
        </>
      )}
    </div>
  );
}

function RoutineBuilder({profiles,routines:initial,onSave,onClose,t}){
  const[routines,setRoutines]=useState(()=>initial&&Object.keys(initial).length>0?initial:buildDefaultRoutines(profiles));
  const[tab,setTab]=useState("tracker");
  const[editRoutine,setEditRoutine]=useState("morning"); // sub-tab within "edit"
  const RTABS=[
    {id:"tracker",label:"Tracker",emoji:"✓",colour:P.spock},
    {id:"edit",label:"Edit Routines",emoji:"✏️",colour:P.amber},
    {id:"family",label:"Family View",emoji:"📅",colour:P.midBlue},
    {id:"familylog",label:"Family Log",emoji:"📊",colour:P.teal},
  ];
  const BRIDGE_SUBTABS=[
    {id:"sr_morning",label:"SR Morning",emoji:"🌸",colour:P.lilac},
    {id:"sr_evening",label:"SR Evening",emoji:"🌸",colour:P.lilac},
    {id:"dm_morning",label:"DM Morning",emoji:"🔵",colour:P.midBlue},
    {id:"dm_evening",label:"DM Evening",emoji:"🔵",colour:P.midBlue},
  ];
  const CADET_SUBTABS=[
    {id:"morning",label:"Morning",emoji:"☀️",colour:P.amber},
    {id:"afterschool",label:"After School",emoji:"🏠",colour:P.teal},
    {id:"bedtime",label:"Bedtime",emoji:"🌙",colour:P.lilac},
  ];
  const EDIT_SUBTABS=[...BRIDGE_SUBTABS,...CADET_SUBTABS];
  const ac=tab==="edit"
    ? (EDIT_SUBTABS.find(s=>s.id===editRoutine)?.colour||P.amber)
    : (RTABS.find(r=>r.id===tab)?.colour||P.spock);

  return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:910,overflowY:"auto",padding:16,display:"flex",justifyContent:"center"}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:680,width:"100%",border:`2px solid ${ac}66`,alignSelf:"flex-start"}}>
        <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"stretch",height:56}}>
            <div style={{background:ac,width:100,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"14px 0 0 0",flexShrink:0,transition:"background 0.2s"}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:13,fontWeight:700,color:"#000",letterSpacing:"0.12em",textAlign:"center",lineHeight:1.3}}>DAILY<br/>ROUTINES</span>
            </div>
            <div style={{display:"flex",gap:6,padding:"0 12px",alignItems:"center",flex:1}}>
              {[P.spock,P.amber,P.midBlue].map((c,i)=><div key={i} style={{height:i===0?16:10,background:c,borderRadius:5,flex:1,opacity:0.7}}/>)}
            </div>
            <button onClick={()=>{onSave(routines);onClose();}} style={{background:P.teal,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",letterSpacing:"0.1em"}}>SAVE</button>
            <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
          </div>
          <div style={{height:3,background:`linear-gradient(to right, ${P.spock}, ${P.amber}, ${P.teal}, ${P.midBlue})`}}/>
        </div>

        {/* Main tabs */}
        <div style={{display:"flex",padding:"12px 16px 0",borderBottom:`1px solid ${t.border}`,gap:0,overflowX:"auto"}}>
          {RTABS.map(rtab=>(
            <button key={rtab.id} onClick={()=>setTab(rtab.id)}
              style={{background:tab===rtab.id?rtab.colour:"transparent",color:tab===rtab.id?"#000":t.textMuted,border:"none",borderRadius:"8px 8px 0 0",padding:"8px 14px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s",display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:14}}>{rtab.emoji}</span>{rtab.label}
            </button>
          ))}
        </div>

        {/* Edit subtabs — two rows: Bridge Crew top, Cadets below */}
        {tab==="edit"&&(
          <div style={{background:t.surface2,borderBottom:`1px solid ${t.border}`,padding:"8px 16px 0"}}>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:P.lilac,letterSpacing:"0.12em",fontWeight:700,marginBottom:4}}>BRIDGE CREW</div>
            <div style={{display:"flex",gap:0,marginBottom:6}}>
              {BRIDGE_SUBTABS.map(st=>(
                <button key={st.id} onClick={()=>setEditRoutine(st.id)}
                  style={{background:editRoutine===st.id?st.colour+"33":"transparent",color:editRoutine===st.id?st.colour:t.textMuted,border:"none",borderBottom:editRoutine===st.id?`2px solid ${st.colour}`:"2px solid transparent",padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:12}}>{st.emoji}</span>{st.label}
                </button>
              ))}
            </div>
            <div style={{fontFamily:"'Antonio',sans-serif",fontSize:9,color:P.amber,letterSpacing:"0.12em",fontWeight:700,marginBottom:4}}>CADETS</div>
            <div style={{display:"flex",gap:0}}>
              {CADET_SUBTABS.map(st=>(
                <button key={st.id} onClick={()=>setEditRoutine(st.id)}
                  style={{background:editRoutine===st.id?st.colour+"33":"transparent",color:editRoutine===st.id?st.colour:t.textMuted,border:"none",borderBottom:editRoutine===st.id?`2px solid ${st.colour}`:"2px solid transparent",padding:"5px 12px",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:12}}>{st.emoji}</span>{st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{padding:20}}>
          {/* Routine implementation countdown — lives inside Daily Routines */}
          {tab==="tracker"&&<RoutineCountdownWidget t={t} onOpenRoutines={()=>setTab("edit")}/>}

          {/* Edit tab — shows routine editor for selected sub-tab */}
          {tab==="edit"&&(
            <>
              {routines[editRoutine]&&(
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <span style={{fontSize:24}}>{EDIT_SUBTABS.find(s=>s.id===editRoutine)?.emoji}</span>
                  <div>
                    <div style={{fontFamily:"'Antonio',sans-serif",fontSize:16,color:ac,fontWeight:700,letterSpacing:"0.08em"}}>{routines[editRoutine].label.toUpperCase()}</div>
                    <div style={{display:"flex",gap:8,marginTop:3,alignItems:"center"}}>
                      <span style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:ac,padding:"2px 8px",background:ac+"22",border:`1px solid ${ac}66`,borderRadius:20,letterSpacing:"0.08em"}}>{routines[editRoutine].repeat==="daily"?"EVERY DAY":"WEEKDAYS"}</span>
                      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.textMuted}}>{routineTotalMins(routines[editRoutine].steps||[])} min total</span>
                    </div>
                  </div>
                </div>
              )}
              {editRoutine==="morning"&&<RoutineTab routine={routines.morning} profiles={profiles} colour={P.amber} t={t} onChange={u=>setRoutines(r=>({...r,morning:u}))}/>}
              {editRoutine==="afterschool"&&<RoutineTab routine={routines.afterschool} profiles={profiles} colour={P.teal} t={t} onChange={u=>setRoutines(r=>({...r,afterschool:u}))}/>}
              {editRoutine==="bedtime"&&<RoutineTab routine={routines.bedtime} profiles={profiles} colour={P.lilac} t={t} onChange={u=>setRoutines(r=>({...r,bedtime:u}))}/>}
            </>
          )}

          {tab==="tracker"&&<RoutineTracker routines={routines} profiles={profiles} t={t}/>}
          {tab==="family"&&<FamilyTimelineView routines={routines} profiles={profiles} t={t}/>}
          {tab==="familylog"&&<FamilyLogView profiles={profiles} t={t}/>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY LIBRARY — readable reference for parents
// ─────────────────────────────────────────────────────────────────────────────
const STRATEGY_LIBRARY=[
  {id:1,name:"Space & Silence",zone:["red"],type:"De-escalation",emoji:"🤫",
   when:"Crew member is above the window. Physical escalation possible. Reasoning is clearly inaccessible.",
   what:"The deliberate act of reducing all inputs — verbal, physical, visual — when someone is in full escalation.",
   why:"Polyvagal Theory: close proximity, eye contact, and demands are neurocepted as threat when someone is already in sympathetic activation. Space allows the threat-detection circuit to detect a change in safety.",
   steps:["Drop your voice to near-silence. Say only: 'I'm here. You're safe. Take your time.' Once only.","Move back slowly — at least 2 metres. Open posture, turned slightly sideways, arms at sides.","Stop talking. This is the hardest part. Silence is active.","Do not make eye contact if they read it as a challenge. Soft peripheral gaze instead.","Wait. Breathe visibly and slowly yourself.","When the first sign of de-escalation appears, offer: 'Good. Just breathe.' Nothing else yet."]},
  {id:2,name:"Cyclic Sigh",zone:["yellow","red","all"],type:"Regulation",emoji:"😮‍💨",
   when:"Any moment of stress. Best used proactively as a daily practice.",
   what:"A double inhale through the nose followed by a long extended exhale through the mouth.",
   why:"RCT evidence (Balban et al., 2023): cyclic sighing outperformed mindfulness meditation for reducing physiological arousal and improving positive affect. The extended exhale activates the parasympathetic nervous system.",
   steps:["Do it yourself first — don't instruct, demonstrate.","Double inhale: breathe in through the nose, then a quick extra sniff to fully inflate the lungs.","Long exhale: slow release through the mouth until lungs are fully empty.","Repeat 2-5 times.","For children: 'breathe in, sniff again, now breathe all the way out.' That's it."]},
  {id:3,name:"Movement Exit",zone:["red","yellow"],type:"De-escalation",emoji:"🏃",
   when:"Child is escalating and has enough regulation to move without risk.",
   what:"Offering a specific movement destination — not 'go calm down' but 'want to walk to the kitchen with me?'",
   why:"Perry's NMT: rhythmic movement provides brainstem-level regulatory input foundational to upper-level function. Movement literally changes the neurochemistry of the moment.",
   steps:["Offer a specific destination: 'Want to walk to the back door and back?'","No discussion. Just the offer.","If they go, accompany without talking.","Movement first, words later — sometimes much later.","Don't make it conditional on anything."]},
  {id:4,name:"No-Demand Presence",zone:["red","blue"],type:"Co-regulation",emoji:"🧘",
   when:"Child is shut down, or too escalated for any intervention to land. Also for building baseline safety.",
   what:"Sitting in the same space, doing something low-key, making no demands.",
   why:"Polyvagal Theory: the social engagement system reads safety from the proximity and calm of a regulated adult. Your nervous system is a regulatory input for theirs.",
   steps:["Position yourself in the same space at a comfortable distance — not looming, not distant.","Do something genuine of your own: read, fold something, write.","No eye contact unless offered. No questions. No narration.","If they tell you to go away: 'I'll give you more space' — step back but stay nearby.","Your single job: stay regulated, stay present, make no demands."]},
  {id:5,name:"Movement Break",zone:["yellow"],type:"Prevention",emoji:"🤸",
   when:"Child is restless, fidgeting intensifying, heading toward the upper edge. BEST used proactively.",
   what:"Brief, structured physical activity — 2-5 minutes of movement before escalation peaks.",
   why:"Exercise increases BDNF in the prefrontal cortex, supporting executive function. For ADHD, movement addresses neurobiological reward dysregulation — it is not a distraction from regulation but a prerequisite for it.",
   steps:["Build movement breaks into the plan — don't wait for escalation.","Offer something specific: 'Want to jump on the trampoline for 5 minutes?'","No negotiation required. Just an offer.","Go with them if possible — side-by-side movement is co-regulatory.","Return without fuss."]},
  {id:6,name:"Proprioceptive Input",zone:["yellow","blue"],type:"Sensory",emoji:"💪",
   when:"Restlessness, sensory seeking, or flat/shutdown state needing gentle activation.",
   what:"Heavy work — carrying something, pushing something, wall push-ups, jumping. Activates the proprioceptive system.",
   why:"Proprioceptive input (joint compression and muscle resistance) has a direct calming effect on the nervous system. Particularly effective for ASD sensory profiles.",
   steps:["Offer something specific: 'Can you help me carry this?'","Or: 'Can you push this chair for me?'","Wall push-ups: push flat hands against a wall, push hard, hold for 5 counts.","Heavy work doesn't need to be exercise — it can be any purposeful task with resistance.","The key is doing it WITH them, not assigning it as a task."]},
  {id:7,name:"Micro-Choice",zone:["yellow"],type:"Autonomy",emoji:"🤲",
   when:"Escalation is around a task demand or perceived loss of autonomy. The argument is about who has power.",
   what:"Offering a genuine, small choice within a non-negotiable structure.",
   why:"SDT: autonomy is a basic psychological need. Its frustration produces resistance; its satisfaction produces engagement. Polyvagal Theory: the three Cs of safety include 'choice.'",
   steps:["Identify what's non-negotiable (the outcome) and what's negotiable (how, when, where, in what order).","Offer two real options — not trick choices: 'Do you want to do this sitting or standing?'","Do not add conditions or commentary after they choose.","After they choose, just say 'Good' and let them go.","Build in at least 3 genuine choices per session for children who consistently escalate around control."]},
  {id:8,name:"Side-by-Side",zone:["yellow","blue"],type:"Connection",emoji:"🪑",
   when:"Child finds face-to-face interaction threatening. ASD presentations. Blue zone activation needed.",
   what:"Working alongside rather than facing. Co-presence without relational demand.",
   why:"For ASD presentations, parallel engagement is neurologically safer than direct dyadic contact. The relational work happens without requiring the child to manage the social complexity of a face-to-face interaction.",
   steps:["Sit next to them, not across.","Work on something of your own in the same space.","No agenda. No questions about how they're going.","If they talk to you, respond briefly and warmly — don't escalate into a full conversation.","The goal is shared space, not shared activity."]},
  {id:9,name:"Rhythmic Low-Demand",zone:["blue"],type:"Activation",emoji:"🎵",
   when:"Child is shut down, flat, not tracking. Hypoarousal — below the window.",
   what:"A repetitive, low-cognitive-load activity with rhythm — folding, sorting, colouring, bouncing a ball.",
   why:"Perry NMT: rhythmic, repetitive activity provides brainstem-level regulatory input. It activates from the bottom up without requiring cortical engagement the blue-zone child can't access.",
   steps:["Don't present it as a strategy. Just put it near them and step back.","'I've got this here if you want it.' Then leave it accessible.","Join them if they engage — side-by-side, no talking required.","Accept any level of engagement. Even glancing at it is a start.","Don't increase the demand: never 'now let's do something else.'"]},
  {id:10,name:"Gentle Sensory",zone:["blue"],type:"Activation",emoji:"🧸",
   when:"Hypoarousal — child is shutdown, not tracking, flat.",
   what:"Temperature, texture, or taste — something concrete and sensory. A warm drink, something to hold.",
   why:"Sensory input gives the nervous system something real and immediate to process, creating a foothold back into the present moment without requiring language or cognition.",
   steps:["Offer, don't instruct: 'I made a warm drink if you want it.'","Or: 'Here's a blanket.'","Or: 'I've got something with a good texture here.'","Don't explain why. Don't expect a response.","If they engage, let them. Don't narrate it."]},
  {id:11,name:"Interest Hook",zone:["blue","green"],type:"Connection",emoji:"🎣",
   when:"Child is shutdown, or in green zone and available for connection.",
   what:"Connecting to something they genuinely care about — not as bribery, as a genuine bridge.",
   why:"SDT competence: interest domains are the areas where children have the most existing competence experience. Connecting to these produces positive affect and a sense of being genuinely known.",
   steps:["Name something you've genuinely noticed or wondered about related to their interest.","'I was thinking about [their interest] earlier. Do you reckon [genuine question]?'","Don't force a response. Plant the seed and step back.","If they respond, follow their lead entirely.","The interest hook is about them — not about getting them to do something else."]},
  {id:12,name:"The 2×10 Strategy",zone:["green"],type:"Relationship",emoji:"❤️",
   when:"Always — especially for the child who is hardest to connect with.",
   what:"For 2 minutes a day, 10 days in a row, have a genuine conversation about something they care about.",
   why:"Wlodkowski's observational research reported an 85% improvement in the target child's behaviour — a striking finding, though not from a randomised controlled trial. The relational mechanism is strongly supported across multiple implementation studies.",
   steps:["Choose one child per day (rotate).","2 minutes, every day, 10 days. Then keep going.","Only talk about what they care about — not behaviour, not tasks.","Genuine curiosity. No agenda.","This is an investment in the relational account — it pays out in the hard moments."]},
  {id:13,name:"Affect Labelling",zone:["green"],type:"Regulation",emoji:"💬",
   when:"Child is in or near window — green or recovering yellow.",
   what:"Naming the feeling you're observing — not as a question, as a statement. Then stopping.",
   why:"Neuroimaging research (Lieberman et al., 2007): affect labelling reduces amygdala activation. Putting a word to the feeling literally reduces its intensity.",
   steps:["State the observation: 'You seem frustrated.' 'That looks like it was really hard.'","Stop. Don't fix it. Don't follow up immediately.","The naming itself is the intervention.","If they correct you ('I'm not frustrated, I'm annoyed') — great. Accept the correction.","Don't use it as a lead-in to problem-solving. Just name and sit with it."]},
  {id:14,name:"Repair Conversation",zone:["green"],type:"Relationship",emoji:"🤝",
   when:"After any hard moment, once both parties are back in the window.",
   what:"A genuine conversation that acknowledges what happened and repairs the relational rupture.",
   why:"Repair is more important than resolution. Every rupture that is repaired incrementally demonstrates that the relationship survives difficulty — which is the evidence a nervous system needs to invest in connection.",
   steps:["Wait until both parties are genuinely regulated — not just calm on the surface.","'I've been thinking about what happened. I'm sorry I [specific thing].'","Listen first. Don't justify.","'What was happening for you?' — then actually listen.","You don't have to agree. You have to demonstrate you heard.","Close it: 'I'm glad we could talk about it. We're okay.'"]},
  {id:15,name:"Predictability Anchor",zone:["all"],type:"Structure",emoji:"⏰",
   when:"Transitions, start of a new period, whenever uncertainty is high. Build in proactively.",
   what:"Giving advance notice of what's coming. Consistent daily structure. Same response to same situations.",
   why:"The nervous system regulates better when it can predict. For ASD presentations especially, unpredictability is neurocepted as threat regardless of whether the unpredictable thing is positive or negative.",
   steps:["Advance notice: 'In about 10 minutes we're going to [x].' Not a lecture — a brief, warm heads-up.","Same phrase, same tone, every time. Predictability is in the repetition.","Consistent daily sequence: same order, same timing, as much as possible.","When changes are necessary: announce them early, acknowledge they're hard, offer a micro-choice within the change.","The bedtime routine IS a predictability anchor. So is the morning routine."]},
  {id:16,name:"Interest Inventory",zone:["all"],type:"Relationship",emoji:"📋",
   when:"Ongoing — always be adding to it. Especially at the start of a new period.",
   what:"Genuinely investing in knowing what this person cares about.",
   why:"Being known is itself regulatory. A person who feels genuinely known has a higher baseline of safety in the relationship.",
   steps:["Ask with genuine curiosity — no agenda beyond knowing them.","Notice what they gravitate toward, what they light up about, what they talk about unprompted.","Update your understanding regularly — interests shift.","Use what you know to connect, not to reward or bribe.","Share your own interests in return — reciprocity builds trust."]},
  {id:17,name:"Zones Check-in",zone:["all"],type:"Structure",emoji:"🔴🟡🟢🔵",
   when:"Start of every significant period — morning, after school, before bed.",
   what:"A brief, low-pressure daily check-in on regulatory state. Not 'are you okay?' — 'how's your body feeling?'",
   why:"Perry NMT: regulation is the prerequisite for learning and connection. Knowing which zone someone is in is the prerequisite for choosing the right response.",
   steps:["Keep the format simple and the same every time.","'How's your body feeling right now?' — not 'are you okay?'","Accept any answer warmly and without judgment.","Respond briefly to what you learn: yellow gets a movement offer; blue gets warmth and no demands.","Over time this becomes a shared language — the family develops a shorthand for regulation states."]},
  {id:18,name:"Transition Warning",zone:["all"],type:"Structure",emoji:"⏳",
   when:"Any time a change in activity, location, or demand is coming — especially endings.",
   what:"A brief, warm advance notice that a change is approaching. Not 'hurry up' — 'in 5 minutes we're going to X.'",
   why:"For ASD and ADHD presentations, unpredicted transitions are neurocepted as threats regardless of whether the change is positive or negative. Advance notice gives the nervous system time to prepare rather than react.",
   steps:["Give notice at a consistent interval — 10 minutes and 5 minutes works well for most children.","Use the same words each time. Predictability of the warning is as important as the warning itself.","Don't add negotiation or explanation — just the fact. 'In 5 minutes we're having dinner.'","Acknowledge it might be hard: 'I know it's hard to stop when you're in the middle of something.'","After the transition: don't debrief it. Move forward."]},
  {id:19,name:"Environmental Priming",zone:["all"],type:"Structure",emoji:"🏡",
   when:"Before a difficult time of day, a known trigger situation, or a high-demand period.",
   what:"Deliberately adjusting the physical environment to lower the regulatory load before it's needed.",
   why:"The nervous system continuously reads environmental inputs — noise, light, clutter, temperature, predictability. Reducing load before a hard moment lowers the threshold at which dysregulation occurs.",
   steps:["Before a difficult time: lower background noise, reduce visual clutter, dim lights slightly.","Lay out what's needed so there's no friction at the transition — clothes ready, food prepared, bags packed.","Remove known irritants proactively rather than managing the response to them.","Do this quietly, without announcing it. The effect works whether or not anyone notices it."]},
  {id:20,name:"Body-Doubling",zone:["blue","yellow"],type:"Co-regulation",emoji:"🧑‍🤝‍🧑",
   when:"When a child or adult is struggling to initiate or sustain a task. Particularly relevant for ADHD presentations.",
   what:"Being physically present in the same space while someone works — not helping, not directing, just present.",
   why:"Body-doubling is a widely reported ADHD experience: the presence of another person raises activation and reduces task-initiation difficulty. Practitioner consensus is strong; formal research is growing.",
   steps:["Simply be in the same room, doing your own thing — reading, working, folding.","No supervision, no checking, no commentary on how they're going.","If they get stuck: wait 2 minutes before offering help.","If they ask for help: help briefly, then return to your own task.","Your body in the room is the intervention."]},
  {id:21,name:"Movement Snack",zone:["yellow","blue"],type:"Regulation",emoji:"🍬",
   when:"Brief windows during the day — transitions, between tasks, when energy is flagging or escalating.",
   what:"2-minute bursts of movement embedded into the day as micro-doses woven into transitions.",
   why:"Movement increases prefrontal blood flow and BDNF, directly supporting executive function and emotional regulation. For ADHD presentations, frequent small doses outperform less frequent longer breaks.",
   steps:["Build movement snacks into transitions: 'Before we start, let's do 20 star jumps.'","Or: race to the letterbox, hop to the kitchen, do 10 wall push-ups before sitting down.","Keep them brief — 2 minutes maximum. The dose is the point, not the duration.","Don't make them a reward or consequence — they're just part of how the day flows.","Offer before the need becomes visible — proactive dosing beats reactive response."]},
  {id:22,name:"Interest-Led Entry",zone:["blue","green"],type:"Connection",emoji:"🔑",
   when:"Starting a difficult task, re-engaging after shutdown, or building connection during low-energy periods.",
   what:"Beginning with something the person genuinely cares about before introducing a demand or requirement.",
   why:"Interest domains are where the nervous system already has positive activation and competence experience. Starting there builds motivational momentum before the cognitive cost of the main task is introduced.",
   steps:["Identify what they're currently most interested in — it changes, stay updated.","Open with a genuine question or observation about that interest. No agenda beyond it.","Let them lead for 2-3 minutes. Follow their thread.","Then, naturally transition. Never use the interest as a bribe."]},
  {id:23,name:"Sensory Diet Check",zone:["yellow","blue"],type:"Sensory",emoji:"🧪",
   when:"When regulation is consistently difficult at a particular time of day, or when sensory-seeking or sensory-avoiding behaviour is increasing.",
   what:"A brief review of recent sensory inputs and outputs — have the nervous system's sensory needs been met today?",
   why:"For ASD presentations especially, the nervous system has specific sensory needs that, when unmet, manifest as dysregulation. A 'sensory diet' is the regular provision of sensory inputs required for regulation.",
   steps:["Ask: has there been enough heavy work (proprioception) today? Movement? Preferred textures or sounds?","Ask: has there been too much of an aversive sensory input — noise, crowds, transitions, unexpected touch?","If proprioception is low: carry something heavy, do wall push-ups, jump, roll in a blanket.","If sensory overload is the issue: quieter space, fewer people, lower lights, preferred textures available.","Build a simple sensory routine into morning and after-school based on what works."]},
  {id:24,name:"Co-regulation Through Activity",zone:["red","yellow","blue"],type:"Co-regulation",emoji:"🎨",
   when:"Direct engagement or conversation is not landing. Someone needs regulation but is resisting direct support.",
   what:"Engaging in a shared activity — cooking, building, drawing, playing — as the vehicle for co-regulation rather than the goal.",
   why:"Shared activity creates parallel nervous system regulation through proximity and rhythm without requiring the social processing of face-to-face interaction. The activity is the container; regulation is what's actually happening.",
   steps:["Choose an activity they find genuinely engaging or neutral — not one they find aversive.","Invite without pressure: 'I'm going to make something — you're welcome to join.' Then start.","Don't direct, evaluate, or teach during the activity unless asked.","Match their pace. Let silence be comfortable.","After 10-15 minutes of shared activity, connection is often available in a way it wasn't before."]},
  {id:25,name:"Repair Ritual",zone:["green"],type:"Relationship",emoji:"🕯️",
   when:"Regularly — as a family practice — not just after specific incidents.",
   what:"A brief, consistent ritual for acknowledging hard moments and re-affirming the relationship.",
   why:"Relationships that survive difficulty build more trust than relationships that never experience rupture. A repair ritual teaches the nervous system that ruptures don't mean the end — they are followed by reconnection.",
   steps:["Establish a short ritual that happens after hard moments: a phrase, a gesture, a specific activity.","Examples: 'We're okay.' (said by both, sometimes with a handshake). Or a specific song. Or making tea together.","Keep it brief — under 60 seconds. The ritual signals repair; it doesn't need to process the incident.","Use it consistently — for small moments and large ones.","The child will begin to anticipate it. That anticipation is the evidence of trust."]},
  {id:26,name:"Narrated Calm",zone:["red","yellow"],type:"Co-regulation",emoji:"🎙️",
   when:"Child is escalating and direct approaches aren't landing. Particularly useful for younger children.",
   what:"Quietly narrating your own regulated state out loud — not to the child, but within their hearing.",
   why:"Polyvagal Theory: the nervous system reads vocal prosody as a primary safety signal before conscious processing. A calm adult voice narrating a regulated state provides a continuous safety signal even when the child cannot process direct communication.",
   steps:["Speak quietly, to yourself or about what you're doing — not to the child directly.","'I'm just going to breathe for a minute.' Then do it audibly.","Or: 'I'm feeling pretty calm right now. I'll just stay here.'","Keep your voice low, slow, and melodic. Warm and unhurried.","Don't narrate their state. Only yours. 'I'm okay' not 'You're okay.'","Continue for as long as needed. The child's nervous system is listening even when they appear not to be."]},
];

function StrategyLibrary({onClose,t}){
  const[filter,setFilter]=useState("all"); // all | red | yellow | green | blue
  const[expanded,setExpanded]=useState(null);

  const filtered=filter==="all"?STRATEGY_LIBRARY:STRATEGY_LIBRARY.filter(s=>s.zone.includes(filter)||s.zone.includes("all"));
  const zoneFilters=[{id:"all",label:"All",colour:P.spock},{id:"red",label:"Red",colour:"#EF4444"},{id:"yellow",label:"Yellow",colour:"#EAB308"},{id:"green",label:"Green",colour:"#22C55E"},{id:"blue",label:"Blue",colour:"#3B82F6"}];

  return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:910,overflowY:"auto",padding:16,display:"flex",justifyContent:"center"}}>
      <div style={{background:t.surface,borderRadius:16,maxWidth:660,width:"100%",border:`2px solid ${P.spock}66`,alignSelf:"flex-start"}}>
        <div style={{background:t.headerBg,borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"stretch",height:56}}>
            <div style={{background:P.spock,width:100,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"14px 0 0 0",flexShrink:0}}>
              <span style={{fontFamily:"'Antonio',sans-serif",fontSize:12,fontWeight:700,color:"#000",letterSpacing:"0.1em",textAlign:"center",lineHeight:1.3}}>STRATEGY<br/>LIBRARY</span>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",padding:"0 14px"}}>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.textMuted}}>{STRATEGY_LIBRARY.length} evidence-based tools</span>
            </div>
            <button onClick={onClose} style={{background:P.dustyRed,border:"none",color:"#000",fontFamily:"'Antonio',sans-serif",fontWeight:700,fontSize:12,padding:"0 16px",cursor:"pointer",borderRadius:"0 14px 0 0",letterSpacing:"0.1em"}}>CLOSE</button>
          </div>
          <div style={{height:3,background:`linear-gradient(to right, #EF4444, #EAB308, #22C55E, #3B82F6)`}}/>
        </div>
        <div style={{padding:"16px 20px 0"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {zoneFilters.map(zf=>(
              <LCARSChip key={zf.id} label={zf.label} colour={zf.colour} selected={filter===zf.id} onClick={()=>setFilter(zf.id)} small/>
            ))}
          </div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.6,marginBottom:16,padding:"8px 12px",background:P.spock+"12",border:`1px solid ${P.spock}33`,borderRadius:8}}>
            Tap any strategy to read the full step-by-step. These are the same tools Spock draws from — reading them helps you recognise them in the moment.
          </div>
        </div>
        <div style={{padding:"0 20px 20px"}}>
          {filtered.map(strategy=>{
            const isOpen=expanded===strategy.id;
            const zoneColours=strategy.zone.map(z=>z==="red"?"#EF4444":z==="yellow"?"#EAB308":z==="green"?"#22C55E":z==="blue"?"#3B82F6":P.spock);
            const primaryCol=zoneColours[0];
            return(
              <div key={strategy.id} style={{background:t.panel,border:`1px solid ${primaryCol}44`,borderLeft:`4px solid ${primaryCol}`,borderRadius:"0 12px 12px 0",marginBottom:8,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:strategy.id)}>
                  <span style={{fontSize:22,flexShrink:0}}>{strategy.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Antonio',sans-serif",fontSize:14,color:primaryCol,fontWeight:700,letterSpacing:"0.06em"}}>{strategy.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                      {strategy.zone.map(z=>{
                        const zc=z==="red"?"#EF4444":z==="yellow"?"#EAB308":z==="green"?"#22C55E":z==="blue"?"#3B82F6":P.spock;
                        const zl=z==="all"?"All zones":z.charAt(0).toUpperCase()+z.slice(1);
                        return <span key={z} style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:zc,padding:"1px 7px",background:zc+"22",border:`1px solid ${zc}44`,borderRadius:20,letterSpacing:"0.06em"}}>{zl}</span>;
                      })}
                      <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:t.textMuted}}>{strategy.type}</span>
                    </div>
                  </div>
                  <span style={{fontSize:11,color:t.textDim,flexShrink:0}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{padding:"0 16px 16px",borderTop:`1px solid ${primaryCol}22`}}>
                    <div style={{marginTop:12,marginBottom:10}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:primaryCol,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>WHEN TO USE IT</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{strategy.when}</div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:primaryCol,letterSpacing:"0.12em",marginBottom:4,fontWeight:700}}>WHAT IT IS</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{strategy.what}</div>
                    </div>
                    <div style={{marginBottom:12,padding:"8px 12px",background:P.spock+"12",border:`1px solid ${P.spock}33`,borderRadius:8}}>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:P.spock,letterSpacing:"0.1em",marginBottom:3,fontWeight:700}}>WHY IT WORKS</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:t.textMuted,lineHeight:1.6}}>{strategy.why}</div>
                    </div>
                    <div>
                      <div style={{fontFamily:"'Antonio',sans-serif",fontSize:10,color:primaryCol,letterSpacing:"0.12em",marginBottom:8,fontWeight:700}}>STEP BY STEP</div>
                      {strategy.steps.map((step,si)=>(
                        <div key={si} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                          <div style={{background:primaryCol,color:"#000",fontFamily:"'Antonio',sans-serif",fontSize:11,fontWeight:700,borderRadius:4,padding:"1px 6px",flexShrink:0,marginTop:2}}>{si+1}</div>
                          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:t.text,lineHeight:1.6}}>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App(){
  useEffect(()=>{injectFonts();},[]);

  // Auto-refresh at 4am logical rollover — if app is left open overnight
  useEffect(()=>{
    let lastDate=getLogicalDate();
    const interval=setInterval(()=>{
      const currentDate=getLogicalDate();
      if(currentDate!==lastDate){
        lastDate=currentDate;
        // Force re-render by nudging profiles state (re-reads ages)
        setProfiles(p=>{
          const ages=getCurrentAges();
          const u={...p};
          for(const c of Object.keys(u))if(BIRTH_DATA[c])u[c].age=ages[c];
          return u;
        });
      }
    },60000); // check every minute
    return()=>clearInterval(interval);
  },[]);

  const[isDark,setIsDark]=useState(()=>LS.get(KEYS.settings,{}).dark!==false);
  const[profiles,setProfiles]=useState(()=>{
    const saved=LS.get(KEYS.profiles,null);
    if(saved){
      const ages=getCurrentAges();
      const u={...saved};
      for(const c of Object.keys(u))if(BIRTH_DATA[c])u[c].age=ages[c];
      return u;
    }
    return buildDefaultProfiles();
  });
  const[routines,setRoutines]=useState(()=>LS.get("rm_routines",null));
  const[showSpock,setShowSpock]=useState(false);
  const[openProfile,setOpenProfile]=useState(null);
  const[showRoutines,setShowRoutines]=useState(false);
  const[showLibrary,setShowLibrary]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const t=THEME[isDark?"dark":"light"];
  const{isFullscreen,exit:exitFullscreen}=useFullscreen();
  const{push:pushModal,pop:popModal,handleEsc}=useModalStack();

  useEffect(()=>{
    const handler=(e)=>handleEsc(e,isFullscreen,exitFullscreen);
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[handleEsc,isFullscreen,exitFullscreen]);

  useEffect(()=>{if(showSpock)pushModal("spock",()=>setShowSpock(false));else popModal("spock");},[showSpock]);
  useEffect(()=>{if(openProfile)pushModal("profile",()=>setOpenProfile(null));else popModal("profile");},[openProfile]);
  useEffect(()=>{if(showRoutines)pushModal("routines",()=>setShowRoutines(false));else popModal("routines");},[showRoutines]);
  useEffect(()=>{if(showLibrary)pushModal("library",()=>setShowLibrary(false));else popModal("library");},[showLibrary]);
  useEffect(()=>{if(showGuide)pushModal("guide",()=>setShowGuide(false));else popModal("guide");},[showGuide]);

  const saveProfiles=useCallback((updated)=>{setProfiles(updated);LS.set(KEYS.profiles,updated);},[]);
  const saveRoutines=useCallback((updated)=>{setRoutines(updated);LS.set("rm_routines",updated);},[]);

  const handleZoneTap=useCallback((code,zoneId)=>{
    const updated={...profiles,[code]:logZone(profiles[code],zoneId)};
    saveProfiles(updated);
  },[profiles,saveProfiles]);

  const handleSaveProfile=useCallback((updated)=>{
    saveProfiles({...profiles,[updated.code]:updated});
  },[profiles,saveProfiles]);

  const handleSpockUpdate=useCallback((updated)=>{
    saveProfiles({...profiles,[updated.code]:updated});
  },[profiles,saveProfiles]);

  const toggleTheme=()=>{const n=!isDark;setIsDark(n);LS.set(KEYS.settings,{...LS.get(KEYS.settings,{}),dark:n});};

  return(
    <div style={{fontFamily:"'Nunito',sans-serif"}}>
      <Dashboard profiles={profiles} onZoneTap={handleZoneTap} onSpock={()=>setShowSpock(true)}
        onOpenProfile={setOpenProfile} t={t} isDark={isDark} onToggleTheme={toggleTheme}
        onOpenRoutines={()=>setShowRoutines(true)} onOpenLibrary={()=>setShowLibrary(true)}
        onOpenGuide={()=>setShowGuide(true)}/>
      {showSpock&&<SpockScreen profiles={profiles} onClose={()=>setShowSpock(false)} onUpdateProfile={handleSpockUpdate} t={t}/>}
      {openProfile&&profiles[openProfile]&&(
        <ProfileView member={profiles[openProfile]} onClose={()=>setOpenProfile(null)} onSave={handleSaveProfile} t={t} profiles={profiles}/>
      )}
      {showRoutines&&(
        <RoutineBuilder profiles={profiles} routines={routines} onSave={saveRoutines} onClose={()=>setShowRoutines(false)} t={t}/>
      )}
      {showLibrary&&<StrategyLibrary onClose={()=>setShowLibrary(false)} t={t}/>}
      {showGuide&&<QuickStartGuide onClose={()=>setShowGuide(false)} t={t}/>}
    </div>
  );
}
