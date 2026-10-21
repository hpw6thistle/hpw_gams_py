/* Anonymous, offline-capable workflow simulation. No API, authentication or mail service. */
'use strict';
const STORAGE_KEY = 'hpw-anonymous-pages-demo-v1';
const STATUS = ['待處理', '處理中', '部分完成', '已完成', '退回補件'];
const ROLE_NAMES = {applicant:'展示申請人', managerA:'範例管理人甲', managerB:'範例管理人乙', super:'展示最高管理人'};
const PATHS = {
  document:'<path d="M7 3h7l4 4v14H5V3z"/><path d="M14 3v5h5M8 12h7M8 16h5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 13h18M10 12v3h4v-3"/>',
  settings:'<path d="m9 3-1 3-3 1-2 3 2 3v4l4 1 3 3 3-3 4-1v-4l2-3-2-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L19 6"/>', shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  return:'<path d="m8 5-5 5 5 5M3 10h12a5 5 0 0 1 0 10h-3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  arrow:'<path d="M4 12h16m-5-5 5 5-5 5"/>', download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.document}</svg>`;}
function esc(value){return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function businessDate(value = new Date()){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  return ['year','month','day'].map(t => parts.find(p => p.type === t).value).join('');
}
function displayDate(value){return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function timeText(value){return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function badge(status){const type = {'待處理':'pending','處理中':'progress','已完成':'complete','退回補件':'returned','部分完成':'partial'}[status] || 'pending';return `<span class="badge ${type}">${esc(status)}</span>`;}
function overall(tasks){const values=tasks.map(t=>t.status);if(values.length && values.every(v=>v==='已完成'))return '已完成';if(values.includes('退回補件'))return '退回補件';if(values.includes('已完成'))return '部分完成';if(values.includes('處理中'))return '處理中';return '待處理';}
function initialMasters(){return {systems:[
  {id:'finance',name:'財會系統',roles:['財會主管','財會專員','應付帳款','採購專員'],manager:'managerA',active:true,usesCompany:true},
  {id:'hr',name:'人事系統',roles:['總部人事','各區人事','薪資作業'],manager:'managerB',active:true,usesCompany:true},
  {id:'collab',name:'協作平台',roles:['一般使用者','專案管理'],manager:'managerB',active:true,usesCompany:false},
  {id:'bpm',name:'簽核平台',roles:[],manager:'managerB',active:true,usesCompany:false},
],units:['總部','北區','中區','南區'],companies:['範例公司 A','範例公司 B','範例公司 C']};}
function assignee(system, profile, rules = db.ruleEnabled){return system.id==='hr' && rules && profile.department.includes('財務') ? 'managerA' : system.manager;}
function profileOf(request){return request.mode==='代為申請' ? request.beneficiary : request.applicant;}
function snapshotOf(request,task){return JSON.parse(JSON.stringify({number:request.number,mode:request.mode,type:request.type,existing:request.existing,applicant:request.applicant,beneficiary:profileOf(request),companies:request.companies,system:task.name,roles:task.roles,account:task.account,password:task.password,completedAt:task.completedAt}));}
function seed(){
  const state={version:1,masters:initialMasters(),ruleEnabled:true,requests:[]};
  const scenarios=[
    {employee:'DEMO001',name:'範例申請人甲',systems:['finance','hr'],statuses:['待處理','處理中']},
    {employee:'DEMO001',name:'範例申請人甲',proxy:true,beneficiary:'DEMO002',beneficiaryName:'範例使用者乙',department:'財務部',systems:['finance','hr'],statuses:['已完成','退回補件']},
    {employee:'DEMO001',name:'範例申請人甲',systems:['collab'],statuses:['已完成']},
    {employee:'DEMO003',name:'範例使用者丙',systems:['hr'],statuses:['待處理']},
    {employee:'DEMO001',name:'範例申請人甲',systems:['finance','hr'],statuses:['已完成','已完成']},
    {employee:'DEMO004',name:'範例申請人丁',proxy:true,beneficiary:'DEMO001',beneficiaryName:'範例申請人甲',systems:['collab'],statuses:['待處理']},
    {employee:'DEMO005',name:'範例使用者戊',department:'財務部',systems:['finance'],statuses:['待處理']},
    {employee:'DEMO001',name:'範例申請人甲',systems:['bpm'],statuses:['待處理']},
    {employee:'DEMO006',name:'範例使用者己',department:'財務部',systems:['hr'],statuses:['退回補件']},
    {employee:'DEMO001',name:'範例申請人甲',systems:['finance'],statuses:['處理中']},
  ];
  const counters={};
  scenarios.forEach((sample,index)=>{
    const created=new Date(Date.now()-(index+1)*67*60000).toISOString(),day=businessDate(created);
    counters[day]=(counters[day] || 0)+1;
    const applicant={employee:sample.employee,name:sample.name,english:'DemoUser'+String.fromCharCode(65+index),unit:'總部',department:sample.proxy?'資訊部':(sample.department || '資訊部')};
    const beneficiary=sample.proxy?{employee:sample.beneficiary,name:sample.beneficiaryName,english:'DemoBeneficiary',unit:'總部',department:sample.department || '資訊部'}:{...applicant};
    const request={number:`BPM${day}${String(counters[day]).padStart(3,'0')}`,mode:sample.proxy?'代為申請':'自行申請',type:'新增帳號',existing:'',applicant,beneficiary,reason:sample.proxy?'示範：協助同仁申請職務所需權限。':'',description:'展示用途的虛構申請，沒有真實人員或帳號。',companies:beneficiary.department.includes('財務')?['範例公司 A']:[],created,updated:created,tasks:[],audit:[{at:created,actor:applicant.name,action:'送出申請',detail:'建立匿名展示申請'}]};
    request.tasks=sample.systems.map((id,i)=>{
      const system=state.masters.systems.find(s=>s.id===id),status=sample.statuses[i];
      const task={id:`seed-${index}-${i}`,systemId:id,name:system.name,roles:system.roles.slice(0,1),person:assignee(system,beneficiary,state.ruleEnabled),status,account:status==='已完成'?`demo.user.${index+1}`:'',password:status==='已完成'?'DemoPasswordA':'',note:'',returnReason:status==='退回補件'?'請確認權限使用人的部門與職務角色，再重新送出。':'',completedAt:status==='已完成'?created:null};
      if(status==='已完成')task.snapshot=snapshotOf(request,task);
      return task;
    });
    state.requests.push(request);
  });
  return state;
}
function load(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY));if(data?.version===1 && Array.isArray(data.requests) && Array.isArray(data.masters?.systems) && data.requests.every(r=>Array.isArray(r.tasks)&&r.applicant?.employee&&Array.isArray(r.audit)))return data;}catch{}return seed();}
let db=load();
const ui={role:(()=>{try{return sessionStorage.getItem('hpw-demo-role') || 'applicant';}catch{return 'applicant';}})(),view:'overview',filter:'全部',page:1,query:'',managerTab:'pending',lookup:null,lookupNo:'',lookupEmp:'DEMO001',editing:null,draft:null,success:null};
if(!ROLE_NAMES[ui.role])ui.role='applicant';
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}catch{toast('瀏覽器無法儲存，目前操作僅保留到這個頁面關閉。');}}
function toast(message){const element=document.getElementById('toast');element.textContent=message;element.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove('visible'),3500);}
function isManager(){return ui.role!=='applicant';}
function owns(task){return ui.role==='super' || task.person===ui.role;}
function visibleRequests(){return db.requests.filter(r=>ui.role==='applicant' ? (r.applicant.employee==='DEMO001'||(r.mode==='代為申請'&&r.beneficiary.employee==='DEMO001')) : r.tasks.some(owns));}
function findRequest(number){return db.requests.find(r=>r.number===number);}
function audit(request,action,detail,actor=ROLE_NAMES[ui.role]){request.updated=new Date().toISOString();request.audit.push({at:request.updated,action,detail,actor});}
function mainHeading(title,description,actions=''){return `<div class="page-heading"><div><p class="eyebrow">ACCOUNT & ACCESS</p><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;}
function button(text,action,classes='',extra=''){return `<button class="btn ${classes}" data-action="${action}" ${extra}>${text}</button>`;}
function shell(){
  document.getElementById('app').innerHTML=`<div class="menu-backdrop" data-action="close-menu"></div><aside class="sidebar"><a href="#overview" class="brand"><span class="brand-symbol">${icon('document')}</span><span><strong>權限申請平台</strong><small>ACCESS WORKSPACE</small></span></a><div class="nav-label">申請服務</div><nav aria-label="主要導覽"><a class="nav-item" data-view="overview" href="#overview">${icon('grid')}<span>工作總覽</span></a><a class="nav-item" data-view="apply" href="#apply">${icon('plus')}<span>提出申請</span></a><a class="nav-item" data-view="lookup" href="#lookup">${icon('search')}<span>進度查詢</span></a><div class="nav-label">管理展示</div><a class="nav-item" data-view="workbench" href="#workbench">${icon('briefcase')}<span>案件工作台</span></a><a class="nav-item" data-view="settings" href="#settings">${icon('settings')}<span>主檔與規則</span></a></nav><div class="sidebar-bottom"><div class="sidebar-help"><strong>安心體驗，放心操作</strong><p>所有人員、案件與帳密均為虛構。可隨時重設展示資料。</p><button data-action="reset">重設展示資料</button></div><div class="version">DEMO EDITION · v1.0</div></div></aside><div class="shell"><header class="topbar"><button class="mobile-menu" aria-label="開啟選單" data-action="menu">${icon('menu')}</button><div class="breadcrumbs">申請服務 <span id="breadcrumb-current">工作總覽</span></div><div class="topbar-search">${icon('search')}<input id="quick-search" type="search" aria-label="搜尋展示案件" placeholder="搜尋申請編號或姓名"></div><div class="role-switch"><span class="avatar" id="role-avatar">甲</span><div><label for="role-select">切換展示角色</label><select id="role-select">${Object.entries(ROLE_NAMES).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></div></div></header><div class="demo-strip">${icon('shield')}<strong>匿名假資料展示版</strong><span>僅在此瀏覽器模擬操作，請勿輸入真實個資或密碼。</span></div><main id="main" class="content" tabindex="-1"></main></div>`;
  document.getElementById('role-select').value=ui.role;
}
function footer(){return `<footer class="page-footer"><span>© ${new Date().getFullYear()} Access Workspace · 互動展示</span><span>全部使用匿名假資料・不會建立真實帳號或寄送郵件</span></footer>`;}
function render(){
  const names={overview:'工作總覽',apply:ui.editing?'補件與修改':'提出申請',lookup:'進度查詢',workbench:'案件工作台',settings:'主檔與規則'};
  document.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.view===ui.view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.getElementById('breadcrumb-current').textContent=names[ui.view] || names.overview;
  document.getElementById('role-avatar').textContent=ui.role==='super'?'管':ui.role==='managerB'?'乙':'甲';
  document.getElementById('role-select').value=ui.role;
  const views={overview:renderOverview,apply:renderApply,lookup:renderLookup,workbench:renderWorkbench,settings:renderSettings};
  document.getElementById('main').innerHTML=(views[ui.view] || renderOverview)()+footer();
  document.title=`${names[ui.view] || '工作總覽'}｜權限申請平台展示版`;
}
function go(view){if(!['overview','apply','lookup','workbench','settings'].includes(view))view='overview';ui.view=view;ui.query='';ui.page=1;document.getElementById('quick-search').value='';if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);closeMenu();render();window.scrollTo({top:0,behavior:'instant'});}
function guide(){return `<div class="panel"><div class="panel-head"><h2>申請流程</h2><span style="color:#b2bed1">${icon('info')}</span></div><div class="guide-list">${[['document','填寫申請資料','選擇申請方式、系統與所需角色。'],['briefcase','管理人分工處理','依權限使用人的部門與規則指派。'],['check','完成帳號與權限設定','處理完成後，可在進度頁查看結果。']].map(([i,t,p])=>`<div class="guide-item"><span class="step-icon">${icon(i)}</span><div><strong>${t}</strong><p>${p}</p></div></div>`).join('')}</div></div>`;}
function renderOverview(){
  const visible=visibleRequests(),statuses=visible.map(r=>overall(r.tasks));
  const filtered=visible.filter(r=>(ui.filter==='全部'||overall(r.tasks)===ui.filter)&&[r.number,r.applicant.name,profileOf(r).name].some(v=>v.toLowerCase().includes(ui.query.toLowerCase()))).sort((a,b)=>b.created.localeCompare(a.created));
  const pages=Math.max(1,Math.ceil(filtered.length/5));ui.page=Math.min(ui.page,pages);
  const counts=[visible.length,statuses.filter(s=>['待處理','處理中','部分完成'].includes(s)).length,statuses.filter(s=>s==='已完成').length,statuses.filter(s=>s==='退回補件').length];
  const logs=visible.flatMap(r=>r.audit.map(a=>({...a,number:r.number}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,3);
  return mainHeading('工作總覽','申請進度、待辦事項，一目瞭然。',button(`${icon('plus')}提出新申請`,'new','primary'))+`<section class="welcome"><div><div class="welcome-tag"><span class="dot"></span>YOUR ACCESS, SIMPLIFIED</div><h2>讓每一份申請，都有清楚的下一步。</h2><p>從提出需求到完成設定，集中追蹤帳號與權限申請，讓日常工作更順暢。</p></div><div class="welcome-art" aria-hidden="true"><div class="art-back"></div><div class="art-front"><span>${icon('check')}</span><span></span><span></span><span style="width:65%"></span></div><span class="art-check">${icon('check')}</span></div></section><section class="stats" aria-label="申請統計">${[['我的展示申請','document','依目前展示角色篩選'],['進行中','clock','等待或正在處理的案件'],['已完成','check','帳號與權限已設定完成'],['待補件','return','需要補充資料的案件']].map(([title,i,caption],n)=>`<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(i)}</span></div><div class="stat-bottom"><span class="stat-number">${counts[n]}</span><small>件</small></div><div class="stat-caption">${caption}</div></article>`).join('')}</section><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>最近申請</h2><p>追蹤您的申請與處理狀態</p></div>${button(`${icon('download')}匯出`,'export','small')}</div><div class="filter-bar">${['全部','待處理','處理中','已完成','退回補件'].map(s=>`<button class="filter ${ui.filter===s?'active':''}" data-action="filter" data-filter="${s}">${s}<span class="count">${s==='全部'?visible.length:statuses.filter(v=>v===s).length}</span></button>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>申請編號</th><th>申請內容</th><th>目前狀態</th><th>申請日期</th><th>操作</th></tr></thead><tbody>${filtered.slice((ui.page-1)*5,ui.page*5).map(r=>`<tr><td><button class="request-link" data-action="case" data-number="${r.number}">${r.number}</button><small>${esc(r.mode)}</small></td><td><strong>${esc(profileOf(r).name)}</strong><div>${r.tasks.map(t=>`<span class="system-tag">${esc(t.name)}</span>`).join('')}</div></td><td>${badge(overall(r.tasks))}</td><td>${displayDate(r.created).split(' ')[0]}</td><td>${button('查看','case','text small',`data-number="${r.number}"`)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">沒有符合條件的展示申請。</td></tr>'}</tbody></table></div><div class="table-footer"><span>共 ${filtered.length} 筆展示申請</span><div class="pagination"><button aria-label="上一頁" data-action="page" data-page="${ui.page-1}" ${ui.page===1?'disabled':''}>‹</button>${Array.from({length:pages},(_,i)=>`<button class="${ui.page===i+1?'active':''}" aria-label="第 ${i+1} 頁" data-action="page" data-page="${i+1}">${i+1}</button>`).join('')}<button aria-label="下一頁" data-action="page" data-page="${ui.page+1}" ${ui.page===pages?'disabled':''}>›</button></div></div></section><aside class="side-stack">${guide()}<section class="panel"><div class="panel-head"><h2>最近動態</h2></div><div class="timeline">${logs.map(a=>`<div class="timeline-item"><strong>${esc(a.action)}</strong><p>${a.number}</p><small>${displayDate(a.at)}</small></div>`).join('') || '<div class="empty">尚無動態</div>'}</div></section></aside></div><div class="mini-note">${icon('info')}您目前看到的是 ${esc(ROLE_NAMES[ui.role])} 的展示資料，可從右上角切換角色體驗不同流程。</div>`;
}
function blankDraft(){return {mode:'自行申請',employee:'DEMO001',name:'範例申請人甲',english:'DemoUserA',unit:'總部',department:'資訊部',ben_employee:'DEMO007',ben_name:'範例使用者庚',ben_english:'DemoUserG',ben_unit:'總部',ben_department:'財務部',reason:'示範：協助同仁申請工作所需權限。',type:'新增帳號',existing:'',description:'這是一筆匿名假資料展示申請。',systems:[],roles:{},companies:[]};}
function textField(label,name,value,type='text',required=true,full=false,readonly=false){return `<label class="field ${full?'full':''}"><span>${label}${required?' <span class="required">*</span>':''}</span><input name="${name}" type="${type}" value="${esc(value)}" maxlength="${name.includes('employee')?30:120}" ${required?'required':''} ${readonly?'readonly':''} autocomplete="off"></label>`;}
function unitField(label,name,value){const units=[...new Set([...db.masters.units,value].filter(Boolean))];return `<label class="field"><span>${label} <span class="required">*</span></span><select name="${name}" required>${units.map(u=>`<option ${value===u?'selected':''}>${esc(u)}</option>`).join('')}</select></label>`;}
function draftProfile(draft){return {employee:draft.mode==='代為申請'?draft.ben_employee:draft.employee,name:draft.mode==='代為申請'?draft.ben_name:draft.name,english:draft.mode==='代為申請'?draft.ben_english:draft.english,unit:draft.mode==='代為申請'?draft.ben_unit:draft.unit,department:draft.mode==='代為申請'?draft.ben_department:draft.department};}
function needsCompanies(draft){const p=draftProfile(draft);return p.unit==='總部'&&p.department.includes('財務')&&draft.systems.some(id=>db.masters.systems.find(s=>s.id===id)?.usesCompany);}
function descriptionStep(draft){return String((draft.mode==='代為申請'?5:4)+(needsCompanies(draft)?1:0)).padStart(2,'0');}
function updateCompanySections(){document.getElementById('companies-slot').innerHTML=companySection(ui.draft);document.getElementById('description-step').textContent=descriptionStep(ui.draft);}
function companySection(draft){if(!needsCompanies(draft))return '';return `<div class="form-section"><div class="section-heading"><span class="section-number">${String(draft.mode==='代為申請'?5:4).padStart(2,'0')}</span><h2>負責帳套</h2></div><div class="company-options">${db.masters.companies.map(name=>`<label><input type="checkbox" name="companies" value="${esc(name)}" ${draft.companies.includes(name)?'checked':''}>${esc(name)}</label>`).join('')}</div></div>`;}
function readDraft(form){
  const data=new FormData(form),draft={...ui.draft};
  for(const [key,value] of data.entries())if(!['systems','roles','companies'].includes(key)&&!key.startsWith('role_'))draft[key]=String(value);
  draft.systems=ui.editing?findRequest(ui.editing).tasks.map(t=>t.systemId):data.getAll('systems');draft.companies=data.getAll('companies');draft.roles={...ui.draft.roles};
  for(const id of draft.systems)draft.roles[id]=data.getAll('role_'+id);
  if(ui.editing){const req=findRequest(ui.editing);for(const task of req.tasks)if(task.status==='已完成'){if(!draft.systems.includes(task.systemId))draft.systems.push(task.systemId);draft.roles[task.systemId]=[...task.roles];}}
  return draft;
}
function renderApply(){
  if(ui.success)return mainHeading('申請已送出','已建立一筆新的匿名展示案件。')+`<section class="panel success-panel"><div class="success-mark">${icon('check')}</div><h2>申請已成功送出</h2><p>請保留完整申請編號，之後可搭配展示員工編號查詢。</p><div class="request-number"><code>${ui.success}</code>${button(`${icon('copy')}複製`,'copy','small',`data-value="${ui.success}"`)}</div><p>展示查詢員工編號：${esc(findRequest(ui.success).applicant.employee)}</p><div class="success-actions">${button('查看申請進度','lookup-success','primary')}${button('再建立一筆','new')}</div><p class="mini-note" style="justify-content:center">這是瀏覽器內的模擬操作，沒有建立真實帳號或寄送郵件。</p></section>`;
  if(!ui.draft)ui.draft=blankDraft();const d=ui.draft,original=ui.editing?findRequest(ui.editing):null;
  const systems=original?original.tasks.map(t=>db.masters.systems.find(s=>s.id===t.systemId)).filter(Boolean):db.masters.systems.filter(s=>s.active);
  return mainHeading(original?'補件與修改':'提出新申請',original?'沿用原申請編號；已完成的系統與帳密快照會保留。':'填寫匿名示例資料，體驗帳號與權限申請流程。')+`<div class="form-layout"><form id="application-form" class="panel"><section class="form-section"><div class="section-heading"><span class="section-number">01</span><h2>申請人資訊</h2></div><div class="radio-group">${['自行申請','代為申請'].map(v=>`<label><input type="radio" name="mode" value="${v}" ${d.mode===v?'checked':''} ${original?'disabled':''}>${v}</label>`).join('')}</div><div class="form-grid">${textField('員工編號','employee',d.employee,'text',true,false,Boolean(original))}${textField('中文姓名','name',d.name)}${textField('英文名稱','english',d.english)}${unitField('所屬單位','unit',d.unit)}${textField('部門名稱','department',d.department)}<label class="field"><span>申請日期</span><input value="${businessDate().replace(/(\d{4})(\d{2})(\d{2})/,'$1 / $2 / $3')}" disabled></label></div></section>${d.mode==='代為申請'?`<section class="form-section"><div class="section-heading"><span class="section-number">02</span><h2>權限使用人</h2></div><div class="form-grid">${textField('權限使用人員工編號','ben_employee',d.ben_employee)}${textField('權限使用人中文姓名','ben_name',d.ben_name)}${textField('權限使用人英文名稱','ben_english',d.ben_english)}${unitField('權限使用人單位','ben_unit',d.ben_unit)}${textField('權限使用人部門','ben_department',d.ben_department)}${textField('代為申請原因','reason',d.reason,'text',true,true)}</div></section>`:''}<section class="form-section"><div class="section-heading"><span class="section-number">${String(d.mode==='代為申請'?3:2).padStart(2,'0')}</span><h2>申請類型</h2></div><div class="radio-group">${['新增帳號','已有帳號新增功能'].map(v=>`<label><input type="radio" name="type" value="${v}" ${d.type===v?'checked':''} ${original?'disabled':''}>${v}</label>`).join('')}</div>${d.type==='已有帳號新增功能'?textField('原 User 帳號','existing',d.existing):''}</section><section class="form-section"><div class="section-heading"><span class="section-number">${String(d.mode==='代為申請'?4:3).padStart(2,'0')}</span><h2>申請系統與角色</h2></div>${systems.map(system=>{
    const selected=d.systems.includes(system.id),completed=original?.tasks.find(t=>t.systemId===system.id)?.status==='已完成';
    return `<div class="system-card ${selected?'selected':''}"><label class="system-choice"><input type="checkbox" name="systems" value="${system.id}" ${selected?'checked':''} ${original?'disabled':''}>${esc(system.name)}<small>${completed?'已完成，保留原內容':system.roles.length?'選擇需要的權限':'無需另選角色'}</small></label>${selected?`<div class="role-options">${system.roles.map(role=>`<label><input type="checkbox" name="role_${system.id}" value="${esc(role)}" ${(d.roles[system.id] || []).includes(role)?'checked':''} ${completed?'disabled':''}>${esc(role)}</label>`).join('') || '<span style="font-size:11px;color:#9ba8bc">此系統不需選擇角色。</span>'}</div>`:''}</div>`;
  }).join('')}</section><div id="companies-slot">${companySection(d)}</div><section class="form-section"><div class="section-heading"><span class="section-number" id="description-step">${descriptionStep(d)}</span><h2>其他說明</h2></div><label class="field"><span>補充功能與權限需求</span><textarea name="description" maxlength="600">${esc(d.description)}</textarea></label></section><div class="form-submit"><p>請使用虛構資料。此申請只會儲存在您的瀏覽器內。</p><button class="btn primary" type="submit">${original?'重新送出補件':'送出展示申請'} ${icon('arrow')}</button></div></form><aside class="side-stack">${guide()}<section class="panel"><div class="panel-head"><h2>可以試試看</h2></div><div style="padding:0 22px 20px"><ul class="plain-list"><li>改用「代為申請」填寫權限使用人。</li><li>使用「總部／財務部」查看帳套選項。</li><li>申請人事系統，觀察部門指派差異。</li><li>切換管理人角色，處理剛建立的案件。</li></ul></div></section></aside></div>`;
}
function submitApplication(form){
  const d=readDraft(form);if(ui.editing){d.mode=ui.draft.mode;d.type=ui.draft.type;d.employee=findRequest(ui.editing).applicant.employee;d.systems=findRequest(ui.editing).tasks.map(t=>t.systemId);}
  ui.draft=d;const fields=['employee','name','english','unit','department'];
  if(fields.some(k=>!d[k]?.trim()) || (d.mode==='代為申請'&&['ben_employee','ben_name','ben_english','ben_unit','ben_department','reason'].some(k=>!d[k]?.trim())))return toast('請填寫所有必填的匿名示例資料。');
  if(d.type==='已有帳號新增功能'&&!d.existing.trim())return toast('請填寫原 User 帳號。');
  if(!d.systems.length)return toast('請至少選擇一個申請系統。');
  for(const id of d.systems){const system=db.masters.systems.find(s=>s.id===id);if(!system || (!ui.editing&&!system.active))return toast('所選系統已停用，請重新選擇。');if(system.roles.length&&!(d.roles[id]?.length))return toast(`請選擇「${system.name}」的角色。`);}
  if(needsCompanies(d)&&!d.companies.length)return toast('請選擇至少一個負責帳套。');
  const applicant=Object.fromEntries(fields.map(k=>[k,d[k].trim()])),beneficiary=draftProfile(d);for(const key of fields)beneficiary[key]=beneficiary[key].trim();
  let request;
  if(ui.editing){
    request=findRequest(ui.editing);if(!request || overall(request.tasks)!=='退回補件'||!ui.lookup || !authorizedPublic(request,ui.lookupEmp))return toast('案件目前不可補件，請重新查詢。');
    const actor=ui.lookupEmp===request.applicant.employee?{...request.applicant}:{...request.beneficiary};
    request.applicant=applicant;request.beneficiary=beneficiary;request.reason=d.reason;request.description=d.description;request.existing=d.existing;request.companies=needsCompanies(d)?d.companies:[];
    for(const task of request.tasks)if(task.status!=='已完成'){const system=db.masters.systems.find(s=>s.id===task.systemId);task.roles=[...(d.roles[task.systemId] || [])];task.person=assignee(system,beneficiary);task.status='待處理';task.returnReason='';audit(request,'重新指派',`${task.name} → ${ROLE_NAMES[task.person]}`,'系統');}
    audit(request,'完成補件並重新送出','沿用原申請編號；未完成任務依最新資料重新指派。',`${actor.name}（${actor.employee}）`);
  }else{
    const prefix='BPM'+businessDate(),max=Math.max(0,...db.requests.filter(r=>r.number.startsWith(prefix)).map(r=>Number(r.number.slice(-3))));if(max>=999)return toast('當日展示申請已達 999 筆，請重設假資料或隔日再試。');
    const created=new Date().toISOString();request={number:prefix+String(max+1).padStart(3,'0'),mode:d.mode,type:d.type,existing:d.existing,applicant,beneficiary,reason:d.mode==='代為申請'?d.reason:'',description:d.description,companies:needsCompanies(d)?d.companies:[],created,updated:created,tasks:[],audit:[]};
    request.tasks=d.systems.map(id=>{const system=db.masters.systems.find(s=>s.id===id);return {id:crypto.randomUUID(),systemId:id,name:system.name,roles:[...(d.roles[id] || [])],person:assignee(system,beneficiary),status:'待處理',account:'',password:'',note:'',returnReason:'',completedAt:null};});
    audit(request,'送出申請',d.mode==='代為申請'?`${applicant.name} 代 ${beneficiary.name} 申請；原因：${d.reason}`:'建立匿名展示申請',applicant.name);db.requests.push(request);
  }
  save();ui.success=request.number;ui.editing=null;ui.lookup=request.number;ui.lookupNo=request.number;ui.lookupEmp=applicant.employee;render();toast('已儲存展示申請，沒有送出至任何伺服器。');
}
function authorizedPublic(request,employee){return request.applicant.employee===employee || (request.mode==='代為申請'&&request.beneficiary.employee===employee);}
function canSee(request){return isManager()?request.tasks.some(owns):(ui.lookup===request.number&&authorizedPublic(request,ui.lookupEmp)) || visibleRequests().some(r=>r.number===request.number);}
function renderLookup(){
  const request=ui.lookup?findRequest(ui.lookup):null,allowed=request&&authorizedPublic(request,ui.lookupEmp);
  return mainHeading('申請進度查詢','使用完整申請編號與展示員工編號，查看處理進度。')+`<section class="panel lookup-panel"><h2>查詢您的申請</h2><p>代為申請案件可由代申請人或權限使用人查詢。請使用 DEMO 開頭的匿名員工編號。</p><form id="lookup-form" class="lookup-form"><label class="field"><span>完整申請編號 <span class="required">*</span></span><input name="number" value="${esc(ui.lookupNo)}" placeholder="BPMYYYYMMDD001" maxlength="14" required></label><label class="field"><span>展示員工編號 <span class="required">*</span></span><input name="employee" value="${esc(ui.lookupEmp)}" placeholder="DEMO001" maxlength="30" required></label><button type="submit" class="btn primary">${icon('search')}查詢進度</button></form><div class="sample-link">還沒有申請編號？<button class="chip-button" data-action="sample">帶入退回補件示例</button></div></section>${allowed?`<section class="panel lookup-result">${caseSummary(request)}<div class="table-wrap">${taskTable(request,false)}</div>${request.tasks.filter(t=>t.status==='退回補件').map(t=>`<div class="return-note"><strong>${esc(t.name)}｜補件原因</strong><br>${esc(t.returnReason)}</div>`).join('')}${overall(request.tasks)==='退回補件'?`<div class="case-actions">${button(`${icon('return')}補件／修改申請`,'supplement','primary',`data-number="${request.number}"`)}</div>`:''}</section>`:''}`;
}
function caseSummary(request){return `<div class="case-summary"><h2>${esc(request.number)} ${badge(overall(request.tasks))}</h2><div class="detail-grid">${[['申請方式',request.mode],['申請人',`${request.applicant.name}（${request.applicant.employee}）`],['權限使用人',`${profileOf(request).name}（${profileOf(request).employee}）`],['權限使用人單位',profileOf(request).unit],['部門',profileOf(request).department],['申請類型',request.type],['負責帳套',request.companies.join('、') || '不適用'],['申請日期',displayDate(request.created)],['原 User 帳號',request.existing || '不適用']].map(([label,value])=>`<dl><dt>${label}</dt><dd>${esc(value)}</dd></dl>`).join('')}</div>${request.mode==='代為申請'?`<p style="font-size:11px;color:#8c9ab1;margin-bottom:0">代申請原因：${esc(request.reason)}</p>`:''}</div>`;}
function taskTable(request,management){return `<table><thead><tr><th>申請系統</th><th>角色／功能</th><th>處理人</th><th>狀態</th>${management?'<th>操作</th>':''}</tr></thead><tbody>${request.tasks.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.roles.join('、') || '未設定')}</td><td>${esc(ROLE_NAMES[t.person])}</td><td>${badge(t.status)}</td>${management?`<td>${owns(t)?button(t.status==='已完成'?'查看通知單':'處理','task','text small',`data-id="${t.id}"`):'—'}</td>`:''}</tr>`).join('')}</tbody></table>`;}
function renderWorkbench(){
  if(!isManager())return mainHeading('案件工作台','切換展示角色，體驗管理人分工處理。')+`<div class="panel success-panel"><div class="success-mark">${icon('briefcase')}</div><h2>體驗管理人工作流程</h2><p>展示角色不需登入，僅能處理虛構的示範案件。</p>${button('切換至範例管理人甲','role-manager','primary')}</div>`;
  const completeTab=ui.managerTab==='complete';
  const tasks=db.requests.flatMap(request=>request.tasks.filter(task=>owns(task)&&(completeTab?task.status==='已完成':task.status!=='已完成')).map(task=>({request,task}))).filter(({request})=>[request.number,request.applicant.name,profileOf(request).name].some(v=>v.toLowerCase().includes(ui.query.toLowerCase()))).sort((a,b)=>b.request.created.localeCompare(a.request.created));
  return mainHeading('案件工作台',`${ROLE_NAMES[ui.role]}｜只顯示目前角色負責的展示任務。`)+`<div class="manager-tabs"><button class="${!completeTab?'active':''}" data-action="manager-tab" data-tab="pending">待處理項目</button><button class="${completeTab?'active':''}" data-action="manager-tab" data-tab="complete">已完成項目</button></div><section class="panel"><div class="panel-head"><h2>${completeTab?'已完成的展示任務':'您的待辦任務'}</h2><span style="font-size:11px;color:#99a6ba">共 ${tasks.length} 個項目</span></div><div class="table-wrap"><table><thead><tr><th>申請編號</th><th>權限使用人</th><th>申請系統</th><th>處理狀態</th><th>操作</th></tr></thead><tbody>${tasks.map(({request,task})=>`<tr><td><button class="request-link" data-action="case" data-number="${request.number}">${request.number}</button><small>${esc(request.mode)}</small></td><td><strong>${esc(profileOf(request).name)}</strong><small>${esc(profileOf(request).department)}</small></td><td>${esc(task.name)}</td><td>${badge(task.status)}</td><td>${button(completeTab?'查看通知單':'處理','task','text small',`data-id="${task.id}"`)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">${icon('check')}目前沒有${completeTab?'已完成':'待處理'}的展示任務。</td></tr>`}</tbody></table></div></section><div class="mini-note">${icon('shield')}此處模擬分工權限；正式版的登入與存取檢查由伺服器執行。</div>`;
}
function renderSettings(){
  if(ui.role!=='super')return mainHeading('主檔與規則','最高管理人的展示操作區。')+`<div class="panel success-panel"><div class="success-mark">${icon('settings')}</div><h2>體驗主檔與指派設定</h2><p>切換展示最高管理人，可停用系統或調整預設管理人。</p>${button('切換展示最高管理人','role-super','primary')}</div>`;
  return mainHeading('主檔與規則','調整展示設定，觀察對新申請與補件指派的影響。')+`<div class="notice">設定僅影響本瀏覽器的假資料。停用系統後，新申請不再顯示；已存在的案件仍保留原系統名稱與角色。</div><div class="settings-grid"><section class="panel"><div class="panel-head"><h2>申請系統</h2></div><div class="settings-list">${db.masters.systems.map(s=>`<div class="settings-row"><div><strong>${esc(s.name)}</strong><small>${s.roles.length} 個角色／功能選項</small></div><label><input type="checkbox" data-setting="active" data-system="${s.id}" ${s.active?'checked':''}>啟用</label></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>預設管理人</h2></div><div class="settings-list">${db.masters.systems.map(s=>`<div class="settings-row"><strong>${esc(s.name)}</strong><select aria-label="${esc(s.name)}預設管理人" data-setting="manager" data-system="${s.id}">${['managerA','managerB'].map(r=>`<option value="${r}" ${s.manager===r?'selected':''}>${ROLE_NAMES[r]}</option>`).join('')}</select></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>部門指派規則</h2></div><div class="settings-list"><div class="settings-row"><div><strong>人事系統・財務部門</strong><small>部門包含「財務」→ 範例管理人甲</small></div><label><input type="checkbox" data-setting="rule" ${db.ruleEnabled?'checked':''}>啟用</label></div><p style="font-size:11px;color:#9aa7bb">未符合此規則時，使用系統預設管理人。代申請與補件依權限使用人的最新資料判斷。</p></div></section><section class="panel"><div class="panel-head"><h2>展示主檔</h2></div><div class="settings-list"><div class="settings-row"><div><strong>所屬單位</strong><small>${db.masters.units.map(esc).join('、')}</small></div></div><div class="settings-row"><div><strong>範例帳套</strong><small>${db.masters.companies.map(esc).join('、')}</small></div></div><div class="settings-row"><div><strong>展示管理人</strong><small>範例管理人甲／乙・全部為匿名假資料</small></div></div></div></section></div>`;
}
function openDialog(content){const dialog=document.getElementById('detail-dialog');dialog.innerHTML=content;if(!dialog.open)dialog.showModal();}
function dialogHeader(title){return `<div class="dialog-header"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-btn" data-action="close-dialog" aria-label="關閉">${icon('close')}</button></div>`;}
function showCase(number){const request=findRequest(number);if(!request||!canSee(request))return toast('查無展示案件或目前角色無權查看。');openDialog(dialogHeader('展示案件明細')+caseSummary(request)+`<div class="table-wrap">${taskTable(request,isManager())}</div><div class="dialog-body"><h3>處理歷程</h3><div class="timeline">${[...request.audit].reverse().slice(0,8).map(a=>`<div class="timeline-item"><strong>${esc(a.action)}・${esc(a.actor)}</strong><p>${esc(a.detail)}</p><small>${displayDate(a.at)}</small></div>`).join('')}</div></div><div class="dialog-footer">${!isManager()&&overall(request.tasks)==='退回補件'?button('補件／修改申請','supplement','primary',`data-number="${request.number}"`):''}${button('關閉','close-dialog')}</div>`);}
function locateTask(id){for(const request of db.requests){const task=request.tasks.find(t=>t.id===id);if(task)return {request,task};}return null;}
function showTask(id){
  const result=locateTask(id);if(!result||!isManager()||!owns(result.task))return toast('目前展示角色沒有這個任務的處理權限。');const {request,task}=result;
  const completed=task.status==='已完成',snap=task.snapshot || {};
  openDialog(dialogHeader(completed?'已完成・展示通知單':'處理展示任務')+`<div class="dialog-body"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:13px">${esc(task.name)}</strong>${badge(task.status)}</div><div style="font-size:11px;color:#9ca8bc;margin:6px 0 18px">${request.number}</div><div class="detail-grid">${[['權限使用人',completed?(snap.beneficiary?.name || profileOf(request).name):profileOf(request).name],['部門',completed?(snap.beneficiary?.department || profileOf(request).department):profileOf(request).department],['角色／功能',task.roles.join('、')||'不需另選角色'],['負責帳套',(completed?(snap.companies || request.companies):request.companies).join('、')||'不適用']].map(([l,v])=>`<dl><dt>${l}</dt><dd>${esc(v)}</dd></dl>`).join('')}</div><div class="notice">所有帳號與密碼皆為展示用假資料，請勿輸入真實密碼。</div>${completed?`<div class="secret-demo">展示帳號：<code>${esc(snap.account || task.account)}</code><br>展示密碼：<code>${esc(snap.password || task.password)}</code></div><p style="font-size:11px;color:#97a4b9">使用完成當時的資料快照，可重複列印並存為 PDF。</p>`:`<form id="task-form" data-id="${task.id}"><div class="form-grid">${textField('設定展示帳號','account',task.account || 'demo.user.007','text',false)}${textField('展示預設密碼','password',task.password || 'DemoPasswordA','text',false)}<label class="field full"><span>內部處理備註（不公開給申請人）</span><textarea name="note" maxlength="600">${esc(task.note)}</textarea></label><label class="field full"><span>公開退回原因（退回時必填）</span><textarea name="returnReason" maxlength="600">${esc(task.returnReason)}</textarea></label></div><p style="font-size:10px;color:#9ba8bc">密碼至少 10 碼，包含英文大寫與小寫。</p></form>`}</div><div class="dialog-footer">${completed?button(`${icon('download')}列印／存為 PDF`,'print','primary',`data-id="${task.id}"`):`${button('退回補件','task-return','danger',`data-id="${task.id}"`)}${button('儲存處理中','task-progress','',`data-id="${task.id}"`)}${button('完成此項目','task-complete','primary',`data-id="${task.id}"`)}`}</div>`);
}
function processTask(id,action){
  const result=locateTask(id),form=document.getElementById('task-form');if(!result||!form||!isManager()||!owns(result.task)||result.task.status==='已完成')return toast('目前無法變更這個展示任務。');
  const {request,task}=result,data=new FormData(form),account=String(data.get('account') || '').trim(),password=String(data.get('password') || ''),note=String(data.get('note') || '').trim(),reason=String(data.get('returnReason') || '').trim();
  if(action==='complete'&&(!account||password.length<10||!/[A-Z]/.test(password)||!/[a-z]/.test(password)))return toast('完成前須填寫帳號，以及至少 10 碼、含英文大小寫的展示密碼。');
  if(action==='return'&&!reason)return toast('退回補件前，請填寫公開退回原因。');
  Object.assign(task,{account,password,note,returnReason:action==='return'?reason:'',status:{complete:'已完成',return:'退回補件',progress:'處理中'}[action],completedAt:action==='complete'?new Date().toISOString():null});
  if(action==='complete')task.snapshot=snapshotOf(request,task);
  audit(request,{complete:'完成子任務',return:'退回補件',progress:'儲存處理進度'}[action],`${task.name}${action==='return'?'：'+reason:''}`);save();document.getElementById('detail-dialog').close();render();toast('展示任務已更新。');
}
function beginSupplement(number){
  const request=findRequest(number);if(!request||ui.role!=='applicant'||overall(request.tasks)!=='退回補件'||!visibleRequests().some(r=>r.number===number)&&!(ui.lookup===number&&authorizedPublic(request,ui.lookupEmp)))return toast('此展示案件目前不可補件。');
  if(!ui.lookup || ui.lookup!==number || !authorizedPublic(request,ui.lookupEmp)){ui.lookup=number;ui.lookupEmp=request.applicant.employee==='DEMO001'?'DEMO001':request.beneficiary.employee;}
  ui.editing=number;ui.success=null;ui.draft={...blankDraft(),mode:request.mode,type:request.type,existing:request.existing,...request.applicant,ben_employee:request.beneficiary.employee,ben_name:request.beneficiary.name,ben_english:request.beneficiary.english,ben_unit:request.beneficiary.unit,ben_department:request.beneficiary.department,reason:request.reason,description:request.description,systems:request.tasks.map(t=>t.systemId),roles:Object.fromEntries(request.tasks.map(t=>[t.systemId,[...t.roles]])),companies:[...request.companies]};
  document.getElementById('detail-dialog').close();go('apply');
}
function printNotice(id){
  const result=locateTask(id);if(!result||!isManager()||!owns(result.task)||result.task.status!=='已完成')return toast('只有已完成且由目前角色負責的任務可列印。');
  const {request,task}=result,s=task.snapshot || snapshotOf(request,task);const popup=window.open('','_blank');if(!popup)return toast('請允許此網站開啟列印視窗後再試。');popup.opener=null;
  const pairs=[['申請編號',s.number],['申請方式',s.mode],['申請人',`${s.applicant.name}（${s.applicant.employee}）`],['權限使用人',`${s.beneficiary.name}（${s.beneficiary.employee}）`],['所屬單位',s.beneficiary.unit],['部門',s.beneficiary.department],['申請系統',s.system],['角色／功能',s.roles.join('、')||'不適用'],['展示帳號',s.account],['展示密碼',s.password],['負責帳套',s.companies.join('、')||'不適用']];
  popup.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(s.number)}・展示通知單</title><style>body{font:14px/1.9 system-ui,sans-serif;color:#263653;max-width:700px;margin:50px auto;padding:20px}h1{font-size:24px}table{width:100%;border-collapse:collapse}td{padding:9px 12px;border-bottom:1px solid #e4e9f3}td:first-child{width:160px;color:#78849a}.demo{background:#fff7df;border:1px solid #eeddb0;padding:13px;margin-bottom:22px}.toolbar{margin-bottom:25px}button{padding:10px 18px;cursor:pointer;border:0;border-radius:6px;background:#1748c5;color:white}@media print{.toolbar{display:none}body{margin:0;padding:15px}@page{size:A4;margin:20mm}}</style></head><body><div class="toolbar"><button id="print-button">列印／存為 PDF</button></div><div class="demo"><strong>匿名假資料展示版</strong>・本通知單沒有任何真實人員或帳號，僅供流程展示。</div><h1>帳號密碼通知單</h1><table>${pairs.map(([k,v])=>`<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</table><p>展示使用的完成快照；重新補件不會修改已完成的內容。</p></body></html>`);popup.document.close();popup.document.getElementById('print-button').addEventListener('click',()=>popup.print());audit(request,'列印展示通知單',task.name);save();
}
async function copyNumber(value){try{await navigator.clipboard.writeText(value);toast('已複製完整申請編號。');}catch{openDialog(dialogHeader('複製申請編號')+`<div class="dialog-body"><label class="field">您的瀏覽器未開放自動複製，可選取下方編號複製。<input readonly value="${esc(value)}" id="copy-fallback"></label></div>`);document.getElementById('copy-fallback').select();}}
function exportCases(){const rows=[['申請編號','申請方式','申請人','權限使用人','狀態'],...visibleRequests().map(r=>[r.number,r.mode,r.applicant.name,profileOf(r).name,overall(r.tasks)])],csv='\ufeff'+rows.map(row=>row.map(value=>{let text=String(value);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='匿名展示申請.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出目前角色可見的匿名展示申請。');}
function setRole(role){ui.role=role;try{sessionStorage.setItem('hpw-demo-role',role);}catch{}ui.filter='全部';ui.page=1;document.getElementById('detail-dialog').close();render();toast(`已切換為${ROLE_NAMES[role]}。`);}
function closeMenu(){document.querySelector('.sidebar')?.classList.remove('open');document.querySelector('.menu-backdrop')?.classList.remove('visible');}
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
  if(action==='new'){ui.editing=null;ui.draft=blankDraft();ui.success=null;go('apply');}
  else if(action==='filter'){ui.filter=el.dataset.filter;ui.page=1;render();}
  else if(action==='page'){ui.page=Number(el.dataset.page);render();}
  else if(action==='case')showCase(el.dataset.number);
  else if(action==='task')showTask(el.dataset.id);
  else if(action==='close-dialog')document.getElementById('detail-dialog').close();
  else if(action==='copy')copyNumber(el.dataset.value);
  else if(action==='lookup-success'){ui.lookup=ui.success;ui.lookupNo=ui.success;go('lookup');}
  else if(action==='sample'){const req=db.requests.find(r=>overall(r.tasks)==='退回補件'&&r.applicant.employee==='DEMO001');if(req){ui.lookupNo=req.number;ui.lookupEmp='DEMO001';ui.lookup=req.number;render();}else toast('示例已完成，可重設資料再體驗補件。');}
  else if(action==='supplement')beginSupplement(el.dataset.number);
  else if(action==='role-manager'){setRole('managerA');go('workbench');}
  else if(action==='role-super'){setRole('super');go('settings');}
  else if(action==='manager-tab'){ui.managerTab=el.dataset.tab;render();}
  else if(action.startsWith('task-'))processTask(el.dataset.id,action.slice(5));
  else if(action==='print')printNotice(el.dataset.id);
  else if(action==='export')exportCases();
  else if(action==='menu'){document.querySelector('.sidebar').classList.toggle('open');document.querySelector('.menu-backdrop').classList.toggle('visible');}
  else if(action==='close-menu')closeMenu();
  else if(action==='reset')openDialog(dialogHeader('重設匿名展示資料')+`<div class="dialog-body"><p>這會清除您在這個瀏覽器新增的假資料與設定，恢復最初的展示案例。</p><p style="color:#9aa6b8;font-size:12px">不影響任何正式系統，也不影響其他瀏覽器。</p></div><div class="dialog-footer">${button('取消','close-dialog')}${button('重設展示資料','confirm-reset','danger')}</div>`);
  else if(action==='confirm-reset'){db=seed();save();ui.lookup=null;ui.lookupNo='';ui.success=null;ui.editing=null;ui.draft=null;ui.filter='全部';ui.page=1;document.getElementById('detail-dialog').close();go('overview');toast('已恢復匿名展示資料。');}
});
document.addEventListener('submit',event=>{
  event.preventDefault();if(event.target.id==='application-form')submitApplication(event.target);
  if(event.target.id==='lookup-form'){const data=new FormData(event.target);ui.lookupNo=String(data.get('number')).trim();ui.lookupEmp=String(data.get('employee')).trim();const req=findRequest(ui.lookupNo);if(!/^BPM\d{11}$/.test(ui.lookupNo)||!req||!authorizedPublic(req,ui.lookupEmp)){ui.lookup=null;render();toast('查無資料，請確認完整申請編號與展示員工編號。');}else{ui.lookup=req.number;render();}}
});
document.addEventListener('change',event=>{
  const el=event.target;if(el.id==='role-select')return setRole(el.value);
  if(el.dataset.setting){if(ui.role!=='super')return;const system=db.masters.systems.find(s=>s.id===el.dataset.system);if(el.dataset.setting==='active'&&system)system.active=el.checked;if(el.dataset.setting==='manager'&&system&&['managerA','managerB'].includes(el.value))system.manager=el.value;if(el.dataset.setting==='rule')db.ruleEnabled=el.checked;save();toast('已更新本瀏覽器的展示設定。');return;}
  const form=el.closest('#application-form');if(!form)return;
  ui.draft=readDraft(form);
  if(['mode','type','systems'].includes(el.name)){if(ui.editing){ui.draft.systems=findRequest(ui.editing).tasks.map(t=>t.systemId);}render();}
  else if(['unit','ben_unit','department','ben_department'].includes(el.name)){updateCompanySections();}
});
document.addEventListener('input',event=>{
  if(event.target.id==='quick-search'){ui.query=event.target.value;ui.page=1;if(['overview','workbench'].includes(ui.view))render();}
  const form=event.target.closest('#application-form');if(form){ui.draft=readDraft(form);if(['department','ben_department'].includes(event.target.name))updateCompanySections();}
});
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
window.addEventListener('popstate',()=>go(location.hash.slice(1)));
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){db=load();if(!document.getElementById('detail-dialog').open)render();}});
shell();go(location.hash.slice(1)||'overview');save();
