const form=document.querySelector('#scanForm'),input=document.querySelector('#photo'),preview=document.querySelector('#preview'),prompt=document.querySelector('#cameraPrompt'),status=document.querySelector('#status'),result=document.querySelector('#result'),button=document.querySelector('#scanButton');
const accountButton=document.querySelector('#accountButton'),authDialog=document.querySelector('#authDialog'),authForm=document.querySelector('#authForm'),authStatus=document.querySelector('#authStatus'),myWinesButton=document.querySelector('#myWinesButton'),savedWines=document.querySelector('#savedWines');
let lastResult,supabaseClient,session;

async function initialiseAccounts(){
  const config=await fetch('/api/config').then(r=>r.json()).catch(()=>({}));
  if(!config.supabase||!window.supabase)return;
  supabaseClient=window.supabase.createClient(config.supabase.url,config.supabase.anonKey);
  session=(await supabaseClient.auth.getSession()).data.session;
  supabaseClient.auth.onAuthStateChange((_event,nextSession)=>{session=nextSession;showAccountState()});
  accountButton.hidden=false;
  showAccountState();
}
function showAccountState(){
  accountButton.textContent=session?'Sign out':'Sign in';
  myWinesButton.hidden=!session;
  if(session)authDialog.close();
}
accountButton.onclick=async()=>{if(session){await supabaseClient.auth.signOut();savedWines.hidden=true;status.textContent='Signed out.'}else authDialog.showModal()};
document.querySelector('#dialogClose').onclick=()=>authDialog.close();
authForm.onsubmit=async event=>{event.preventDefault();const email=document.querySelector('#email').value.trim();authStatus.textContent='Sending your secure link…';const {error}=await supabaseClient.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});authStatus.textContent=error?error.message:'Check your email and tap the WineSnap sign-in link.'};
myWinesButton.onclick=loadSavedWines;
input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;preview.src=URL.createObjectURL(file);preview.hidden=false;prompt.hidden=true;result.hidden=true;status.textContent='Photo ready to scan.'});
form.addEventListener('submit',async e=>{e.preventDefault();if(!input.files[0])return;if(supabaseClient&&!session){authDialog.showModal();status.textContent='Sign in by email to scan and save your wines.';return}button.disabled=true;button.textContent='Researching this wine…';status.textContent='Reading the label, then finding current reviews, ratings and prices.';result.hidden=true;try{const body=new FormData();body.append('photo',input.files[0]);const headers=session?{Authorization:`Bearer ${session.access_token}`}:{ };const response=await fetch('/api/identify',{method:'POST',headers,body});const data=await response.json();if(!response.ok)throw new Error(data.error);lastResult=data;render(data);status.textContent='Wine identified and researched.'}catch(err){status.textContent=err.message}finally{button.disabled=false;button.textContent='Show me this wine'}});
const value=v=>v===null||v===undefined||v===''?'Not confirmed':Array.isArray(v)?v.join(', '):v;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanText=v=>String(v??'').replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/g,'');
const safeUrl=url=>{try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
const chips=items=>(items||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('')||'<span class="unknown">Not confirmed</span>';
function render(w){
  const facts=[['Vintage',w.vintage],['Origin',[w.region,w.country].filter(Boolean).join(', ')],['Grapes',w.grapes],['Style',w.style],['Alcohol',w.alcohol],['Typical UK price',w.typical_price_gbp]];
  const ratings=(w.ratings||[]).map(r=>`<a class="rating" href="${safeUrl(r.url)}" target="_blank" rel="noopener"><strong>${esc(r.rating)}</strong><span>${esc(r.source)}</span><small>View source ↗</small></a>`).join('');
  const reviews=(w.reviews||[]).map(r=>`<article class="review"><h5>${esc(r.source)}</h5><p>${esc(cleanText(r.summary))}</p><a href="${safeUrl(r.url)}" target="_blank" rel="noopener">Read source ↗</a></article>`).join('');
  const sources=(w.sources||[]).map(s=>`<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('');
  result.innerHTML=`<div class="card"><p class="producer">${esc(value(w.producer))}</p><h3>${esc(value(w.name))}</h3><p class="wine-type">${esc(value(w.wine_type))}</p><div class="facts">${facts.map(([k,v])=>`<div class="fact"><small>${esc(k)}</small><b>${esc(value(v))}</b></div>`).join('')}</div><section class="section ratings-section"><h4>Ratings</h4>${ratings?`<div class="ratings">${ratings}</div>`:'<p class="unknown">No exact-match published rating was found.</p>'}<p>${esc(value(w.critic_rating_summary))}</p></section><section class="section"><h4>Review summary</h4>${reviews||`<p class="unknown">${esc(w.research_caveat||'No sourced review was found for this exact bottle.')}</p>`}</section><section class="section"><h4>Tasting notes</h4><div class="chips">${chips(w.tasting_notes)}</div></section><section class="section"><h4>Food pairings</h4><div class="chips">${chips(w.food_pairings)}</div></section><section class="section serve"><h4>Serve & drink</h4><p><strong>Temperature:</strong> ${esc(value(w.serving_temperature))}</p><p><strong>Drinking window:</strong> ${esc(value(w.drinking_window))}</p></section>${sources?`<section class="section sources"><h4>Sources</h4><ul>${sources}</ul></section>`:''}<p class="caveat"><strong>Identification confidence: ${esc(value(w.confidence))}.</strong> ${esc(value(w.caveat))}</p>${session?'<button class="save-wine" id="saveWine">Save to My Wines</button>':''}<button class="share" id="share">Share this wine</button></div>`;result.hidden=false;document.querySelector('#share').onclick=share;const save=document.querySelector('#saveWine');if(save)save.onclick=saveCurrentWine;result.scrollIntoView({behavior:'smooth'});
}
async function saveCurrentWine(){const fingerprint=[lastResult.producer,lastResult.name,lastResult.vintage].filter(Boolean).join('|').toLowerCase();const {error}=await supabaseClient.from('saved_wines').upsert({user_id:session.user.id,fingerprint,wine:lastResult},{onConflict:'user_id,fingerprint'});status.textContent=error?error.message:'Wine saved to My Wines.'}
async function loadSavedWines(){const {data,error}=await supabaseClient.from('saved_wines').select('id,wine,created_at').order('created_at',{ascending:false});if(error){status.textContent=error.message;return}savedWines.innerHTML=`<div class="card"><h3>My saved wines</h3>${data.length?data.map(item=>`<article class="saved-wine"><strong>${esc(value(item.wine.name))}</strong><span>${esc(value(item.wine.producer))} · ${esc(value(item.wine.vintage))}</span></article>`).join(''):'<p>No saved wines yet.</p>'}</div>`;savedWines.hidden=false;savedWines.scrollIntoView({behavior:'smooth'})}
async function share(){const w=lastResult;const text=`WineSnap: ${value(w.name)}${w.vintage?` ${w.vintage}`:''}\n${value(w.producer)} · ${value(w.region)}\nTasting: ${value(w.tasting_notes)}\nPair with: ${value(w.food_pairings)}`;if(navigator.share)await navigator.share({title:'WineSnap result',text});else{await navigator.clipboard.writeText(text);status.textContent='Wine summary copied.'}}
initialiseAccounts();
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js?v=9',{updateViaCache:'none'});
