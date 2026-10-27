/* Anonymous, offline-capable workflow simulation. No API, authentication or mail service. */
'use strict';
const STORAGE_KEY = 'hpw-anonymous-pages-demo-v1';
const STATUS = ['待處理', '處理中', '部分完成', '已完成', '退回補件'];
const ROLE_NAMES = {applicant:'申請人', managerA:'範例管理人甲', managerB:'範例管理人乙', super:'最高管理人'};
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
function esc(value){return cleanCopy(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function businessDate(value = new Date()){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  return ['year','month','day'].map(t => parts.find(p => p.type === t).value).join('');
}
function displayDate(value){return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function timeText(value){return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function badge(status){const type = {'待處理':'pending','處理中':'progress','已完成':'complete','退回補件':'returned','部分完成':'partial'}[status] || 'pending';return `<span class="badge ${type}">${esc(status)}</span>`;}
function overall(tasks){const values=tasks.map(t=>t.status);if(values.length && values.every(v=>v==='已完成'))return '已完成';if(values.includes('退回補件'))return '退回補件';if(values.includes('已完成'))return '部分完成';if(values.includes('處理中'))return '處理中';return '待處理';}
function initialMasters(){return {systems:Object.entries(SYSTEM_REFERENCE).map(([id,ref])=>({id,name:ref.name,code:ref.code,sourceName:ref.original,description:ref.description,roles:[...ref.roles],manager:id==='finance'?'managerA':'managerB',active:true,usesCompany:['finance','hr'].includes(id)})),units:Object.keys(ORGANIZATION),companies:['範例公司 A','範例公司 B','範例公司 C']};}
function assignee(system, profile, roles = [], state = db){
  const active=id=>!state.catalog || state.catalog.people.some(p=>p.id===id&&p.active);
  if(state.catalog){
    const matches=state.catalog.rules.filter(r=>r.active&&r.systemId===system.id&&active(r.person)).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
    for(const r of matches)if((!r.unitEquals||profile.unit===r.unitEquals)&&(!r.departmentContains||profile.department.includes(r.departmentContains))&&(!r.roleContains||roles.some(name=>name.includes(r.roleContains))))return r.person;
  }else if(system.id==='hr'&&state.ruleEnabled&&profile.department.includes('財務'))return 'managerA';
  return active(system.manager)?system.manager:null;
}
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
    const request={number:`BPM${day}${String(counters[day]).padStart(3,'0')}`,mode:sample.proxy?'代為申請':'自行申請',type:'新增帳號',existing:'',applicant,beneficiary,reason:sample.proxy?'示範：協助同仁申請職務所需權限。':'',description:'申請職務所需的系統帳號與權限。',companies:beneficiary.department.includes('財務')?['範例公司 A']:[],created,updated:created,tasks:[],audit:[{at:created,actor:applicant.name,action:'送出申請',detail:'建立申請'}]};
    request.tasks=sample.systems.map((id,i)=>{
      const system=state.masters.systems.find(s=>s.id===id),status=sample.statuses[i];
      const task={id:`seed-${index}-${i}`,systemId:id,name:system.name,roles:system.roles.slice(0,1),person:assignee(system,beneficiary,system.roles.slice(0,1),state),status,account:status==='已完成'?beneficiary.employee:'',password:status==='已完成'?'DemoPasswordA':'',note:'',returnReason:status==='退回補件'?'請確認權限使用人的部門與職務角色，再重新送出。':'',completedAt:status==='已完成'?created:null};
      if(status==='已完成')task.snapshot=snapshotOf(request,task);
      return task;
    });
    state.requests.push(request);
  });
  return upgradeDemo(state);
}
function load(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY));if(data?.version===1 && Array.isArray(data.requests) && Array.isArray(data.masters?.systems) && data.requests.every(r=>Array.isArray(r.tasks)&&r.applicant?.employee&&Array.isArray(r.audit)))return upgradeDemo(data);}catch{}return seed();}
let db=load();
const ui={role:(()=>{try{return sessionStorage.getItem('hpw-demo-role') || 'applicant';}catch{return 'applicant';}})(),view:'home',wizardStep:0,applicantEmployee:(()=>{try{return sessionStorage.getItem('hpw-active-employee')||'DEMO001';}catch{return 'DEMO001';}})(),filter:'全部',page:1,query:'',managerTab:'pending',lookup:null,lookupNo:'',lookupEmp:'DEMO001',editing:null,draft:null,success:null,settingsTab:'systems',masterSelection:{},historyQuery:''};
if(!ROLE_NAMES[ui.role])ui.role='applicant';
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}catch{toast('瀏覽器無法儲存，目前操作僅保留到這個頁面關閉。');}}
function toast(message){const element=document.getElementById('toast');element.textContent=cleanCopy(message);element.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove('visible'),3500);}
function isManager(){return ui.role==='super'||db.catalog.people.some(p=>p.id===ui.role&&p.active);}
function owns(task){return ui.role==='super' || task.person===ui.role;}
function visibleRequests(){return db.requests.filter(r=>ui.role==='applicant' ? (r.applicant.employee===ui.applicantEmployee||(r.mode==='代為申請'&&r.beneficiary.employee===ui.applicantEmployee)) : r.tasks.some(owns));}
function findRequest(number){return db.requests.find(r=>r.number===number);}
function audit(request,action,detail,actor=ROLE_NAMES[ui.role]){request.updated=new Date().toISOString();request.audit.push({at:request.updated,action,detail,actor});}
function help(text,label='說明'){
  const id='help-'+(++help.count);return `<span class="help-wrap"><button type="button" class="help-trigger" data-action="help" aria-label="${esc(label)}" aria-describedby="${id}" aria-expanded="false">${icon('info')}</button><span class="help-tooltip" role="tooltip" id="${id}">${esc(text)}</span></span>`;
}
help.count=0;
function mainHeading(title,description,actions=''){return `<div class="page-heading"><div class="heading-title"><h1>${esc(title)}</h1>${description?help(description,title+'說明'):''}</div><div class="heading-actions">${actions}</div></div>`;}
function processSteps(request=null){const current=!request||overall(request.tasks)==='退回補件'?0:overall(request.tasks)==='已完成'?2:1;return `<ol class="process-steps" aria-label="申請流程">${['填寫申請','管理人處理','完成設定'].map((name,i)=>`<li class="${i===current?'current':i<current?'done':''}" ${i===current?'aria-current="step"':''}><span class="process-number">${i<current?icon('check'):i+1}</span><span>${name}</span>${i<2?`<span class="process-arrow" aria-hidden="true">${icon('arrow')}</span>`:''}</li>`).join('')}</ol>`;}
function cleanCopy(value){
  const text=String(value??'');
  const known={
    '展示用途的虛構申請，沒有真實人員或帳號。':'申請職務所需的系統帳號與權限。',
    '這是一筆匿名假資料展示申請。':'申請工作所需的系統權限。',
    '這是一筆匿名假資料申請。':'申請工作所需的系統權限。',
    '建立匿名展示申請':'建立申請','建立匿名申請':'建立申請',
    '示範：協助同仁申請職務所需權限。':'協助同仁申請職務所需權限。',
    '示範：協助同仁申請工作所需權限。':'協助同仁申請工作所需權限。',
    '展示最高管理人':'最高管理人','展示申請人':'申請人'
  };
  return Object.hasOwn(known,text)?known[text]:text;
}
function cleanInterface(doc=document){
  doc.querySelectorAll('option:not([value])').forEach(el=>el.setAttribute('value',el.value));
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())if(!['SCRIPT','STYLE','TEXTAREA'].includes(node.parentElement?.tagName))node.nodeValue=cleanCopy(node.nodeValue);
  doc.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>{for(const key of ['title','aria-label','placeholder'])if(el.hasAttribute(key))el.setAttribute(key,cleanCopy(el.getAttribute(key)));});
  doc.querySelectorAll('textarea').forEach(el=>{const text=cleanCopy(el.value);if(text!==el.value)el.value=text;});
  doc.title=cleanCopy(doc.title);
}
function button(text,action,classes='',extra=''){return `<button class="btn ${classes}" data-action="${action}" ${extra}>${text}</button>`;}
function shell(){
  const nav=(view,label,i,extra='')=>`<a class="nav-item" data-view="${view}" href="#${view}" ${extra}>${icon(i)}<span>${label}</span></a>`;
  document.getElementById('app').innerHTML=`<div class="menu-backdrop" data-action="close-menu"></div><aside id="primary-sidebar" class="sidebar"><a href="#apply" data-action="go-home" class="brand" aria-label="海霸王・回到首頁" title="回到首頁"><img class="company-logo" src="./assets/logo.png?v=20261027-logo" alt="海霸王" width="192" height="74"><span class="brand-caption">系統帳號申請</span></a><nav aria-label="主要導覽">${nav('apply','提出申請','plus','data-action="new"')}${nav('overview','我的申請','grid')}${nav('lookup','進度查詢','search')}<div class="nav-label" data-manager-only>管理功能</div>${nav('workbench','案件工作台','briefcase','data-manager-only')}${nav('settings','主檔與規則','settings','data-super-only')}</nav><div class="sidebar-bottom"><button class="reset-link" data-action="reset">${icon('return')}重設資料</button><div class="version">v19</div></div></aside><div class="shell"><header class="topbar"><button class="mobile-menu" aria-controls="primary-sidebar" aria-label="開啟選單" aria-expanded="false" data-action="menu">${icon('menu')}<span class="menu-label">選單</span></button><a href="#apply" data-action="go-home" class="mobile-brand" aria-label="海霸王・回到首頁" title="回到首頁"><img src="./assets/logo.png?v=20261027-logo" alt="海霸王" width="192" height="74"></a><div class="breadcrumbs"><span id="breadcrumb-current">提出申請</span></div><div class="topbar-search">${icon('search')}<input id="quick-search" type="search" aria-label="搜尋申請" placeholder="搜尋申請編號或姓名"></div><a class="admin-login-shortcut btn text" href="#login" data-applicant-only>管理者登入</a><div class="role-switch" data-manager-only><span class="avatar" id="role-avatar">甲</span><div><label for="role-select">目前角色</label><select id="role-select">${Object.entries(availableRoles()).map(([key,name])=>`<option value="${esc(key)}">${esc(name)}</option>`).join('')}</select></div></div><button class="btn text logout-button" data-action="logout" data-manager-only>登出</button></header><main id="main" class="content" tabindex="-1"></main></div>`;
  document.getElementById('role-select').value=ui.role;
}
function footer(){return `<footer class="page-footer"><span>© ${new Date().getFullYear()} 海霸王・系統帳號申請</span><span class="footer-tools"><a href="./acceptance.html" target="_blank" rel="noopener">操作驗收表</a>${help('目前資料保存在此瀏覽器，角色切換不等同正式身分驗證；尚未連接寄信服務。','環境說明')}</span></footer>`;}
let lastPresentationKey='';
function render(){
  refreshRoleOptions();
  const names={home:'首頁',overview:'我的申請',apply:ui.editing?'補件與修改':'帳號申請',lookup:'申請進度查詢',login:'管理者登入',workbench:'案件工作台',settings:'主檔與規則'};
  document.querySelectorAll('[data-manager-only]').forEach(el=>el.hidden=!isManager());
  document.querySelectorAll('[data-super-only]').forEach(el=>el.hidden=ui.role!=='super');
  document.querySelectorAll('[data-applicant-only]').forEach(el=>el.hidden=isManager());
  document.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.view===ui.view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  renderBreadcrumbs();
  document.querySelector('.topbar-search').hidden=!['overview','workbench'].includes(ui.view);
  document.getElementById('role-avatar').textContent=ui.role==='super'?'管':ui.role==='managerB'?'乙':'甲';
  refreshRoleOptions();
  const views={home:renderHome,overview:renderOverview,apply:renderApply,lookup:renderLookup,login:renderLogin,workbench:renderWorkbench,settings:renderSettings};
  document.getElementById('main').innerHTML=(views[ui.view] || renderOverview)()+footer();
  document.title=`${names[ui.view] || '帳號申請'}｜權限申請平台`;
  labelTables();
  cleanInterface();
  initFormPresentation();
  syncNavigation();
  const key=[ui.view,ui.wizardStep,ui.settingsTab,ui.managerTab,ui.success,ui.lookup].join(':');
  if(key!==lastPresentationKey&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches){
    const main=document.getElementById('main');main.getAnimations().forEach(animation=>animation.cancel());
    main.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  lastPresentationKey=key;
}
function go(view){if(!['home','overview','apply','lookup','login','workbench','settings'].includes(view))view='apply';ui.view=view;ui.query='';ui.page=1;document.getElementById('quick-search').value='';if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);closeMenu();render();window.scrollTo({top:0,behavior:'instant'});}

function labelTables(){
  document.querySelectorAll('table').forEach(table=>{const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent);table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{cell.dataset.label=headers[i] || '';}));});
}

function renderLogin(){return mainHeading('管理者登入','選擇角色，體驗管理人的處理流程。')+`<section class="panel login-panel"><div class="login-symbol">${icon('shield')}</div><h2>管理人入口</h2><p>請選擇要使用的管理人角色。</p><div class="demo-roles">${Object.keys(availableRoles()).filter(role=>role!=='applicant').map(role=>button(`${icon('user')}${esc(ROLE_NAMES[role])}${icon('arrow')}`,'enter-demo','',`data-role="${role}"`)).join('')}</div></section>`;}
function renderOverview(){
  const visible=visibleRequests(),statuses=visible.map(r=>overall(r.tasks));
  const filtered=visible.filter(r=>(ui.filter==='全部'||overall(r.tasks)===ui.filter)&&[r.number,r.applicant.name,profileOf(r).name].some(v=>v.toLowerCase().includes(ui.query.toLowerCase()))).sort((a,b)=>b.created.localeCompare(a.created));
  const pages=Math.max(1,Math.ceil(filtered.length/5));ui.page=Math.min(ui.page,pages);
  const counts=[visible.length,statuses.filter(s=>['待處理','處理中','部分完成'].includes(s)).length,statuses.filter(s=>s==='已完成').length,statuses.filter(s=>s==='退回補件').length];
  const logs=visible.flatMap(r=>r.audit.map(a=>({...a,number:r.number}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,3);
  return mainHeading('我的申請','查看自己的申請、補件提醒與處理結果。',button(`${icon('plus')}提出新申請`,'new','primary'))+`${visible.some(r=>overall(r.tasks)==='退回補件')?`<section class="action-banner" aria-label="需要補充資料"><div>${icon('return')}<div><strong>你有 ${statuses.filter(s=>s==='退回補件').length} 件申請需要補充資料</strong><p>查看補件原因，修改後沿用原申請編號送出。</p></div></div>${button('前往補件','first-returned','primary')}</section>`:''}<section class="stats" aria-label="申請統計">${[['我的申請','document','依目前角色篩選'],['進行中','clock','等待或正在處理的案件'],['已完成','check','帳號與權限已設定完成'],['待補件','return','需要補充資料的案件']].map(([title,i,caption],n)=>`<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(i)}</span></div><div class="stat-bottom"><span class="stat-number">${counts[n]}</span><small>件</small></div><div class="stat-caption">${caption}</div></article>`).join('')}</section><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>最近申請</h2><p>追蹤您的申請與處理狀態</p></div>${button(`${icon('download')}匯出`,'export','small')}</div><div class="filter-bar">${['全部','待處理','處理中','部分完成','已完成','退回補件'].map(s=>`<button class="filter ${ui.filter===s?'active':''}" data-action="filter" data-filter="${s}">${s}<span class="count">${s==='全部'?visible.length:statuses.filter(v=>v===s).length}</span></button>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>申請編號</th><th>權限使用人／申請系統</th><th>目前狀態</th><th>申請日期</th><th>操作</th></tr></thead><tbody>${filtered.slice((ui.page-1)*5,ui.page*5).map(r=>`<tr><td><button class="request-link" data-action="case" data-number="${r.number}">${r.number}</button><small>${esc(r.mode)}</small></td><td><strong>${esc(profileOf(r).name)}</strong><div>${r.tasks.map(t=>`<span class="system-tag">${esc(t.name)}</span>`).join('')}</div></td><td>${badge(overall(r.tasks))}</td><td>${displayDate(r.created).split(' ')[0]}</td><td>${button(overall(r.tasks)==='退回補件'?'補充資料':overall(r.tasks)==='已完成'?'查看結果':'查看進度',overall(r.tasks)==='退回補件'&&ui.role==='applicant'?'supplement':'case','text small',`data-number="${r.number}"`)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">沒有符合條件的申請。</td></tr>'}</tbody></table></div><div class="table-footer"><span>共 ${filtered.length} 筆申請</span><div class="pagination"><button aria-label="上一頁" data-action="page" data-page="${ui.page-1}" ${ui.page===1?'disabled':''}>‹</button>${Array.from({length:pages},(_,i)=>`<button class="${ui.page===i+1?'active':''}" aria-label="第 ${i+1} 頁" data-action="page" data-page="${i+1}">${i+1}</button>`).join('')}<button aria-label="下一頁" data-action="page" data-page="${ui.page+1}" ${ui.page===pages?'disabled':''}>›</button></div></div></section><aside class="side-stack"><section class="panel"><div class="panel-head"><h2>最近動態</h2></div><div class="timeline">${logs.map(a=>`<div class="timeline-item"><strong>${esc(a.action)}</strong><p>${a.number}</p><small>${displayDate(a.at)}</small></div>`).join('') || '<div class="empty">尚無動態</div>'}</div></section></aside></div>`;
}
function blankDraft(){return freshForm();}
function textField(label,name,value,type='text',required=true,full=false,readonly=false){return inputField(label,name,value,type,required,full,readonly);}
function unitField(label,name,value){return organizationField(label,name,value);}
function draftProfile(draft){return {employee:draft.mode==='代為申請'?draft.ben_employee:draft.employee,name:draft.mode==='代為申請'?draft.ben_name:draft.name,english:draft.mode==='代為申請'?draft.ben_english:draft.english,unit:draft.mode==='代為申請'?draft.ben_unit:draft.unit,department:draft.mode==='代為申請'?draft.ben_department:draft.department};}
function needsCompanies(draft){const p=draftProfile(draft);return draft.systems.some(id=>{const s=db.masters.systems.find(s=>s.id===id);return s?.usesCompany&&(!s.companyUnitEquals||p.unit===s.companyUnitEquals)&&(!s.companyDepartmentContains||p.department.includes(s.companyDepartmentContains));});}
function descriptionStep(draft){return String((draft.mode==='代為申請'?5:4)+(needsCompanies(draft)?1:0)).padStart(2,'0');}
function updateCompanySections(){const el=document.getElementById('companies-slot');if(el)el.innerHTML=companySection(ui.draft);}
function companySection(draft){if(!needsCompanies(draft))return '';return `<section class="company-section"><h3>負責帳套 <span class="selection-count">可複選</span></h3><div class="company-options">${db.masters.companies.map(name=>`<label><input type="checkbox" name="companies" value="${esc(name)}" ${draft.companies.includes(name)?'checked':''}>${esc(name)}</label>`).join('')}</div></section>`;}
function readDraft(form){return readWizardDraft(form);}
function renderApply(){return renderWizard();}
function applicationError(message){const el=document.getElementById('form-error');if(el){el.textContent=cleanCopy(message);el.hidden=false;el.focus();el.scrollIntoView({block:'center'});}}
function applicantEmployee(d){return d.employee.trim();}
function submitApplication(form){
  const d=readDraft(form);if(ui.editing){d.mode=ui.draft.mode;d.type=ui.draft.type;d.employee=findRequest(ui.editing).applicant.employee;d.systems=findRequest(ui.editing).tasks.map(t=>t.systemId);}
  const validation=applicationValidation(d);if(validation)return applicationError(validation);
  ui.draft=d;const fields=['employee','name','english','unit','department'];
  if(fields.filter(k=>k!=='english').some(k=>!d[k]?.trim()) || (d.mode==='代為申請'&&['ben_employee','ben_name','ben_unit','ben_department','reason'].some(k=>!d[k]?.trim())))return applicationError('請填寫所有必填的人員資料。');
  if(d.type==='已有帳號新增功能'&&!d.existing.trim())return applicationError('請填寫權限使用人的員工編號。');
  for(const key of fields){const rule=FIELD_RULES[key];if(rule&&d[key].length>rule.max)return applicationError('人員資料超過字數限制。');}
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/.test(applicantEmployee(d))||! /^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/.test(draftProfile(d).employee))return applicationError('請使用員工編號，不可使用 Email 作為帳號。');
  if(!d.systems.length)return applicationError('請至少選擇一個申請系統。');
  for(const id of d.systems){const system=db.masters.systems.find(s=>s.id===id);if(!system || (!ui.editing&&!system.active))return applicationError('所選系統已停用，請重新選擇。');if(system.roles.length&&!(d.roles[id]?.length))return applicationError(`請選擇「${system.name}」的角色。`);}
  if(needsCompanies(d)&&!d.companies.length)return applicationError('請選擇至少一個負責帳套。');
  const applicant=Object.fromEntries(fields.map(k=>[k,String(d[k]||'').trim()])),beneficiary=draftProfile(d);for(const key of fields)beneficiary[key]=String(beneficiary[key]||'').trim();
  let request;
  if(ui.editing){
    request=findRequest(ui.editing);if(!request || overall(request.tasks)!=='退回補件'||!ui.lookup || !authorizedPublic(request,ui.lookupEmp))return applicationError('案件目前不可補件，請重新查詢。');
    const actor=ui.lookupEmp===request.applicant.employee?{...request.applicant}:{...request.beneficiary};
    request.applicant=applicant;request.beneficiary=beneficiary;request.reason=d.reason;request.description=d.description;request.existing=d.existing;request.companies=needsCompanies(d)?d.companies:[];
    for(const task of request.tasks)if(task.status!=='已完成'){const system=db.masters.systems.find(s=>s.id===task.systemId);task.roles=[...(d.roles[task.systemId] || [])];task.person=assignee(system,beneficiary,task.roles);task.status='待處理';task.returnReason='';audit(request,'重新指派',`${task.name} → ${ROLE_NAMES[task.person]}`,'系統');}
    audit(request,'完成補件並重新送出','沿用原申請編號；未完成任務依最新資料重新指派。',`${actor.name}（${actor.employee}）`);
  }else{
    const prefix='BPM'+businessDate(),max=Math.max(0,...db.requests.filter(r=>r.number.startsWith(prefix)).map(r=>Number(r.number.slice(-3))));if(max>=999)return applicationError('當日申請已達 999 筆，請重設或隔日再試。');
    const created=new Date().toISOString();request={number:prefix+String(max+1).padStart(3,'0'),mode:d.mode,type:d.type,existing:d.existing,applicant,beneficiary,reason:d.mode==='代為申請'?d.reason:'',description:d.description,companies:needsCompanies(d)?d.companies:[],created,updated:created,tasks:[],audit:[]};
    request.tasks=d.systems.map(id=>{const system=db.masters.systems.find(s=>s.id===id);return {id:crypto.randomUUID(),systemId:id,name:system.name,roles:[...(d.roles[id] || [])],person:assignee(system,beneficiary,d.roles[id] || []),status:'待處理',account:'',password:'',note:'',returnReason:'',completedAt:null};});
    audit(request,'送出申請',d.mode==='代為申請'?`${applicant.name} 代 ${beneficiary.name} 申請；原因：${d.reason}`:'建立申請',applicant.name);db.requests.push(request);
  }
  if(ui.role==='applicant'){ui.applicantEmployee=applicant.employee;try{sessionStorage.setItem('hpw-active-employee',applicant.employee);}catch{}}
  save();ui.success=request.number;ui.editing=null;ui.lookup=request.number;ui.lookupNo=request.number;ui.lookupEmp=applicant.employee;render();toast('已儲存申請，沒有送出至任何伺服器。');
}
function authorizedPublic(request,employee){return request.applicant.employee===employee || (request.mode==='代為申請'&&request.beneficiary.employee===employee);}
function canSee(request){return isManager()?request.tasks.some(owns):(ui.lookup===request.number&&authorizedPublic(request,ui.lookupEmp)) || visibleRequests().some(r=>r.number===request.number);}
function renderLookup(){
  const request=ui.lookup?findRequest(ui.lookup):null,allowed=request&&authorizedPublic(request,ui.lookupEmp);
  return mainHeading('申請進度查詢','使用完整申請編號與員工編號，查看處理進度。')+`<section class="panel lookup-panel"><h2>查詢您的申請</h2><p>代為申請案件可由代申請人或權限使用人查詢。請使用 DEMO 開頭的員工編號。</p><form id="lookup-form" class="lookup-form"><label class="field"><span>完整申請編號 <span class="required">*</span></span><input name="number" value="${esc(ui.lookupNo)}" placeholder="BPMYYYYMMDD001" maxlength="14" required></label><label class="field"><span>員工編號 <span class="required">*</span></span><input name="employee" value="${esc(ui.lookupEmp)}" placeholder="請輸入員工編號" maxlength="30" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,29}" required></label><button type="submit" class="btn primary">${icon('search')}查詢進度</button></form><div class="sample-link">還沒有申請編號？<button class="chip-button" data-action="sample">帶入退回補件示例</button></div></section>${allowed?`<section class="panel lookup-result">${caseSummary(request)}<div class="table-wrap">${taskTable(request,false)}</div>${request.tasks.filter(t=>t.status==='退回補件').map(t=>`<div class="return-note"><strong>${esc(t.name)}｜補件原因</strong><br>${esc(t.returnReason)}</div>`).join('')}${overall(request.tasks)==='退回補件'?`<div class="case-actions">${button(`${icon('return')}補件／修改申請`,'supplement','primary',`data-number="${request.number}"`)}</div>`:''}</section>`:''}`;
}
function caseSummary(request){return `<div class="case-summary"><h2>${esc(request.number)} ${badge(overall(request.tasks))}</h2><div class="detail-grid">${[['申請方式',request.mode],['申請人',`${request.applicant.name}（${request.applicant.employee}）`],['權限使用人',`${profileOf(request).name}（${profileOf(request).employee}）`],['權限使用人單位',profileOf(request).unit],['部門',profileOf(request).department],['申請類型',request.type],['負責帳套',request.companies.join('、') || '不適用'],['申請日期',displayDate(request.created)],['既有帳號（員工編號）',request.existing || '不適用']].map(([label,value])=>`<dl><dt>${label}</dt><dd>${esc(value)}</dd></dl>`).join('')}</div>${request.mode==='代為申請'?`<p style="font-size:11px;color:#8c9ab1;margin-bottom:0">代申請原因：${esc(request.reason)}</p>`:''}</div>`;}
function taskTable(request,management){return `<table><thead><tr><th>申請系統</th><th>角色／功能</th><th>處理人</th><th>狀態</th>${management?'<th>操作</th>':''}</tr></thead><tbody>${request.tasks.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.roles.join('、') || '未設定')}</td><td>${esc(ROLE_NAMES[t.person] || '未指定')}</td><td>${badge(t.status)}</td>${management?`<td>${owns(t)?button(t.status==='已完成'?'查看通知單':'處理','task','text small',`data-id="${t.id}"`):'—'}</td>`:''}</tr>`).join('')}</tbody></table>`;}
function renderWorkbench(){
  if(!isManager())return mainHeading('案件工作台','登入管理者後查看分派給您的案件。')+`<div class="panel success-panel"><div class="success-mark">${icon('briefcase')}</div><h2>請先登入管理者</h2><p>請切換管理人角色，查看負責的案件。</p><a class="btn primary" href="#login">管理者登入</a></div>`;
  const completeTab=ui.managerTab==='complete';
  const tasks=db.requests.flatMap(request=>request.tasks.filter(task=>owns(task)&&(completeTab?task.status==='已完成':task.status!=='已完成')).map(task=>({request,task}))).filter(({request})=>[request.number,request.applicant.name,profileOf(request).name].some(v=>v.toLowerCase().includes(ui.query.toLowerCase()))).sort((a,b)=>b.request.created.localeCompare(a.request.created));
  return mainHeading('案件工作台',`${ROLE_NAMES[ui.role]}｜只顯示目前角色負責的任務。`)+`<div class="manager-tabs"><button class="${!completeTab?'active':''}" data-action="manager-tab" data-tab="pending">待處理項目</button><button class="${completeTab?'active':''}" data-action="manager-tab" data-tab="complete">已完成項目</button></div><section class="panel"><div class="panel-head"><h2>${completeTab?'已完成的任務':'您的待辦任務'}</h2><span style="font-size:11px;color:#99a6ba">共 ${tasks.length} 個項目</span></div><div class="table-wrap"><table><thead><tr><th>申請編號</th><th>權限使用人</th><th>申請系統</th><th>處理狀態</th><th>操作</th></tr></thead><tbody>${tasks.map(({request,task})=>`<tr><td><button class="request-link" data-action="case" data-number="${request.number}">${request.number}</button><small>${esc(request.mode)}</small></td><td><strong>${esc(profileOf(request).name)}</strong><small>${esc(profileOf(request).department)}</small></td><td>${esc(task.name)}</td><td>${badge(task.status)}</td><td>${button(completeTab?'查看通知單':'處理','task','text small',`data-id="${task.id}"`)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">${icon('check')}目前沒有${completeTab?'已完成':'待處理'}的任務。</td></tr>`}</tbody></table></div></section>`;
}
function openDialog(content){const dialog=document.getElementById('detail-dialog');dialog.innerHTML=content;if(!dialog.open)dialog.showModal();labelTables();cleanInterface();}
function dialogHeader(title){return `<div class="dialog-header"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-btn" data-action="close-dialog" aria-label="關閉">${icon('close')}</button></div>`;}
function showCase(number){const request=findRequest(number);if(!request||!canSee(request))return toast('查無案件或目前角色無權查看。');openDialog(dialogHeader('案件明細')+caseSummary(request)+`<div class="table-wrap">${taskTable(request,isManager())}</div><div class="dialog-body"><h3>處理歷程</h3><div class="timeline">${[...request.audit].reverse().slice(0,8).map(a=>`<div class="timeline-item"><strong>${esc(a.action)}・${esc(a.actor)}</strong><p>${esc(a.detail)}</p><small>${displayDate(a.at)}</small></div>`).join('')}</div></div><div class="dialog-footer">${!isManager()&&overall(request.tasks)==='退回補件'?button('補件／修改申請','supplement','primary',`data-number="${request.number}"`):''}${button('關閉','close-dialog')}</div>`);}
function locateTask(id){for(const request of db.requests){const task=request.tasks.find(t=>t.id===id);if(task)return {request,task};}return null;}
function showTask(id){
  const result=locateTask(id);if(!result||!isManager()||!owns(result.task))return toast('目前角色沒有這個任務的處理權限。');const {request,task}=result;
  const completed=task.status==='已完成',snap=task.snapshot || {};
  openDialog(dialogHeader(completed?'已完成・通知單':'處理任務')+`<div class="dialog-body"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:13px">${esc(task.name)}</strong>${badge(task.status)}</div><div style="font-size:11px;color:#9ca8bc;margin:6px 0 18px">${request.number}</div><div class="detail-grid">${[['權限使用人',completed?(snap.beneficiary?.name || profileOf(request).name):profileOf(request).name],['部門',completed?(snap.beneficiary?.department || profileOf(request).department):profileOf(request).department],['角色／功能',task.roles.join('、')||'不需另選角色'],['負責帳套',(completed?(snap.companies || request.companies):request.companies).join('、')||'不適用']].map(([l,v])=>`<dl><dt>${l}</dt><dd>${esc(v)}</dd></dl>`).join('')}</div>${completed?`<div class="secret-demo">帳號：<code>${esc(snap.account || task.account)}</code><br>密碼：<code>${esc(snap.password || task.password)}</code></div><p style="font-size:11px;color:#97a4b9">使用完成當時的資料快照，可重複列印並存為 PDF。</p>`:`<form id="task-form" data-id="${task.id}"><div class="form-grid">${textField('登入帳號（員工編號）','account',profileOf(request).employee,'text',true,false,true)}${textField('預設密碼','password',task.password || 'DemoPasswordA','text',false)}<label class="field full"><span>內部處理備註（不公開給申請人）</span><textarea name="note" maxlength="600">${esc(task.note)}</textarea></label><label class="field full"><span>公開退回原因（退回時必填）</span><textarea name="returnReason" maxlength="600">${esc(task.returnReason)}</textarea></label></div><p style="font-size:10px;color:#9ba8bc">密碼至少 10 碼，包含英文大寫與小寫。</p></form>`}</div><div class="dialog-footer">${completed?button(`${icon('download')}列印／存為 PDF`,'print','primary',`data-id="${task.id}"`):`${button('退回補件','task-return','danger',`data-id="${task.id}"`)}${button('儲存處理中','task-progress','',`data-id="${task.id}"`)}${button('完成此項目','task-complete','primary',`data-id="${task.id}"`)}`}</div>`);
}
function processTask(id,action){
  const result=locateTask(id),form=document.getElementById('task-form');if(!result||!form||!isManager()||!owns(result.task)||result.task.status==='已完成')return toast('目前無法變更這個任務。');
  const {request,task}=result,data=new FormData(form),account=profileOf(request).employee,password=String(data.get('password') || ''),note=String(data.get('note') || '').trim(),reason=String(data.get('returnReason') || '').trim();
  if(action==='complete'&&(!account||password.length<10||!/[A-Z]/.test(password)||!/[a-z]/.test(password)))return toast('完成前須填寫帳號，以及至少 10 碼、含英文大小寫的密碼。');
  if(action==='return'&&!reason)return toast('退回補件前，請填寫公開退回原因。');
  Object.assign(task,{account,password,note,returnReason:action==='return'?reason:'',status:{complete:'已完成',return:'退回補件',progress:'處理中'}[action],completedAt:action==='complete'?new Date().toISOString():null});
  if(action==='complete')task.snapshot=snapshotOf(request,task);
  audit(request,{complete:'完成子任務',return:'退回補件',progress:'儲存處理進度'}[action],`${task.name}${action==='return'?'：'+reason:''}`);save();document.getElementById('detail-dialog').close();render();toast('任務已更新。');
}
function beginSupplement(number){
  const request=findRequest(number);if(!request||ui.role!=='applicant'||overall(request.tasks)!=='退回補件'||!visibleRequests().some(r=>r.number===number)&&!(ui.lookup===number&&authorizedPublic(request,ui.lookupEmp)))return toast('此案件目前不可補件。');
  if(!ui.lookup || ui.lookup!==number || !authorizedPublic(request,ui.lookupEmp)){ui.lookup=number;ui.lookupEmp=request.applicant.employee===ui.applicantEmployee?ui.applicantEmployee:request.beneficiary.employee;}
  ui.wizardStep=0;ui.editing=number;ui.success=null;ui.draft={...blankDraft(),mode:request.mode,type:request.type,existing:request.existing,...request.applicant,ben_employee:request.beneficiary.employee,ben_name:request.beneficiary.name,ben_english:request.beneficiary.english,ben_unit:request.beneficiary.unit,ben_department:request.beneficiary.department,reason:request.reason,description:request.description,systems:request.tasks.map(t=>t.systemId),roles:Object.fromEntries(request.tasks.map(t=>[t.systemId,[...t.roles]])),companies:[...request.companies]};
  document.getElementById('detail-dialog').close();go('apply');
}
function printNotice(id){
  const result=locateTask(id);if(!result||!isManager()||!owns(result.task)||result.task.status!=='已完成')return toast('只有已完成且由目前角色負責的任務可列印。');
  const {request,task}=result,s=task.snapshot || snapshotOf(request,task);const popup=window.open('','_blank');if(!popup)return toast('請允許此網站開啟列印視窗後再試。');popup.opener=null;
  const pairs=[['申請編號',s.number],['申請方式',s.mode],['申請人',`${s.applicant.name}（${s.applicant.employee}）`],['權限使用人',`${s.beneficiary.name}（${s.beneficiary.employee}）`],['所屬單位',s.beneficiary.unit],['部門',s.beneficiary.department],['申請系統',s.system],['角色／功能',s.roles.join('、')||'不適用'],['帳號',s.account],['密碼',s.password],['負責帳套',s.companies.join('、')||'不適用']];
  popup.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(s.number)}・通知單</title><style>body{font:14px/1.9 system-ui,sans-serif;color:#263653;max-width:700px;margin:50px auto;padding:20px}h1{font-size:24px}table{width:100%;border-collapse:collapse}td{padding:9px 12px;border-bottom:1px solid #e4e9f3}td:first-child{width:160px;color:#78849a}.demo{background:#fff7df;border:1px solid #eeddb0;padding:13px;margin-bottom:22px}.toolbar{margin-bottom:25px}button{padding:10px 18px;cursor:pointer;border:0;border-radius:6px;background:#be3159;color:white}@media print{.toolbar{display:none}body{margin:0;padding:15px}@page{size:A4;margin:20mm}}</style></head><body><div class="toolbar"><button id="print-button">列印／存為 PDF</button></div><img src="${esc(new URL('./assets/logo.png?v=20261027-logo',location.href).href)}" alt="海霸王" width="192" height="74" style="object-fit:contain;margin-bottom:16px"><h1>帳號密碼通知單</h1><table>${pairs.map(([k,v])=>`<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</table><p>請依資訊安全規範修改密碼並妥善保管。</p></body></html>`);popup.document.close();cleanInterface(popup.document);popup.document.getElementById('print-button').addEventListener('click',()=>popup.print());audit(request,'列印通知單',task.name);save();
}
async function copyNumber(value){try{await navigator.clipboard.writeText(value);toast('已複製完整申請編號。');}catch{openDialog(dialogHeader('複製申請編號')+`<div class="dialog-body"><label class="field">您的瀏覽器未開放自動複製，可選取下方編號複製。<input readonly value="${esc(value)}" id="copy-fallback"></label></div>`);document.getElementById('copy-fallback').select();}}
function exportCases(){const rows=[['申請編號','申請方式','申請人','權限使用人','狀態'],...visibleRequests().map(r=>[r.number,r.mode,r.applicant.name,profileOf(r).name,overall(r.tasks)])],csv='\ufeff'+rows.map(row=>row.map(value=>{let text=String(value);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='申請.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出目前角色可見的申請。');}
function setRole(role){if(!Object.hasOwn(availableRoles(),role))return;ui.role=role;try{sessionStorage.setItem('hpw-demo-role',role);}catch{}ui.filter='全部';ui.page=1;document.getElementById('detail-dialog').close();render();toast(`已切換為${ROLE_NAMES[role]}。`);}
function syncNavigation(){
  const mobile=window.matchMedia('(max-width:760px)').matches;
  const expanded=mobile?document.querySelector('.sidebar').classList.contains('open'):!document.body.classList.contains('sidebar-collapsed');
  const button=document.querySelector('.mobile-menu');
  button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'收合選單':'開啟選單');button.querySelector('.menu-label').textContent=expanded?'收合選單':'開啟選單';
  document.querySelectorAll('.nav-item').forEach(link=>{link.setAttribute('aria-label',link.textContent.trim());});
}
function closeMenu(){document.querySelector('.sidebar')?.classList.remove('open');document.querySelector('.menu-backdrop')?.classList.remove('visible');syncNavigation();}
function toggleNavigation(){
  if(window.matchMedia('(max-width:760px)').matches){const open=document.querySelector('.sidebar').classList.toggle('open');document.querySelector('.menu-backdrop').classList.toggle('visible',open);}
  else document.body.classList.toggle('sidebar-collapsed');
  syncNavigation();
}
window.addEventListener('resize',syncNavigation,{passive:true});
document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();document.getElementById('main').focus();return;}
  if(!event.target.closest('.help-wrap'))document.querySelectorAll('.help-wrap.open').forEach(w=>{w.classList.remove('open');w.querySelector('button').setAttribute('aria-expanded','false');});
  const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
  if(action==='go-home'){event.preventDefault();ui.wizardStep=0;ui.success=null;go('apply');}
  else if(action==='home-requests'){go('overview');}
  else if(action==='logout'){setRole('applicant');go('home');}
  else if(action==='wizard-back'||action==='wizard-edit'){const form=document.getElementById('application-form');if(form)ui.draft=readDraft(form);ui.wizardStep=action==='wizard-back'?Math.max(0,ui.wizardStep-1):Number(el.dataset.step);render();window.scrollTo({top:0,behavior:'instant'});}
  else if(action==='help'){const wrap=el.closest('.help-wrap');const open=wrap.classList.toggle('open');el.setAttribute('aria-expanded',String(open));}
  else if(action==='new'){event.preventDefault();ui.wizardStep=0;ui.editing=null;ui.draft=blankDraft();ui.success=null;go('apply');}
  else if(action==='enter-demo'){setRole(el.dataset.role);go('workbench');}
  else if(action==='first-returned'){const request=visibleRequests().find(r=>overall(r.tasks)==='退回補件');if(request){if(ui.role==='applicant')beginSupplement(request.number);else showCase(request.number);}}
  else if(action==='settings-tab'){ui.settingsTab=el.dataset.tab;render();document.querySelector(`[data-action="settings-tab"][data-tab="${ui.settingsTab}"]`)?.focus();}
  else if(action==='clear-history'){ui.historyQuery='';render();}
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
  else if(action==='menu')toggleNavigation();
  else if(action==='close-menu')closeMenu();
  else if(action==='reset')openDialog(dialogHeader('重設資料')+`<div class="dialog-body"><p>此操作會清除目前瀏覽器的申請與設定，並恢復初始資料。</p></div><div class="dialog-footer">${button('取消','close-dialog')}${button('重設資料','confirm-reset','danger')}</div>`);
  else if(action==='confirm-reset'){db=seed();refreshRoleOptions();save();ui.lookup=null;ui.lookupNo='';ui.success=null;ui.editing=null;ui.draft=null;ui.filter='全部';ui.page=1;document.getElementById('detail-dialog').close();go('overview');toast('已恢復資料。');}
});
document.addEventListener('submit',event=>{
  event.preventDefault();if(event.target.id==='master-edit-form'||event.target.id==='master-add-form'){saveMasterForm(event.target);return;}
  if(event.target.id==='history-form'){ui.historyQuery=String(new FormData(event.target).get('query')||'').trim();render();return;}
  if(event.target.id==='application-form')advanceWizard(event.target);
  if(event.target.id==='lookup-form'){const data=new FormData(event.target);ui.lookupNo=String(data.get('number')).trim();ui.lookupEmp=String(data.get('employee')).trim();const req=findRequest(ui.lookupNo);if(!/^BPM\d{11}$/.test(ui.lookupNo)||!req||!authorizedPublic(req,ui.lookupEmp)){ui.lookup=null;render();toast('查無資料，請確認完整申請編號與員工編號。');}else{ui.lookup=req.number;render();}}
});
document.addEventListener('change',event=>{
  const el=event.target;if(el.id==='role-select'){setRole(el.value);if(el.value==='applicant')go('home');return;}
  if(el.dataset.setting){if(ui.role!=='super')return;const system=db.masters.systems.find(s=>s.id===el.dataset.system);if(el.dataset.setting==='active'&&system){system.active=el.checked;recordMasterChange('系統啟停',system.name+' → '+(el.checked?'啟用':'停用'));}syncDemoMasters(db);save();render();toast('已更新設定；既有申請保留原內容。');return;}
  if(el.id==='master-selection'){ui.masterSelection[ui.settingsTab]=el.value;render();return;}
  const form=el.closest('#application-form');if(!form)return;
  ui.draft=readDraft(form);
  if(['mode','type','systems'].includes(el.name)){if(ui.editing){ui.draft.systems=findRequest(ui.editing).tasks.map(t=>t.systemId);}render();const next=[...document.getElementById('application-form').elements].find(input=>input.name===el.name&&input.value===el.value);next?.focus({preventScroll:true});}
  else if(['unit','ben_unit','department','ben_department'].includes(el.name)){updateCompanySections();}
});
document.addEventListener('input',event=>{
  if(event.target.id==='quick-search'){ui.query=event.target.value;ui.page=1;if(['overview','workbench'].includes(ui.view))render();}
  const form=event.target.closest('#application-form');if(form){ui.draft=readDraft(form);updateCounters(form);if(['department','ben_department'].includes(event.target.name))updateCompanySections();}
});
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
window.addEventListener('popstate',()=>go(location.hash.slice(1)));
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){db=load();if(!document.getElementById('detail-dialog').open)render();}});
shell();go(location.hash.slice(1)||'apply');save();

document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();document.querySelectorAll('.help-wrap.open').forEach(w=>{w.classList.remove('open');w.querySelector('button').setAttribute('aria-expanded','false');});if(document.activeElement?.classList.contains('help-trigger'))document.activeElement.blur();}});
