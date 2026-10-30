/* ELIAS NIKAH CONTRIBUTIONS MANAGER - local-first PWA */
const DB_NAME = "EliasNikahManagerDB";
const DB_VERSION = 1;
const STORE_NAMES = ["contributors","pledges","payments","gifts"];
let db;
let installPrompt = null;
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const money = (n) => "UGX " + Number(n || 0).toLocaleString("en-UG");
const dateText = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "Date not set";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));

function openDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const d=request.result;
      if(!d.objectStoreNames.contains("contributors")) d.createObjectStore("contributors",{keyPath:"id"});
      if(!d.objectStoreNames.contains("pledges")) d.createObjectStore("pledges",{keyPath:"id"});
      if(!d.objectStoreNames.contains("payments")) d.createObjectStore("payments",{keyPath:"id"});
      if(!d.objectStoreNames.contains("gifts")) d.createObjectStore("gifts",{keyPath:"id"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function all(store){
  return new Promise((resolve,reject)=>{
    const r=db.transaction(store,"readonly").objectStore(store).getAll();
    r.onsuccess=()=>resolve(r.result||[]); r.onerror=()=>reject(r.error);
  });
}
function put(store,value){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,"readwrite"); tx.objectStore(store).put(value);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}
function remove(store,id){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,"readwrite"); tx.objectStore(store).delete(id);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}
function replaceAll(data){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAMES,"readwrite");
    STORE_NAMES.forEach(s=>{
      const os=tx.objectStore(s); os.clear();
      (data[s]||[]).forEach(item=>os.put(item));
    });
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}
async function dataset(){
  const result={schema:"elias-nikah-manager",version:1,exportedAt:new Date().toISOString()};
  for(const s of STORE_NAMES) result[s]=await all(s);
  return result;
}
function toast(message){
  const el=$("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600);
}
function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function personName(id,people){return people.find(p=>p.id===id)?.name||"Unknown contributor";}
function formObject(form){return Object.fromEntries(new FormData(form).entries());}
function resetDateInputs(){document.querySelectorAll('input[type="date"]').forEach(i=>{if(!i.value)i.value=today();});}
async function refresh(){
  const [people,pledges,payments,gifts]=await Promise.all(STORE_NAMES.map(all));
  const receivedByPledge={};
  payments.forEach(p=>receivedByPledge[p.pledgeId]=(receivedByPledge[p.pledgeId]||0)+Number(p.amount));
  const pledged=pledges.reduce((s,p)=>s+Number(p.amount),0);
  const received=payments.reduce((s,p)=>s+Number(p.amount),0);
  $("totalPledged").textContent=money(pledged);
  $("totalReceived").textContent=money(received);
  $("totalOutstanding").textContent=money(Math.max(0,pledged-received));
  $("giftCount").textContent=gifts.length;
  $("peopleCount").textContent=people.length+" people";
  $("dataSummary").innerHTML=`<div>Contributors: <strong>${people.length}</strong></div><div>Pledges: <strong>${pledges.length}</strong></div><div>Payments: <strong>${payments.length}</strong></div><div>Other contributions: <strong>${gifts.length}</strong></div>`;
  const options='<option value="">Choose contributor</option>'+people.sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join("");
  ["pledgePerson","giftPerson"].forEach(id=>$(id).innerHTML=options);
  const pledgeOptions='<option value="">Choose a pledge</option>'+pledges.map(p=>{
    const paid=receivedByPledge[p.id]||0, remaining=Math.max(0,Number(p.amount)-paid);
    return `<option value="${escapeHTML(p.id)}">${escapeHTML(personName(p.personId,people))} — ${money(p.amount)} (balance ${money(remaining)})</option>`;
  }).join("");
  $("paymentPledge").innerHTML=pledgeOptions;
  renderPeople(people); renderPledges(people,pledges,receivedByPledge); renderPayments(people,pledges,payments); renderGifts(people,gifts);
  renderRecent(people,pledges,payments,gifts); renderAll(people,pledges,payments,gifts);
}
function actionButtons(store,id){return `<div class="record-actions"><button class="mini-btn delete" data-delete="${store}" data-id="${escapeHTML(id)}">Delete</button></div>`;}
function renderPeople(people){
  const q=($("peopleSearch").value||"").toLowerCase();
  const filtered=people.filter(p=>(p.name+" "+(p.phone||"")).toLowerCase().includes(q));
  $("contributorsList").innerHTML=filtered.length?filtered.map(p=>`<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(p.name)}</div><div class="record-meta">${escapeHTML(p.phone||"No phone supplied")}${p.notes?" · "+escapeHTML(p.notes):""}</div></div><div>${actionButtons("contributors",p.id)}</div></div>`).join(""):"No matching contributors.";
}
function renderPledges(people,pledges,paidMap){
  $("pledgesList").innerHTML=pledges.length?pledges.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{
    const paid=paidMap[p.id]||0, due=Math.max(0,Number(p.amount)-paid);
    return `<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(personName(p.personId,people))}</div><div class="record-meta">${dateText(p.date)}${p.notes?" · "+escapeHTML(p.notes):""}<br><span class="status ${due?"due":""}">${due?"Balance due":"Completed"}</span> Paid ${money(paid)} · Balance ${money(due)}</div></div><div><div class="record-amount">${money(p.amount)}</div>${actionButtons("pledges",p.id)}</div></div>`;
  }).join(""):"No pledges recorded yet.";
}
function renderPayments(people,pledges,payments){
  $("paymentsList").innerHTML=payments.length?payments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{
    const pledge=pledges.find(x=>x.id===p.pledgeId);
    return `<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(personName(pledge?.personId,people))}</div><div class="record-meta">${dateText(p.date)} · ${escapeHTML(p.method||"Payment")}${p.reference?" · Ref: "+escapeHTML(p.reference):""}</div></div><div><div class="record-amount">${money(p.amount)}</div>${actionButtons("payments",p.id)}</div></div>`;
  }).join(""):"No payments recorded yet.";
}
function renderGifts(people,gifts){
  $("giftsList").innerHTML=gifts.length?gifts.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(g.item)} — ${escapeHTML(personName(g.personId,people))}</div><div class="record-meta">${dateText(g.date)} · ${escapeHTML(g.quantity||"Details not supplied")}${g.notes?" · "+escapeHTML(g.notes):""}</div></div><div><div class="record-amount">${g.value?money(g.value):"In-kind"}</div>${actionButtons("gifts",g.id)}</div></div>`).join(""):"No other contributions recorded yet.";
}
function renderRecent(people,pledges,payments,gifts){
  const items=[
    ...pledges.map(x=>({type:"Pledge",name:personName(x.personId,people),amount:money(x.amount),date:x.date})),
    ...payments.map(x=>({type:"Payment",name:personName(pledges.find(p=>p.id===x.pledgeId)?.personId,people),amount:money(x.amount),date:x.date})),
    ...gifts.map(x=>({type:"Gift",name:personName(x.personId,people)+" · "+x.item,amount:x.value?money(x.value):"In-kind",date:x.date}))
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  $("recentActivity").innerHTML=items.length?items.map(x=>`<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(x.type)} · ${escapeHTML(x.name)}</div><div class="record-meta">${dateText(x.date)}</div></div><div class="record-amount">${escapeHTML(x.amount)}</div></div>`).join(""):"No activity yet. Add your first contributor or pledge.";
}
function renderAll(people,pledges,payments,gifts){
  const q=($("recordsSearch").value||"").toLowerCase();
  const items=[
    ...pledges.map(x=>({store:"pledges",id:x.id,type:"Pledge",name:personName(x.personId,people),detail:x.notes||"",amount:money(x.amount),date:x.date})),
    ...payments.map(x=>({store:"payments",id:x.id,type:"Payment",name:personName(pledges.find(p=>p.id===x.pledgeId)?.personId,people),detail:x.method+" "+(x.reference||""),amount:money(x.amount),date:x.date})),
    ...gifts.map(x=>({store:"gifts",id:x.id,type:"Other gift",name:personName(x.personId,people),detail:x.item+" "+(x.quantity||""),amount:x.value?money(x.value):"In-kind",date:x.date}))
  ].filter(x=>(x.type+" "+x.name+" "+x.detail).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
  $("allRecords").innerHTML=items.length?items.map(x=>`<div class="record"><div class="record-main"><div class="record-title">${escapeHTML(x.type)} · ${escapeHTML(x.name)}</div><div class="record-meta">${dateText(x.date)} · ${escapeHTML(x.detail)}</div></div><div><div class="record-amount">${escapeHTML(x.amount)}</div>${actionButtons(x.store,x.id)}</div></div>`).join(""):"No matching records.";
}
function download(filename,content,type){
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function csvCell(v){return '"'+String(v??"").replace(/"/g,'""')+'"';}
async function exportCSV(){
  const d=await dataset(), people=d.contributors, pledges=d.pledges;
  const rows=[["Record type","Contributor","Date","Amount UGX","Details","Method/reference"]];
  d.pledges.forEach(p=>rows.push(["Pledge",personName(p.personId,people),p.date,p.amount,p.notes||"",""]));
  d.payments.forEach(p=>rows.push(["Payment",personName(pledges.find(x=>x.id===p.pledgeId)?.personId,people),p.date,p.amount,"",p.method+" "+(p.reference||"")]));
  d.gifts.forEach(g=>rows.push(["Other contribution",personName(g.personId,people),g.date,g.value||"",g.item+" "+(g.quantity||""),g.notes||""]));
  download("elias-nikah-records-"+today()+".csv","\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");
}
function validBackup(data){
  return data && data.schema==="elias-nikah-manager" && data.version===1 && STORE_NAMES.every(s=>Array.isArray(data[s]));
}
async function init(){
  db=await openDB();
  $("todayLabel").textContent=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
  resetDateInputs(); await refresh();
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
  $("contributorForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=formObject(e.target);
    await put("contributors",{id:uid(),name:v.name.trim(),phone:v.phone.trim(),notes:v.notes.trim(),createdAt:new Date().toISOString()});
    e.target.reset();await refresh();toast("Contributor saved.");
  });
  $("pledgeForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=formObject(e.target);
    await put("pledges",{id:uid(),personId:v.personId,amount:Number(v.amount),date:v.date,notes:v.notes.trim(),createdAt:new Date().toISOString()});
    e.target.reset();resetDateInputs();await refresh();toast("Pledge saved.");
  });
  $("paymentForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=formObject(e.target), pledges=await all("pledges");
    const pledge=pledges.find(p=>p.id===v.pledgeId);const payments=await all("payments");
    const paid=payments.filter(p=>p.pledgeId===v.pledgeId).reduce((s,p)=>s+Number(p.amount),0);
    if(!pledge){toast("Choose a valid pledge.");return;}
    if(Number(v.amount)>Math.max(0,Number(pledge.amount)-paid)){if(!confirm("This payment is greater than the remaining pledge balance. Record it anyway?"))return;}
    await put("payments",{id:uid(),pledgeId:v.pledgeId,amount:Number(v.amount),date:v.date,method:v.method,reference:v.reference.trim(),notes:v.notes.trim(),createdAt:new Date().toISOString()});
    e.target.reset();resetDateInputs();await refresh();toast("Payment saved.");
  });
  $("giftForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=formObject(e.target);
    await put("gifts",{id:uid(),personId:v.personId,item:v.item.trim(),quantity:v.quantity.trim(),date:v.date,value:Number(v.value||0),notes:v.notes.trim(),createdAt:new Date().toISOString()});
    e.target.reset();resetDateInputs();await refresh();toast("Other contribution saved.");
  });
  document.body.addEventListener("click",async e=>{
    const b=e.target.closest("[data-delete]");if(!b)return;
    const store=b.dataset.delete,id=b.dataset.id;
    if(store==="contributors"){
      const [p,g]=await Promise.all([all("pledges"),all("gifts")]);
      if(p.some(x=>x.personId===id)||g.some(x=>x.personId===id)){alert("This contributor has linked records. Delete their pledges, payments and gifts first.");return;}
    }
    if(store==="pledges"){
      const pays=await all("payments");
      if(pays.some(x=>x.pledgeId===id)){alert("This pledge has payments. Delete its payments first.");return;}
    }
    if(confirm("Delete this record? This cannot be undone unless you have a backup.")){await remove(store,id);await refresh();toast("Record deleted.");}
  });
  $("peopleSearch").addEventListener("input",refresh);$("recordsSearch").addEventListener("input",refresh);
  $("exportJson").addEventListener("click",async()=>{const d=await dataset();download("elias-nikah-backup-"+today()+".json",JSON.stringify(d,null,2),"application/json");toast("Backup downloaded.");});
  $("exportCsv").addEventListener("click",exportCSV);
  $("restoreFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(!validBackup(data))throw new Error("This file is not a supported Nikah Manager backup.");
      if(confirm("Restore this backup? It will replace all records currently stored in this app.")){await replaceAll(data);await refresh();toast("Backup restored successfully.");}
    }catch(err){alert(err.message||"Could not read this backup file.");}finally{e.target.value="";}
  });
  $("clearData").addEventListener("click",async()=>{if(confirm("Permanently delete ALL contributors, pledges, payments and gifts from this phone?")){await replaceAll({});await refresh();toast("All app data deleted.");}});
  if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
    navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("Offline worker not registered",err));
  }
}
function showView(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
  window.scrollTo({top:0,behavior:"smooth"});
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").hidden=false;});
$("installBtn").addEventListener("click",async()=>{if(!installPrompt){toast("Use Chrome menu → Add to Home screen.");return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").hidden=true;});
window.addEventListener("load",()=>init().catch(err=>{console.error(err);alert("The app could not open its local database. Please open it in an up-to-date browser.");}));
