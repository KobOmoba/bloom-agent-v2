// ── Firebase ───────────────────────────────────────────────────────────────
const FB={apiKey:"AIzaSyCVEdunn3AZndDP5Rm1Z3Kv1e6G6W2mB_o",authDomain:"educationbloom-699ed.firebaseapp.com",projectId:"educationbloom-699ed",storageBucket:"educationbloom-699ed.firebasestorage.app",messagingSenderId:"33750392965",appId:"1:33750392965:web:2b3da887ede996ea8389ec"};
let db=null;
try{
  firebase.initializeApp(FB);
  db=firebase.firestore();
  db.enablePersistence({synchronizeTabs:true}).catch(e=>{if(e.code!=='failed-precondition'&&e.code!=='unimplemented')console.warn('Persist:',e.code);});
}catch(e){console.warn('Firebase:',e);}

// ── State ──────────────────────────────────────────────────────────────────
let agent=null,apiKeys=null,currentTab='wizard';
let _dsKey='';  // DeepSeek-OCR key (optional)
let selDetectedClass='';  // class detected from ledger header
let timerSec=0,timerInterval=null;
let ledgerPageCount=1,ledgerImages={};
let allStudents=[];classGroups={};selDetectedClass='';await sleep(5000);
// ── Tiers ──────────────────────────────────────────────────────────────────
const TIERS=[
  {max:50,   price:10000, name:'Starter (1-50)'},
  {max:100,  price:20000, name:'Small (51-100)'},
  {max:200,  price:35000, name:'Medium (101-200)'},
  {max:350,  price:55000, name:'Large (201-350)'},
  {max:9999, price:75000, name:'Enterprise (351+)'}
];
const getTier=n=>TIERS.find(t=>n<=t.max)||TIERS[TIERS.length-1];

// ── Sync Queue ─────────────────────────────────────────────────────────────
const SQ={
  q:JSON.parse(localStorage.getItem('ag2_sq')||'[]'),
  save(){localStorage.setItem('ag2_sq',JSON.stringify(this.q));},
  push(op){this.q.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),op,tries:0});this.save();this.run();},
  ping(){
    const ok=!!db;
    const el=$('sync');
    if(el){el.className='sdot '+(ok?this.q.length?'sd-sync':'sd-on':'sd-off');el.textContent=ok?this.q.length?'● Syncing':'● Online':'● Offline';}
    if(ok&&this.q.length)this.run();
  },
  async run(){
    if(!db||!this.q.length)return;
    const items=[...this.q];
    for(const item of items){
      try{await db.collection('v2_deals').add(item.op.d);this.q=this.q.filter(x=>x.id!==item.id);}
      catch(e){item.tries++;if(item.tries>3)this.q=this.q.filter(x=>x.id!==item.id);}
    }
    this.save();this.ping();
  }
};
window.addEventListener('online',()=>{SQ.ping();SQ.run();});
window.addEventListener('offline',()=>SQ.ping());

// ── Helpers ────────────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
const esc=s=>{if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;};
const fmt=n=>'₦'+Number(n||0).toLocaleString('en-NG');
const gv=id=>($( id)?.value||'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer(){
  clearInterval(timerInterval);timerSec=0;
  timerInterval=setInterval(()=>{
    timerSec++;
    const m=String(Math.floor(timerSec/60)).padStart(2,'0');
    const s=String(timerSec%60).padStart(2,'0');
    const el=$('timerDisplay');if(el)el.textContent=m+':'+s;
  },1000);
}
function timerText(){const m=Math.floor(timerSec/60);const s=timerSec%60;return m>0?m+'m '+s+'s':s+'s';}

// ── Login — OPEN ACCESS ────────────────────────────────────────────────────
// Any valid Nigerian phone can enter. Firestore agent record is fetched
// silently in background — if not found, a guest profile is created.
// No agent is ever blocked from submitting a deal.
function normPhone(raw){
  let p=raw.trim().replace(/\D/g,'');
  if(p.startsWith('0')&&p.length===11)return'234'+p.slice(1);
  if(p.startsWith('234')&&p.length===13)return p;
  if(p.length===10)return'234'+p;
  return p;
}

async function doLogin(){
  const raw=gv('l-phone');const phone=normPhone(raw);
  const localFmt=phone.startsWith('234')?'0'+phone.slice(3):phone;
  const btn=$('l-btn');const err=$('l-err');err.style.display='none';
  if(phone.length<10){showE(err,'Enter your WhatsApp number — e.g. 08038740131');return;}
  btn.textContent='Checking...';btn.disabled=true;

  // 1. Check cached session
  const cached=localStorage.getItem('ag2_agent');
  if(cached){
    try{
      const a=JSON.parse(cached);
      const cp=normPhone(a.phone||'');
      if(cp===phone||a.phone===localFmt||cp===localFmt){
        agent=a;startApp();btn.textContent='▶ Login';btn.disabled=false;
        if(db)refreshBg(a.id,phone,localFmt).catch(()=>{});
        return;
      }
    }catch(e){localStorage.removeItem('ag2_agent');}
  }

  // 2. Try Firestore — but NEVER block access if not found
  if(db){
    try{
      const[s1,s2]=await Promise.all([
        db.collection('admin_agents').where('phone','==',phone).get(),
        db.collection('admin_agents').where('phone','==',localFmt).get()
      ]);
      const seen=new Set();
      const docs=[...s1.docs,...s2.docs].filter(d=>{if(seen.has(d.id))return false;seen.add(d.id);return true;});
      if(docs.length){
        agent={id:docs[0].id,...docs[0].data()};
        localStorage.setItem('ag2_agent',JSON.stringify(agent));
        startApp();btn.textContent='▶ Login';btn.disabled=false;
        return;
      }
    }catch(e){console.warn('DB lookup:',e.message);}
  }

  // 3. Not in DB — create guest profile and let them in anyway
  agent={id:'guest_'+phone,name:'Agent ('+localFmt+')',phone:localFmt,commission:20,_guest:true};
  localStorage.setItem('ag2_agent',JSON.stringify(agent));
  startApp();
  btn.textContent='▶ Login';btn.disabled=false;
}

async function refreshBg(agentId,phone,localFmt){
  try{
    let doc=await db.collection('admin_agents').doc(agentId).get();
    if(!doc.exists){const[s1,s2]=await Promise.all([db.collection('admin_agents').where('phone','==',phone).get(),db.collection('admin_agents').where('phone','==',localFmt).get()]);const d=[...s1.docs,...s2.docs][0];if(!d)return;doc=d;}
    const fresh={id:doc.id,...doc.data()};
    localStorage.setItem('ag2_agent',JSON.stringify(fresh));
    if(agent&&agent.id===fresh.id)agent=fresh;
  }catch(e){}
}

// ── Request Access (shown in login when phone not in DB — optional) ─────────
function requestAccess(){
  const name=(gv('req-name')||'').trim();
  const phone=(gv('l-phone')||'').trim();
  const area=(gv('req-area')||'').trim();
  if(!name){alert('Enter your full name first.');return;}
  const msg='Hi Bayo, I would like to be an EduBloom agent.\n\nName: '+name+'\nPhone: '+phone+'\nArea: '+(area||'Not specified')+'\n\nPlease register me. Thank you!';
  window.open('https://wa.me/2348145073941?text='+encodeURIComponent(msg),'_blank');
}

function showE(el,msg){el.textContent=msg;el.style.display='block';}

function startApp(){
  $('login').style.display='none';
  const app=$('app');app.style.display='flex';app.style.flexDirection='column';
  SQ.ping();startTimer();
  _getApiKeys().catch(e=>console.warn('API keys:',e));
  goTab('wizard');
}

function logout(){if(!confirm('Logout?'))return;localStorage.removeItem('ag2_agent');location.reload();}

// ── API Keys ───────────────────────────────────────────────────────────────
async function _getApiKeys(){
  if(apiKeys)return apiKeys;
  // Check localStorage first — fastest, works offline after first entry
  const localDs = localStorage.getItem('ag2_dsKey')||'';
  const localProv = localStorage.getItem('ag2_dsProv')||'regolo';
  // Try Firestore in background
  let fsDs='', fsProv='siliconflow', fsGroq='';
  if(db){
    try{
      const doc=await db.collection('admin_settings').doc('main').get();
      if(doc.exists){
        const d=doc.data();
        fsDs=d.deepseekApiKey||'';
        fsProv=d.deepseekProvider||'siliconflow';
        fsGroq=d.groqApiKey||'';
      }
    }catch(e){console.warn('Settings fetch:',e.message);}
  }
  // Prefer locally cached key (agent may have entered it directly)
  const dsKey  = localDs || fsDs;
  const dsProv = localDs ? localProv : fsProv;
  if(dsKey && !localDs){
    // Cache Firestore key locally for next time
    localStorage.setItem('ag2_dsKey', dsKey);
    localStorage.setItem('ag2_dsProv', dsProv);
  }
  apiKeys={deepseek:dsKey, deepseekProvider:dsProv, groq:fsGroq, gemini:'', hf:''};
  return apiKeys;
}

// ── Navigation ─────────────────────────────────────────────────────────────
function goTab(tab){
  currentTab=tab;
  $('sec-wizard').style.display=tab==='wizard'?'block':'none';
  $('sec-deals').style.display=tab==='deals'?'block':'none';
  document.querySelectorAll('.nlink').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  if(tab==='deals')renderDeals();
}

function goStep(n){
  ['sec-step1','sec-step2','sec-step3','sec-step4'].forEach(id=>{
    const el=$(id);if(el){el.classList.remove('on');el.style.display='none';}
  });
  const target=$('sec-step'+n);
  if(target){target.classList.add('on');target.style.display='block';}
  for(let i=1;i<=4;i++){
    const dot=$('sd-'+i),item=$('si-'+i),line=$('sl-'+i);
    if(!dot)continue;
    dot.className='step-dot';if(item)item.className='step-item';
    if(i<n){dot.classList.add('done');dot.textContent='✓';if(item)item.classList.add('done');if(line)line.classList.add('done');}
    else if(i===n){dot.classList.add('active');dot.textContent=i;if(item)item.classList.add('active');}
    else{dot.textContent=i;if(line)line.classList.remove('done');}
  }
  if(n===3)populatePitch();
  if(n===4)populateReview();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── Step 1: Signboard ──────────────────────────────────────────────────────
function captureSignboard(){
  const input=$('sign-input');
  input.onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    fileToDataUrl(file).then(url=>{markCaptured('signCap',url);processSignboard(file,url);});
    input.value='';
  };
  input.click();
}

function skipSignboard(){
  $('school-fields').style.display='block';
  $('terms-card').style.display='block';
  $('btn-step1-next').style.display='block';
}

function markCaptured(id,url){
  const el=$(id);el.classList.add('captured');
  [...el.children].forEach(c=>{if(c.tagName!=='INPUT')c.style.display='none';});
  const img=document.createElement('img');
  img.src=url;img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px;opacity:.8;';
  el.insertBefore(img,el.firstChild);
  const rb=document.createElement('button');rb.className='cap-retake';rb.textContent='↺ Retake';
  rb.onclick=e=>{e.stopPropagation();el.classList.remove('captured');[...el.children].filter(c=>c.tagName!=='INPUT'&&c!==rb).forEach(c=>{if(c.tagName==='IMG')c.remove();else c.style.display='';});rb.remove();};
  el.appendChild(rb);
}

async function processSignboard(file,dataUrl){
  $('sign-proc').style.display='block';
  const prog=$('sign-prog'),status=$('sign-status');
  status.textContent='Compressing image...';prog.style.width='10%';
  try{
    const keys=await _getApiKeys();
    if(!keys.groq)throw new Error('No Groq API key — add it in portal Settings');
    const compressed=await compressImage(dataUrl,800);
    prog.style.width='30%';status.textContent='AI reading signboard...';
    const prompt='You are reading a Nigerian school signboard. Extract school name, full address, LGA, state.\nReturn JSON ONLY:\n{"name":"SCHOOL NAME","address":"full address","lga":"LGA","state":"State"}\nEmpty string if unclear.';
    const result=await callGroqVision(compressed,prompt,keys.groq);
    prog.style.width='80%';
    let parsed={};
    try{parsed=JSON.parse(result.replace(/```json|```/g,'').trim());}
    catch(e){const m=result.match(/\{[^}]+\}/);if(m)try{parsed=JSON.parse(m[0]);}catch(e2){}}
    if(parsed.name)$('f-school-name').value=parsed.name;
    if(parsed.address)$('f-address').value=parsed.address;
    if(parsed.state)$('f-state').value=parsed.state;
    if(parsed.lga)$('f-lga').value=parsed.lga;
    const filled=[parsed.name,parsed.address,parsed.state,parsed.lga].filter(Boolean).length;
    const hint=$('ai-hint-sign');
    if(hint){hint.textContent='✨ AI filled '+filled+' of 4 fields from signboard';hint.style.display='block';}
    prog.style.width='100%';status.textContent='Done!';
    setTimeout(()=>{$('sign-proc').style.display='none';$('school-fields').style.display='block';$('terms-card').style.display='block';$('btn-step1-next').style.display='block';},500);
  }catch(e){
    status.textContent='⚠️ '+(e.message||'Error')+' — fill manually below';
    prog.style.width='100%';
    setTimeout(()=>{$('sign-proc').style.display='none';$('school-fields').style.display='block';$('terms-card').style.display='block';$('btn-step1-next').style.display='block';},1500);
  }
}

function validateStep1(){
  if(!gv('f-school-name')){alert('Enter the school name.');return;}
  if(!gv('f-phone')){alert('Enter the principal phone number.');return;}
  goStep(2);
}

// ── Step 2: Ledger ─────────────────────────────────────────────────────────
function addLedgerPage(){
  const idx=ledgerPageCount;ledgerPageCount++;
  const container=$('ledger-caps');
  const wrap=document.createElement('div');wrap.style.marginTop='.5rem';
  const btn=document.createElement('div');
  btn.className='cap-btn';btn.id='lc-'+idx;btn.onclick=()=>captureLedger(idx);
  const icon=document.createElement('div');icon.className='cap-icon';icon.textContent='📖';
  const lbl=document.createElement('div');lbl.className='cap-lbl';lbl.textContent='📷 Camera · 🖼️ Gallery — Page '+(idx+1);
  btn.appendChild(icon);btn.appendChild(lbl);
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/*';inp.id='li-'+idx;inp.style.display='none';
  btn.appendChild(inp);
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

function captureLedger(idx){
  const input=$('li-'+idx);if(!input)return;
  input.onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    fileToDataUrl(file).then(url=>{
      ledgerImages[idx]=url;
      markCaptured('lc-'+idx,url);
      $('ledger-actions').style.display='block';
      $('ledger-skip-init').style.display='none';
    });
    input.value='';
  };
  input.click();
}

function skipLedger(){allStudents=[];classGroups={};$('ledger-results').style.display='block';$('step2-nav').style.display='block';}


// ── Inline DeepSeek-OCR key entry (shown when no key configured) ─────────
function showDeepSeekKeyPrompt(){
  const results = $('ledger-results');
  if(results) results.style.display='block';
  const classGroups = $('class-groups');
  if(classGroups) classGroups.innerHTML='';
  const tierCard = $('tier-auto-card');
  if(tierCard) tierCard.innerHTML='';
  const stats = $('as-total');
  if(stats){ $('as-total').textContent='—';$('as-classes').textContent='—';$('as-conf').textContent='—';}

  const dbg=$('ocr-debug');
  if(!dbg)return;
  dbg.style.display='block';
  dbg.innerHTML=[
    '<div style="font-weight:700;font-size:.82rem;color:var(--money);margin-bottom:.5rem;">🔑 Enter your Regolo API Key</div>',
    '<p style="font-size:.75rem;color:var(--sub);margin-bottom:.5rem;">',
    'Regolo.ai hosts DeepSeek-OCR-2 free for 60 days (no credit card).<br>',
    'Get your key at <strong>regolo.ai</strong> → Dashboard → API Keys',
    '</p>',
    '<input id="ds-key-input" type="password" placeholder="Paste Regolo API key...">',
    '<select id="ds-prov-input" style="margin-top:.4rem;">',
    '<option value="regolo">Regolo.ai (recommended)</option>',
    '<option value="siliconflow">SiliconFlow</option>',
    '<option value="deepinfra">DeepInfra</option>',
    '</select>',
    '<button onclick="saveDeepSeekKey()" style="background:var(--money);color:#fff;border:none;border-radius:10px;',
    'padding:.65rem;font-size:.86rem;cursor:pointer;font-weight:700;width:100%;margin-top:.5rem;">',
    '💾 Save Key & Scan Now</button>'
  ].join('');
}

async function saveDeepSeekKey(){
  const key  = ($('ds-key-input')?.value||'').trim();
  const prov = $('ds-prov-input')?.value || 'regolo';
  if(!key){alert('Paste your SiliconFlow API key first.');return;}
  // Cache in localStorage immediately
  localStorage.setItem('ag2_dsKey', key);
  localStorage.setItem('ag2_dsProv', prov);
  // Reset apiKeys cache so it gets picked up
  apiKeys = null;
  // Save to Firestore so portal and future loads see it too
  if(db){
    db.collection('admin_settings').doc('main').set(
      {deepseekApiKey:key, deepseekProvider:prov},
      {merge:true}
    ).then(()=>console.log('✅ DeepSeek key saved to Firestore'))
     .catch(e=>console.warn('Firestore save:', e.message));
  }
  // Hide the prompt and start scanning
  const dbg=$('ocr-debug');if(dbg)dbg.style.display='none';
  const res=$('ledger-results');if(res)res.style.display='none';
  processAllLedgers();
}

async function processAllLedgers(){
  const images=Object.entries(ledgerImages);
  if(!images.length){alert('Photograph at least one ledger page first.');return;}
  $('ledger-proc').style.display='block';
  $('live-feed').style.display='block';
  const liveContent=$('live-content');liveContent.innerHTML='';
  const prog=$('ledger-prog'),status=$('ledger-status');
  prog.style.width='5%';

  // Fetch Groq key from Firebase admin_settings — same source as v1
  let groqKey='';
  if(db){
    try{
      const doc=await db.collection('admin_settings').doc('main').get();
      if(doc.exists){groqKey=doc.data().groqApiKey||'';}
    }catch(e){console.warn('Key fetch:',e.message);}
  }
  if(!groqKey&&apiKeys&&apiKeys.groq)groqKey=apiKeys.groq;

  if(!groqKey){
    $('ledger-proc').style.display='none';
    const dbg=$('ocr-debug');
    if(dbg){
      dbg.style.display='block';
      dbg.innerHTML='<div style="font-weight:700;color:var(--danger);margin-bottom:.5rem;">⚠️ Groq key not found</div>'+
        '<p style="font-size:.75rem;color:var(--sub);">Ask Bayo to add groqApiKey to Firestore admin_settings → main.</p>';
    }
    $('ledger-results').style.display='block';
    return;
  }

  const LEDGER_PROMPT=[
    'You are reading a Nigerian school fee payment ledger (handwritten).',
    'Columns: SERIAL NO | NAMES | BALANCE FROM LAST TERM | CURRENT TERMS FEES |',
    'TOTAL | 1ST PART PAYMENT | TELLER NO | DATE | 2ND PART PAYMENT |',
    'TELLER NO | DATE | 3RD PART PAYMENT | TELLER NO | DATE',
    '',
    'YOUR TASK: Extract EVERY student record. Read ALL rows. Do not stop early.',
    '',
    'Nigerian surnames: OGUNLADE, KASALI, ALAWODE, OYESANWO, OGUNDEYI, ALAO,',
    'AKINWANDE, OLAWALE, SHONPE, GBELEKALE, OLIYIDE, KOLANOLE, ADENIYI, OBASA,',
    'OLATUNDE, LAWAL, OGUNDETI, OYERINDE, ILELABOYE, AFOLABI, DADA, MOSES,',
    'OYEBOLA, ADERIBIGBE, OLAYINOLA, IDOWU, ATAJA, AWOLOWO, ADEKUNLE,',
    'OGUNSOLA, JOHN, ADEOYE, SABIU, ALIMI',
    '',
    'Nigerian firstnames: GIFT, SUCCESS, EZEKIEL, AIWAL, LAWAL, EMMANUEL,',
    'RASHEEDAT, KHALEED, ABDULLAHI, SALAM, OYEDEPO, WAJUD, MICHEAL, IBRAHIM,',
    'RAHMON, AISHAT, CHRISTIANA, AFEEZ, DOMINION, SAMUEL, MALEEK, PATHIA,',
    'INIOLUWA, QUARIBAT, GOLD, TOHEEB, ADEOLA, GODWIN, ELIZABETH, TIBESIMI,',
    'WASLAT, MOZEED, DEBORAH, SHINDARA, GABRIEL, RASAQ, ENOCH, ABIGEAL,',
    'KOREDE, ADEMIDE, AMINDAT, WIQUYAT, ISREA, DORCAS, MARIAM, CYNTHIA, AMINAT',
    '',
    'Rules:',
    '1. NAMES column is always SURNAME FIRSTNAME — combine them',
    '2. balance = amount carried from last term (0 if none)',
    '3. termFees = current term fee amount',
    '4. paid = sum of all part payments made so far this term',
    '5. status = "FULLY PAID" if fully settled, "PART PAID" if partial, "OWING" if nothing paid',
    '6. If "FULLY PAID" is written anywhere on the row — status is FULLY PAID',
    '7. Crossed out figures — use the final corrected amount',
    '8. class = the class label at top of page e.g. KG, BASIC 1, NURSERY 2',
    '9. Read EVERY row — registers have 10-25 students per page',
    '',
    'Return ONLY valid JSON — no explanation no markdown:',
    '{"detected_class":"BASIC 4","students":[',
    '{"name":"OGUNLADE MICHEAL","balance":0,"termFees":24000,"paid":24000,"status":"FULLY PAID"},',
    '{"name":"KASALI RASAQ","balance":5000,"termFees":24000,"paid":17000,"status":"PART PAID"},',
    '{"name":"JOHN DEBORAH","balance":3000,"termFees":26000,"paid":4000,"status":"OWING"}',
    ']}'
  ].join('\n');

  allStudents=[];classGroups={};selDetectedClass='';

  for(let i=0;i<images.length;i++){
    const[idx,url]=images[i];
    prog.style.width=Math.round((i/images.length)*85)+'%';
    status.textContent='Reading page '+(parseInt(idx)+1)+' of '+images.length+'...';

    // 15s cooldown between pages (Groq free-tier TPM limit)
    if(i>0){
      for(let s=15;s>0;s--){
        status.textContent='Cooldown ('+s+'s) before page '+(parseInt(idx)+1)+'...';
        await sleep(1000);
      }
    }

    try{
      const compressed=await compressLedger(url);
      const b64=compressed.split(',')[1];
      const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},
        body:JSON.stringify({
          model:'qwen/qwen3.6-27b',
          messages:[{role:'user',content:[
            {type:'image_url',image_url:{url:'data:image/jpeg;base64,'+b64}},
            {type:'text',text:LEDGER_PROMPT}
          ]}],
          temperature:0.1,
          max_tokens:2000,
          reasoning_format:'hidden'
        })
      });

      if(!resp.ok){const err=await resp.json().catch(()=>({}));throw new Error(err.error?.message||'Groq '+resp.status);}
      const data=await resp.json();
      let text=(data.choices?.[0]?.message?.content||'').trim();
      text=text.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
      window._lastOCRRaw=text;
      console.log('[v2 Ledger] page '+(parseInt(idx)+1)+' raw:',text.slice(0,400));

      let parsed={};
      try{parsed=JSON.parse(text);}
      catch(e){
        const m=text.match(/\{[\s\S]*\}/);
        try{parsed=m?JSON.parse(m[0]):{};}catch(e2){parsed={};}
      }

      if(parsed.detected_class){
        const dc=String(parsed.detected_class).trim().toUpperCase();
        if(dc&&dc!=='NULL'&&dc!=='UNKNOWN')selDetectedClass=dc;
      }

      const students=parsed.students||[];
      console.log('[v2 Ledger] students page '+(parseInt(idx)+1)+':',students.length);

      const seenNames=new Set(allStudents.map(s=>s.name.toLowerCase().replace(/[^a-z]/g,'')));
      students.forEach(s=>{
        if(!s.name||s.name.length<2)return;
        s.name=s.name.toUpperCase().replace(/[^A-Z\s'\-.]/g,'').replace(/\s+/g,' ').trim();
        if(!s.name||s.name.length<2)return;
        const key=s.name.toLowerCase().replace(/[^a-z]/g,'');
        if(seenNames.has(key))return;
        seenNames.add(key);
        s.class=s.class||selDetectedClass||'UNKNOWN';
        s.confidence=calcConf(s);
        allStudents.push(s);
        addLiveItem(liveContent,s);
      });
    }catch(e){
      console.warn('[v2 Ledger] page '+idx+' error:',e.message);
      status.textContent='Page '+(parseInt(idx)+1)+' error: '+e.message;
      await sleep(2000);
    }
  }

  allStudents.forEach(s=>{
    const cls=(s.class||selDetectedClass||'UNKNOWN').toUpperCase().trim();
    if(!classGroups[cls])classGroups[cls]=[];
    classGroups[cls].push(s);
  });

  selTier=getTier(allStudents.length);
  prog.style.width='100%';
  status.textContent='Done — '+allStudents.length+' students found';
  setTimeout(()=>{$('ledger-proc').style.display='none';showLedgerResults();},800);
}

function calcConf(s){
  let c=50;
  if(s.name&&s.name.length>8)c+=20;
  if(s.class&&s.class!=='UNKNOWN')c+=15;
  if((s.termFees||0)>0)c+=10;
  if((s.paid||0)>0)c+=5;
  return Math.min(99,c);
}

function addLiveItem(container,s){
  const div=document.createElement('div');div.className='live-item';
  const conf=s.confidence||50;
  const col=conf>80?'var(--money)':conf>60?'var(--warn)':'var(--danger)';
  const dot=document.createElement('div');dot.className='live-dot';dot.style.background=col;
  const nm=document.createElement('span');nm.style.cssText='flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem;';nm.textContent=s.name;
  const cl=document.createElement('span');cl.style.cssText='font-size:.65rem;color:var(--sub);flex-shrink:0;';cl.textContent=s.class||'?';
  div.appendChild(dot);div.appendChild(nm);div.appendChild(cl);
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
}

function showLedgerResults(){
  $('ledger-results').style.display='block';
  $('as-total').textContent=allStudents.length;
  $('as-classes').textContent=Object.keys(classGroups).length;
  const avgConf=allStudents.length>0?Math.round(allStudents.reduce((s,r)=>s+(r.confidence||50),0)/allStudents.length):0;
  $('as-conf').textContent=avgConf+'%';

  const groupsEl=$('class-groups');groupsEl.innerHTML='';
  for(const[cls,students]of Object.entries(classGroups)){
    const paid=students.filter(s=>s.status==='FULLY PAID').length;
    const part=students.filter(s=>s.status==='PART PAID').length;
    const owing=students.filter(s=>s.status==='OWING').length;
    const div=document.createElement('div');div.className='class-g';
    const rows=students.map((s,i)=>{
      const conf=s.confidence||50;
      const bc=conf>80?'var(--money)':conf>60?'var(--warn)':'var(--danger)';
      return '<div class="stu-row"><span style="color:var(--sub);font-size:.68rem;width:18px;text-align:right;flex-shrink:0;">'+(i+1)+'</span><input class="stu-inp" value="'+esc(s.name)+'" onchange="fixName(\''+esc(cls)+'\','+i+',this.value)"><span style="font-size:.62rem;color:var(--sub);width:55px;text-align:right;flex-shrink:0;">'+(s.status||'—')+'</span><div class="conf-bg"><div class="conf-bar" style="width:'+conf+'%;background:'+bc+';"></div></div></div>';
    }).join('');
    const paidPct=Math.round((paid/students.length)*100);
    const partPct=Math.round((part/students.length)*100);
    div.innerHTML='<div class="class-hdr"><div style="display:flex;align-items:center;gap:5px;"><span class="class-name">'+esc(cls)+'</span><span class="badge bb">'+students.length+'</span></div><div style="display:flex;gap:3px;">'+(paid?'<span class="badge bg">'+paid+'✓</span>':'')+(part?'<span class="badge ba">'+part+'½</span>':'')+(owing?'<span class="badge br">'+owing+'✗</span>':'')+'</div></div><div class="cbar-bg"><div class="cbar-paid" style="width:'+paidPct+'%;"></div><div class="cbar-part" style="width:'+partPct+'%;"></div></div><div style="max-height:190px;overflow-y:auto;margin-top:6px;">'+rows+'</div>';
    groupsEl.appendChild(div);
  }

  if(selTier){
    const comm=Math.round(selTier.price*(agent.commission||20)/100);
    const tc=$('tier-auto-card');
    if(tc)tc.innerHTML='<div class="card"><div class="ct">💡 Auto-selected Plan</div><p style="font-size:.74rem;color:var(--sub);margin-bottom:.4rem;">Based on '+allStudents.length+' students scanned</p><div style="background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.3);border-radius:10px;padding:.65rem;"><div style="font-weight:800;">'+esc(selTier.name)+'</div><div style="color:var(--money);font-weight:700;">'+fmt(selTier.price)+'/term</div><div style="font-size:.7rem;color:var(--sub);margin-top:3px;">Your commission: <strong style="color:var(--money);">'+fmt(comm)+'</strong></div></div><label style="margin-top:.5rem;">Change plan (optional)</label><select id="tier-override" onchange="overrideTier(this.value)">'+TIERS.map(t=>'<option value="'+t.max+'"'+(t.max===selTier.max?' selected':'')+'>'+t.name+' — '+fmt(t.price)+'/term</option>').join('')+'</select></div>';
  }

  // Show debug info if 0 students
  if(!allStudents.length){
    const dbg=$('ocr-debug');
    if(dbg){
      dbg.style.display='block';
      dbg.innerHTML='<div style="font-size:.72rem;font-weight:700;color:var(--warn);margin-bottom:.3rem;">⚠️ 0 students found. Check Brave console for DeepSeek-OCR response.</div><div style="font-size:.7rem;color:var(--sub);">Tips: ensure good lighting, hold phone flat above ledger, page fills the frame.</div><button onclick="retryLedger()" style="background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.4rem .8rem;font-size:.74rem;cursor:pointer;margin-top:.4rem;font-weight:700;">📸 Retake & retry</button>';
    }
  }

  $('step2-nav').style.display='block';
}

function fixName(cls,idx,val){
  if(classGroups[cls]&&classGroups[cls][idx]){
    const s=classGroups[cls][idx];s.name=val.toUpperCase().trim();
    const ai=allStudents.findIndex(x=>x===s);if(ai>=0)allStudents[ai].name=s.name;
  }
}

function overrideTier(maxStr){selTier=TIERS.find(t=>t.max===parseInt(maxStr))||selTier;}


function clearDsKeyAndRetry(){
  localStorage.removeItem('ag2_dsKey');
  localStorage.removeItem('ag2_dsProv');
  apiKeys=null;
  retryLedger();
  const dbg=$('ocr-debug');if(dbg)dbg.style.display='none';
  showDeepSeekKeyPrompt();
  const res=$('ledger-results');if(res)res.style.display='block';
}

function retryLedger(){
  ledgerImages={};ledgerPageCount=1;allStudents=[];classGroups={};
  const caps=$('ledger-caps');
  if(caps){
    while(caps.children.length>2)caps.removeChild(caps.lastChild);
    const btn=$('lc-0');
    if(btn){btn.classList.remove('captured');[...btn.children].forEach(c=>{if(c.tagName==='IMG'||c.classList?.contains('cap-retake'))c.remove();else c.style.display='';});}
  }
  $('ledger-actions').style.display='none';
  $('ledger-skip-init').style.display='block';
  $('ledger-results').style.display='none';
  $('step2-nav').style.display='none';
  const dbg=$('ocr-debug');if(dbg)dbg.style.display='none';
}

// ── Step 3: Pitch ──────────────────────────────────────────────────────────
function populatePitch(){
  const name=gv('f-school-name')||'School';
  const loc=[gv('f-lga'),gv('f-state')].filter(Boolean).join(', ')||'Nigeria';
  $('pitch-name').textContent=name;$('pitch-loc').textContent=loc;
  const total=allStudents.length,classes=Object.keys(classGroups).length;
  $('p-students').textContent=total;$('p-classes').textContent=classes;
  let tPaid=0,tDue=0;
  allStudents.forEach(s=>{tDue+=(s.termFees||0);tPaid+=(s.paid||0);});
  const rate=tDue>0?Math.round((tPaid/tDue)*100):0;
  const outstanding=tDue-tPaid;
  const owingCnt=allStudents.filter(s=>s.status==='OWING'||s.status==='PART PAID').length;
  $('p-rate').textContent=rate+'%';
  $('p-outstanding').textContent=fmt(outstanding);
  $('p-owing-txt').textContent=owingCnt+' student'+(owingCnt!==1?'s':'')+' with outstanding fees';
  const barsEl=$('pitch-bars');barsEl.innerHTML='';
  for(const[cls,students]of Object.entries(classGroups)){
    const paid=students.filter(s=>s.status==='FULLY PAID').length;
    const part=students.filter(s=>s.status==='PART PAID').length;
    const div=document.createElement('div');div.className='card';div.style.padding='.7rem';
    const paidPct=Math.round((paid/students.length)*100);
    const partPct=Math.round((part/students.length)*100);
    div.innerHTML='<div class="class-hdr" style="margin-bottom:5px;"><div style="display:flex;align-items:center;gap:5px;"><span class="class-name" style="font-size:.8rem;">'+esc(cls)+'</span><span class="badge bb">'+students.length+'</span></div><span style="font-size:.72rem;color:var(--sub);">'+paidPct+'% paid</span></div><div class="cbar-bg"><div class="cbar-paid" style="width:'+paidPct+'%;"></div><div class="cbar-part" style="width:'+partPct+'%;"></div></div>';
    barsEl.appendChild(div);
  }
}

let presenting=false;
function togglePresent(){presenting=!presenting;document.body.classList.toggle('presenting',presenting);}

// ── Step 4: Review & Submit ────────────────────────────────────────────────
function populateReview(){
  const name=gv('f-school-name')||'—';
  const loc=[gv('f-lga'),gv('f-state')].filter(Boolean).join(', ')||'—';
  const terms=parseInt($('f-terms')?.value)||1;
  const tier=selTier||getTier(allStudents.length);
  const total=tier.price*terms;
  const comm=Math.round(total*(agent.commission||20)/100);
  $('review-rows').innerHTML='<div class="rv-row"><span class="rv-l">School</span><span class="rv-v">'+esc(name)+'</span></div><div class="rv-row"><span class="rv-l">Location</span><span class="rv-v">'+esc(loc)+'</span></div><div class="rv-row"><span class="rv-l">Principal</span><span class="rv-v">'+esc(gv('f-principal')||'—')+'</span></div><div class="rv-row"><span class="rv-l">Phone</span><span class="rv-v">'+esc(gv('f-phone')||'—')+'</span></div><div class="rv-row"><span class="rv-l">Students</span><span class="rv-v">'+allStudents.length+'</span></div><div class="rv-row"><span class="rv-l">Classes</span><span class="rv-v">'+Object.keys(classGroups).length+'</span></div><div class="rv-row"><span class="rv-l">Plan</span><span class="rv-v">'+esc(tier.name)+'</span></div><div class="rv-row"><span class="rv-l">Terms</span><span class="rv-v">'+terms+'</span></div><div class="rv-row"><span class="rv-l">Onboarding time</span><span class="rv-v">'+timerText()+'</span></div>';
  $('tier-confirm-card').style.display='block';
  $('tier-confirm-inner').innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem;background:rgba(37,99,235,.1);border-radius:10px;border:1px solid rgba(37,99,235,.3);"><div><div style="font-weight:800;">'+esc(tier.name)+'</div><div style="font-size:.7rem;color:var(--sub);">'+terms+' term'+(terms>1?'s':'')+' x '+fmt(tier.price)+'</div></div><div style="text-align:right;"><div style="font-size:1.1rem;font-weight:800;color:var(--money);">'+fmt(total)+'</div><div style="font-size:.68rem;color:var(--sub);">school pays</div></div></div>';
  $('comm-preview').textContent='Your commission: '+fmt(comm);
}

async function submitDeal(){
  const name=gv('f-school-name');const phone=gv('f-phone').replace(/\D/g,'');
  const fb=$('submit-fb');
  if(!name){showFB(fb,'bad','Enter school name in Step 1.');return;}
  if(!phone||phone.length<10){showFB(fb,'bad','Enter principal WhatsApp in Step 1.');return;}
  const tier=selTier||getTier(allStudents.length);
  const terms=parseInt($('f-terms')?.value)||1;
  const comm=Math.round(tier.price*terms*(agent.commission||20)/100);
  const deal={
    timestamp:new Date(),status:'pending',version:2,
    agent:{id:agent.id,name:agent.name,phone:agent.phone,commission:agent.commission||20,_guest:agent._guest||false},
    school:{name,phone:normPhone(phone),email:gv('f-email'),principalName:gv('f-principal'),address:gv('f-address'),lga:gv('f-lga'),state:gv('f-state'),studentCount:allStudents.length},
    tier:{name:tier.name,price:tier.price},terms,onboardingTimeSec:timerSec,
    students:allStudents.map(s=>({name:s.name,class:s.class||'',totalFee:s.termFees||0,paid:s.paid||0,balance:s.balance||0,status:s.status||'OWING',phone:'',gender:''})),
    classBreakdown:Object.fromEntries(Object.entries(classGroups).map(([k,v])=>[k,v.length]))
  };
  const btn=$('btn-submit');btn.textContent='Submitting...';btn.disabled=true;
  try{
    if(db){await db.collection('v2_deals').add(deal);}
    else{SQ.push({t:'deal',d:deal});}
    showFB(fb,'ok','✅ "'+name+'" submitted with '+allStudents.length+' students! Commission: '+fmt(comm));
    btn.textContent='✓ Submitted!';btn.style.background='var(--money)';
    clearInterval(timerInterval);
  }catch(e){
    SQ.push({t:'deal',d:deal});
    showFB(fb,'ok','📥 Saved offline — will reach Bayo when connected. Commission: '+fmt(comm));
    btn.textContent='📤 Submit';btn.disabled=false;
  }
}

function showFB(el,type,msg){el.className='fb '+type;el.textContent=msg;el.style.display='block';}

// ── My Deals ───────────────────────────────────────────────────────────────
async function renderDeals(){
  const c=$('deals-list');
  c.innerHTML='<p style="color:var(--sub);font-size:.8rem;text-align:center;padding:1rem;">Loading...</p>';
  let deals=[];
  try{
    if(db){
      const snap=await db.collection('v2_deals').where('agent.id','==',agent.id).get();
      deals=snap.docs.map(d=>({id:d.id,...d.data()}));
      deals.sort((a,b)=>{const ta=a.timestamp?.toDate?a.timestamp.toDate():new Date(a.timestamp||0);const tb=b.timestamp?.toDate?b.timestamp.toDate():new Date(b.timestamp||0);return tb-ta;});
    }
  }catch(e){console.warn('Deals:',e);}
  if(!deals.length){c.innerHTML='<p style="color:var(--sub);font-size:.8rem;text-align:center;padding:2rem;">No deals yet. Submit your first school!</p>';return;}
  c.innerHTML=deals.map(d=>{
    const sc=d.status==='approved'?'bg':d.status==='rejected'?'br':'ba';
    const comm=Math.round((d.tier?.price||0)*(d.agent?.commission||20)/100*(d.terms||1));
    const ts=d.timestamp?.toDate?d.timestamp.toDate().toLocaleDateString('en-NG'):'just now';
    return'<div class="card" style="margin-bottom:.6rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span class="badge '+sc+'">'+(d.status||'pending').toUpperCase()+'</span><span style="font-size:.68rem;color:var(--sub);">'+ts+'</span></div><div style="font-weight:700;font-size:.88rem;">'+esc(d.school?.name)+'</div><div style="font-size:.74rem;color:var(--sub);">'+(d.school?.studentCount||0)+' students · '+esc(d.tier?.name||'—')+'</div><div style="color:var(--money);font-weight:700;font-size:.8rem;margin-top:3px;">Commission: '+fmt(comm)+'</div>'+(d.students?.length?'<div style="margin-top:4px;"><span class="badge bb">📊 '+d.students.length+' students pre-loaded</span></div>':'')+'</div>';
  }).join('');
}

// ── Image Utilities ────────────────────────────────────────────────────────
async function compressLedger(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.naturalWidth||img.width||1000;
      let h=img.naturalHeight||img.height||750;
      const scale=Math.min(1,800/w);
      w=Math.round(w*scale);h=Math.round(h*scale);
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      const cx=cv.getContext('2d');
      cx.drawImage(img,0,0,w,h);
      const id=cx.getImageData(0,0,w,h);const d=id.data;
      // Step 1: Find actual min/max brightness (auto-levels for washed-out photos)
      let minV=255,maxV=0;
      for(let i=0;i<d.length;i+=4){
        const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);
        if(g<minV)minV=g;if(g>maxV)maxV=g;
      }
      const range=Math.max(maxV-minV,1);
      // Step 2: Stretch histogram then sharpen contrast for handwriting
      for(let i=0;i<d.length;i+=4){
        const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);
        const norm=Math.round((g-minV)/range*255);
        // Dark pixels (ink) → push to black; bright pixels (paper) → push to white
        const c=norm<128?Math.max(0,Math.round(norm*0.4)):Math.min(255,Math.round(128+(norm-128)*2.2));
        d[i]=c;d[i+1]=c;d[i+2]=c;
      }
      cx.putImageData(id,0,0);
      resolve(cv.toDataURL('image/jpeg',0.95));
    };
    img.onerror=reject;img.src=dataUrl;
  });
}

async function compressImage(dataUrl,maxW){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.naturalWidth||img.width||800;
      let h=img.naturalHeight||img.height||600;
      const scale=maxW?Math.min(1,maxW/w):1;
      w=Math.round(w*scale);h=Math.round(h*scale);
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      const cx=cv.getContext('2d');
      cx.filter='contrast(1.2) brightness(1.1)';
      cx.drawImage(img,0,0,w,h);
      resolve(cv.toDataURL('image/jpeg',0.85));
    };
    img.onerror=reject;img.src=dataUrl;
  });
}


// ── Gemini Vision — purpose-built for document/handwriting OCR ────────────

// ── DeepSeek-OCR — providers: regolo (default), novita, deepinfra, siliconflow ─

// ── Groq text-only extraction (no image) ─────────────────────────────────
async function callGroqText(prompt, apiKey){
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'qwen/qwen3.6-27b',
      max_tokens:3000,
      temperature:0.1,
      reasoning_format:'hidden',
      messages:[{role:'user',content:prompt}]
    })
  });
  if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error(e.error?.message||'Groq text '+resp.status);}
  const d=await resp.json();
  let t=d.choices?.[0]?.message?.content||'';
  t=t.replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  return t;
}

async function callDeepSeekOCR(imageDataUrl, apiKey, provider){
  provider = provider || 'regolo';
  const base64 = imageDataUrl.split(',')[1];
  const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
  const dataUrl = 'data:' + mimeType + ';base64,' + base64;

  let endpoint, model;
  if(provider === 'siliconflow'){
    endpoint = 'https://api.siliconflow.cn/v1/chat/completions';
    model    = 'deepseek-ai/DeepSeek-OCR';
  } else if(provider === 'deepinfra'){
    endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
    model    = 'deepseek-ai/DeepSeek-OCR';
  } else if(provider === 'novita'){
    endpoint = 'https://api.novita.ai/openai/chat/completions';
    model    = 'deepseek/deepseek-ocr-2';
  } else {
    // Default: Regolo — hosts DeepSeek-OCR-2, EU-based, free tier
    endpoint = 'https://api.regolo.ai/v1/chat/completions';
    model    = 'deepseek-ocr-2';
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {'Authorization':'Bearer '+apiKey, 'Content-Type':'application/json'},
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      stream: false,
      messages: [{
        role: 'user',
        content: [
          {type:'image_url', image_url:{url: dataUrl}},
          {type:'text', text:'<|grounding|>Convert the document to markdown.'}
        ]
      }]
    })
  });

  if(!resp.ok){
    const err = await resp.json().catch(()=>({}));
    throw new Error(err.error?.message || 'DeepSeek-OCR ' + resp.status + ' (provider: '+provider+')');
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text.trim();
}

// Parse raw markdown/text from DeepSeek-OCR into student records
function parseDeepSeekOCRText(rawText){
  const students = [];
  const seen = new Set();
  const lines = rawText.split('\n');

  for(const line of lines){
    const t = line.trim();
    if(!t || t.length < 3) continue;

    // Skip header rows and separator lines
    if(/^[|\-\s*=]+$/.test(t)) continue;
    if(/s\/n|serial|name.*fee|balance.*fee|term.*fee/i.test(t)) continue;
    if(/total|grand|page|section|class list/i.test(t) && t.length < 40) continue;

    let name = '', nums = [];

    if(t.includes('|')){
      // Markdown table row
      const cols = t.split('|').map(c=>c.trim()).filter(Boolean);
      if(cols.length < 2) continue;
      // First non-numeric col is usually the name (skip S/N col)
      const nameCol = cols.find(c => /[A-Za-z]{3,}/.test(c) && !/^\d+$/.test(c));
      if(!nameCol) continue;
      name = nameCol.replace(/[^A-Za-z\s'\-.]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
      // Collect all numeric values from the row
      cols.forEach(c => {
        const n = parseInt(c.replace(/[,\s]/g,''));
        if(!isNaN(n) && n > 100) nums.push(n);
      });
    } else {
      // Plain text row — strip leading numbers/bullets
      let clean = t.replace(/^\d+[.)\s]+/, '').trim();
      // Extract the name part (longest alphabetic sequence before numbers)
      const nameMatch = clean.match(/^([A-Za-z][A-Za-z\s'\-.]{3,}?)(?=\s+[\d,]|$)/);
      if(!nameMatch) continue;
      name = nameMatch[1].replace(/\s+/g,' ').trim().toUpperCase();
      // Extract numbers
      const numMatches = clean.match(/\d[\d,]*/g) || [];
      numMatches.forEach(m => {
        const n = parseInt(m.replace(/,/g,''));
        if(n > 100) nums.push(n);
      });
    }

    // Validate name — must look like a person's name
    if(!name || name.length < 4) continue;
    // Skip obvious document header/label words
    if(/^(BALANCE|TOTAL|GRAND|FEE|FEES|TERM|DATE|S\/N|SN|NO\.|PAGE|CLASS|SCHOOL|YEAR|LEDGER|SESSION|REGISTER|ACADEMIC|STUDENT|NAME|AMOUNT|PAYMENT|REMARKS|SIGNATURE|APPROVED|GREAT|GEAT|GEEK|HIGHLY)/i.test(name)) continue;
    if(/(SCHOOL FEES|FEE LEDGER|FEES LEDGER|ACADEMIC SESSION|HIGHLY RECOM|AND HIGHLY|CURRENT TERM|BALANCE FROM)/i.test(name)) continue;
    // Must have at least one proper name-like word (3+ letters, not a common label)
    const LABELS=new Set(['THE','AND','FOR','FROM','WITH','THIS','THAT','FEES','TERM','YEAR','DATE','PAGE','PAID','OWING','FULL','PART','BALANCE','TOTAL','NAME','CLASS','AMOUNT','REMARKS','SUM','ALL']);
    const nameWords=name.split(' ').filter(w=>w.length>=3&&!LABELS.has(w.toUpperCase()));
    if(nameWords.length===0)continue;
    if(!/[A-Z]{3,}/.test(name)) continue;
    // Must NOT be all common English words (likely a header phrase)
    if(nameWords.every(w=>/^(GREAT|GOOD|HIGH|BEST|MOST|VERY|WELL|FULL|LAST|NEXT|THIS|THAT|FROM|WILL|WITH|INTO|OVER|UNDER|ABOVE|BELOW)$/i.test(w)))continue;

    const key = name.replace(/[^A-Z]/g,'');
    if(seen.has(key)) continue;
    seen.add(key);

    // Assign fee values: largest number = termFees, second = paid, smallest remainder = balance
    nums.sort((a,b) => b - a);
    const termFees = nums[0] || 0;
    const paid     = nums[1] || 0;
    const balance  = nums[2] || 0;

    let status = 'OWING';
    if(paid >= termFees && termFees > 0) status = 'FULLY PAID';
    else if(paid > 0) status = 'PART PAID';

    students.push({
      name, class:'UNKNOWN', balance, termFees, paid, status,
      confidence: name.split(' ').length >= 2 ? 82 : 60
    });
  }
  return students;
}

async function callGeminiVision(imageDataUrl,prompt,apiKey){
  const base64=imageDataUrl.split(',')[1];
  const mimeType=imageDataUrl.split(';')[0].split(':')[1]||'image/jpeg';
  const resp=await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+apiKey,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[
          {inline_data:{mime_type:mimeType,data:base64}},
          {text:prompt}
        ]}],
        generationConfig:{temperature:0.1,maxOutputTokens:4096}
      })
    }
  );
  if(!resp.ok){const err=await resp.json().catch(()=>({}));throw new Error(err.error?.message||'Gemini '+resp.status);}
  const data=await resp.json();
  const text=data.candidates?.[0]?.content?.parts?.[0]?.text||'';
  return text.trim();
}

async function callGroqVision(imageDataUrl,prompt,apiKey){
  const base64=imageDataUrl.split(',')[1];
  const mimeType=imageDataUrl.split(';')[0].split(':')[1]||'image/jpeg';
  const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'qwen/qwen3.6-27b',
      max_tokens:3000,temperature:0.2,
      reasoning_format:'hidden',
      messages:[{role:'user',content:[
        {type:'image_url',image_url:{url:'data:'+mimeType+';base64,'+base64}},
        {type:'text',text:prompt}
      ]}]
    })
  });
  if(!resp.ok){const err=await resp.json().catch(()=>({}));throw new Error(err.error?.message||'Groq '+resp.status);}
  const data=await resp.json();
  let text=data.choices?.[0]?.message?.content||'';
  text=text.replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  return text;
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=e=>resolve(e.target.result);r.onerror=reject;r.readAsDataURL(file);
  });
}

function fallbackExtract(text){
  const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
  const students=[];const seen=new Set();
  lines.forEach(line=>{
    if(line.length<3||line.length>60)return;
    if(/TOTAL|BALANCE|FEES|TERM|DATE|RECEIPT|LEDGER|SERIAL|SCHOOL|PAGE/i.test(line))return;
    const name=line.replace(/^\d+[.)]\s*/,'').replace(/[^A-Za-z\s'-]/g,'').trim().toUpperCase();
    if(name.length<3)return;
    const key=name.replace(/[^A-Z]/g,'');
    if(seen.has(key))return;
    seen.add(key);
    students.push({name,class:'UNKNOWN',balance:0,termFees:0,paid:0,status:'OWING',confidence:40});
  });
  return students;
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  SQ.ping();
  const saved=localStorage.getItem('ag2_agent');
  if(saved){
    try{
      agent=JSON.parse(saved);
      if(agent&&agent.id){
        startApp();
        if(db&&!agent._guest){const p=normPhone(agent.phone||'');const l=p.startsWith('234')?'0'+p.slice(3):p;refreshBg(agent.id,p,l).catch(()=>{});}
        return;
      }
    }catch(e){localStorage.removeItem('ag2_agent');}
  }
  $('login').style.display='flex';$('login').style.flexDirection='column';
  $('app').style.display='none';
});
