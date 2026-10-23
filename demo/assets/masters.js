/* Anonymous master-data simulation following the regenerated v19 settings.
   No credentials are stored or used for login; all changes stay in this browser. */
'use strict';
const MASTER_TABS = {systems:'系統別管理',people:'系統管理人設定',rules:'系統指派規則設定',roles:'角色管理',units:'所屬單位管理',companies:'帳套別管理',history:'申請歷程查詢'};

function upgradeDemo(state){
  if(!state.catalog){
    state.catalog={version:1,people:['managerA','managerB'].map((id,i)=>({id,name:['範例管理人甲','範例管理人乙'][i],username:'demo.manager.'+(i+1),email:'manager'+(i+1)+'@example.invalid',active:true,sort:(i+1)*10,passwordSet:true,passwordRevision:1})),roles:[],units:[],companies:[],rules:[{id:'hr-finance',systemId:'hr',unitEquals:'',departmentContains:'財務',roleContains:'',person:'managerA',priority:10,active:state.ruleEnabled!==false}],audit:[]};
    for(const s of state.masters.systems)s.roles.forEach((name,i)=>state.catalog.roles.push({id:s.id+'-role-'+i,systemId:s.id,name,active:true,sort:(i+1)*10}));
    for(const key of ['units','companies'])state.catalog[key]=state.masters[key].map((name,i)=>({id:key+'-'+i,name,active:true,sort:(i+1)*10}));
  }
  state.masters.systems.forEach((s,i)=>{s.sort??=(i+1)*10;s.companyUnitEquals??='總部';s.companyDepartmentContains??='財務';});
  syncDemoMasters(state);
  return state;
}
function syncDemoMasters(state){
  const byOrder=(a,b)=>a.sort-b.sort||a.name.localeCompare(b.name,'zh-TW');
  state.masters.systems.sort(byOrder);
  for(const system of state.masters.systems)system.roles=state.catalog.roles.filter(r=>r.systemId===system.id&&r.active).sort(byOrder).map(r=>r.name);
  for(const key of ['units','companies'])state.masters[key]=state.catalog[key].filter(r=>r.active).sort(byOrder).map(r=>r.name);
  for(const person of state.catalog.people)ROLE_NAMES[person.id]=person.name;
}
function availableRoles(){return Object.fromEntries([['applicant',ROLE_NAMES.applicant],...db.catalog.people.filter(p=>p.active).sort((a,b)=>a.sort-b.sort).map(p=>[p.id,p.name]),['super',ROLE_NAMES.super]]);}
function refreshRoleOptions(){
  const roles=availableRoles();if(!Object.hasOwn(roles,ui.role))ui.role='applicant';
  const select=document.getElementById('role-select');
  select.innerHTML=Object.entries(roles).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');select.value=ui.role;
}
function recordMasterChange(action,detail){db.catalog.audit.push({at:new Date().toISOString(),actor:ROLE_NAMES[ui.role],action,detail});}
function masterRows(kind){const rows=kind==='systems'?db.masters.systems:db.catalog[kind];return rows.sort((a,b)=>(a.priority??a.sort)-(b.priority??b.sort)||a.id.localeCompare(b.id));}
function masterSelection(kind){const rows=masterRows(kind);return rows.find(r=>r.id===ui.masterSelection[kind])||rows[0]||null;}
function masterSelect(label,name,rows,value,emptyLabel){
  const options=rows.map(r=>({id:r.id,name:r.name??r.label}));
  if(value&&!options.some(r=>r.id===value))options.unshift({id:value,name:value+'（已停用）'});
  return `<label class="field"><span>${label}</span><select name="${name}">${emptyLabel!==undefined?`<option value="">${emptyLabel}</option>`:''}${options.map(r=>`<option value="${esc(r.id)}" ${r.id===value?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>`;
}
function masterInput(label,name,value,type='text',required=true){
  return `<label class="field"><span>${label}${required?' <span class="required">*</span>':''}</span><input name="${name}" type="${type}" value="${esc(value??'')}" ${required?'required':''} ${type==='number'?'min="1" max="99999"':'maxlength="120"'} autocomplete="off"></label>`;
}
function masterFields(kind,row={},adding=false){
  const order=masterInput('排序','sort',row.sort??100,'number');
  const active=adding?'':`<label class="master-checkbox full"><input name="active" type="checkbox" ${row.active?'checked':''}>啟用</label>`;
  const people=db.catalog.people.filter(p=>p.active||p.id===row.manager||p.id===row.person);
  const systems=db.masters.systems.filter(s=>s.active||s.id===row.systemId);
  if(kind==='systems')return masterInput('系統名稱','name',row.name)+order+masterSelect('預設管理人','manager',people,adding?'managerB':(row.manager||''),'未指定')+`<label class="master-checkbox"><input name="usesCompany" type="checkbox" ${row.usesCompany?'checked':''}>依條件顯示負責帳套</label>`+masterInput('帳套條件－所屬單位等於（留白不限）','companyUnitEquals',row.companyUnitEquals??'','text',false)+masterInput('帳套條件－部門名稱包含（留白不限）','companyDepartmentContains',row.companyDepartmentContains??'','text',false)+active;
  if(kind==='people')return masterInput('姓名','name',row.name)+masterInput('登入帳號','username',row.username)+masterInput('Email','email',row.email,'email',false)+order+masterInput(adding?'初始密碼':'重設密碼（留白維持原設定）','password','','password',adding)+`<p class="field-help full">密碼至少 10 碼且包含英文大小寫。</p>`+active;
  if(kind==='rules')return masterSelect('申請系統','systemId',systems,row.systemId??systems[0]?.id)+masterSelect('所屬單位條件','unitEquals',db.catalog.units.filter(x=>x.active).map(x=>({id:x.name,name:x.name})),row.unitEquals??'','不限')+masterInput('部門名稱包含（留白不限）','departmentContains',row.departmentContains,'text',false)+masterInput('角色名稱包含（留白不限）','roleContains',row.roleContains,'text',false)+masterSelect('指派管理人','person',people,row.person??people[0]?.id)+masterInput('優先序（數字越小越優先）','priority',row.priority??100,'number')+active;
  if(kind==='roles')return masterSelect('申請系統','systemId',systems,row.systemId??systems[0]?.id)+masterInput('角色／功能權限名稱','name',row.name)+order+active;
  return masterInput(kind==='units'?'所屬單位':'帳套別名稱','name',row.name)+order+active;
}
function masterTable(kind,rows){
  let headers,cells;
  const system=id=>db.masters.systems.find(s=>s.id===id)?.name||'未指定';
  const person=id=>ROLE_NAMES[id]||'未指定';
  const enabled=r=>r.active?'啟用':'停用';
  if(kind==='systems'){headers=['排序','系統名稱','預設管理人','帳套條件','狀態'];cells=r=>[r.sort,r.name,person(r.manager),r.usesCompany?'啟用':'未啟用',`<label class="master-checkbox"><input type="checkbox" data-setting="active" data-system="${esc(r.id)}" ${r.active?'checked':''}>${enabled(r)}</label>`];}
  else if(kind==='people'){headers=['姓名','登入帳號','Email','密碼設定','狀態'];cells=r=>[r.name,r.username,r.email||'未設定',r.passwordSet?'已設定':'未設定',enabled(r)];}
  else if(kind==='rules'){headers=['優先序','申請系統','單位／部門／角色條件','指派管理人','狀態'];cells=r=>[r.priority,system(r.systemId),[r.unitEquals||'不限',r.departmentContains||'不限',r.roleContains||'不限'].join('／'),person(r.person),enabled(r)];}
  else if(kind==='roles'){headers=['排序','申請系統','角色／功能權限','狀態'];cells=r=>[r.sort,system(r.systemId),r.name,enabled(r)];}
  else{headers=['排序',kind==='units'?'所屬單位':'帳套別','狀態'];cells=r=>[r.sort,r.name,enabled(r)];}
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cells(r).map((v,i)=>`<td>${kind==='systems'&&i===4?v:esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}" class="empty">目前沒有資料，可在下方新增。</td></tr>`}</tbody></table></div>`;
}
function historyPattern(query){
  let pattern=query.includes('%')?query:'%'+query+'%';
  return new RegExp('^'+[...pattern].map(c=>c==='%'?'.*':c==='_'?'.':c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$','i');
}
function renderHistory(){
  const match=historyPattern(ui.historyQuery);
  const logs=db.requests.filter(r=>match.test(r.number)).flatMap(r=>r.audit.map(a=>({...a,number:r.number}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,500);
  const table=(rows,caseRows)=>`<div class="table-wrap"><table><thead><tr>${(caseRows?['申請單號','動作','操作者','說明','時間']:['設定動作','操作者','說明','時間']).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(a=>`<tr>${(caseRows?[a.number,a.action,a.actor,a.detail,displayDate(a.at)]:[a.action,a.actor,a.detail,displayDate(a.at)]).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${caseRows?5:4}" class="empty">查無符合條件的紀錄。</td></tr>`}</tbody></table></div>`;
  return `<div class="master-content"><h2>申請歷程查詢</h2><p>僅搜尋申請編號。輸入部分編號可查包含的案件；% 為萬用字元，例如 BPM20261021%。</p><form id="history-form" class="history-form"><label class="field"><span>申請單號搜尋</span><input name="query" value="${esc(ui.historyQuery)}" maxlength="40" placeholder="完整或部分申請編號"></label><button class="btn primary" type="submit">搜尋</button>${button('清除','clear-history')}</form></div><div id="case-history">${table(logs,true)}</div><div class="master-content"><h2>設定修改紀錄</h2><p>僅記錄本瀏覽器內的操作；不包含密碼。</p></div>${table([...db.catalog.audit].reverse().slice(0,100),false)}`;
}
function renderSettings(){
  if(ui.role!=='super')return mainHeading('主檔與規則','僅供最高管理者調整設定。')+`<section class="panel success-panel"><h2>此角色無法修改系統設定</h2><p>可從右上角切換最高管理人，體驗設定功能。</p>${button('切換最高管理人','role-super','primary')}</section>`;
  if(!Object.hasOwn(MASTER_TABS,ui.settingsTab))ui.settingsTab='systems';
  const kind=ui.settingsTab;
  const tabs=`<div class="settings-tabs" role="tablist" aria-label="系統設定分類">${Object.entries(MASTER_TABS).map(([id,name])=>`<button id="settings-tab-${id}" role="tab" aria-selected="${id===kind}" aria-controls="settings-content" tabindex="${id===kind?0:-1}" data-action="settings-tab" data-tab="${id}">${name}</button>`).join('')}</div>`;
  let content;
  if(kind==='history')content=renderHistory();
  else{
    const rows=masterRows(kind),selected=masterSelection(kind);
    const label=r=>kind==='rules'?`${db.masters.systems.find(s=>s.id===r.systemId)?.name||'系統'} → ${ROLE_NAMES[r.person]||'未指定'}（優先序 ${r.priority}）`:kind==='roles'?`${db.masters.systems.find(s=>s.id===r.systemId)?.name||'系統'}｜${r.name}`:r.name;
    content=`<div class="master-content"><h2>${MASTER_TABS[kind]}</h2><p>上方清單供檢視；選取一筆後於下方修改。資料保留歷史，只停用，不刪除。</p></div>${masterTable(kind,rows)}${selected?`<div class="master-content"><label class="field"><span>選擇要修改的資料</span><select id="master-selection">${rows.map(r=>`<option value="${esc(r.id)}" ${r.id===selected.id?'selected':''}>${esc(label(r))}${r.active?'':'（停用）'}</option>`).join('')}</select></label><h3>修改資料</h3><form id="master-edit-form" data-kind="${kind}" data-id="${esc(selected.id)}"><div class="form-grid">${masterFields(kind,selected)}</div><button type="submit" class="btn primary">儲存修改</button></form></div>`:''}<details class="master-add"><summary>新增${MASTER_TABS[kind].replace('設定','').replace('管理','')}</summary><form id="master-add-form" data-kind="${kind}"><div class="form-grid">${masterFields(kind,{},true)}</div><button type="submit" class="btn primary">新增</button></form></details>`;
  }
  return mainHeading('主檔與規則','管理系統、管理人、指派規則與申請歷程。')+`<section class="panel settings-panel">${tabs}<div id="settings-content" role="tabpanel" aria-labelledby="settings-tab-${kind}">${content}</div></section>`;
}
function saveMasterForm(form){
  if(ui.role!=='super')return toast('僅限最高管理者修改設定。');
  const kind=form.dataset.kind,adding=form.id==='master-add-form';
  if(!Object.hasOwn(MASTER_TABS,kind)||kind==='history')return;
  const rows=masterRows(kind),old=adding?null:rows.find(r=>r.id===form.dataset.id);if(!adding&&!old)return;
  const data=new FormData(form),get=k=>String(data.get(k)||'').trim();
  const row={...(old||{}),id:old?.id||'demo-'+crypto.randomUUID(),active:adding||data.has('active')};
  const order=Number(get(kind==='rules'?'priority':'sort'));
  if(!Number.isInteger(order)||order<1||order>99999)return toast('排序或優先序需為 1 至 99999 的整數。');
  if(kind==='rules'){
    Object.assign(row,{systemId:get('systemId'),unitEquals:get('unitEquals'),departmentContains:get('departmentContains'),roleContains:get('roleContains'),person:get('person'),priority:order});
    if(!db.masters.systems.some(s=>s.id===row.systemId)||!db.catalog.people.some(p=>p.id===row.person&&p.active))return toast('請選擇系統及啟用中的指派管理人。');
  }else{
    row.name=get('name');row.sort=order;if(!row.name)return toast('請填寫名稱。');
    if(kind==='roles'){row.systemId=get('systemId');if(!db.masters.systems.some(s=>s.id===row.systemId))return toast('請選擇申請系統。');}
    if(rows.some(r=>r.id!==row.id&&r.name===row.name&&(kind!=='roles'||r.systemId===row.systemId)))return toast('名稱已存在，請使用其他名稱。');
    if(kind==='systems'){
      Object.assign(row,{manager:get('manager')||null,usesCompany:data.has('usesCompany'),companyUnitEquals:get('companyUnitEquals'),companyDepartmentContains:get('companyDepartmentContains')});
      if(row.manager&&!db.catalog.people.some(p=>p.id===row.manager&&p.active))return toast('請選擇啟用中的預設管理人，或選未指定。');
      row.roles??=[];
    }
    if(kind==='people'){
      const password=String(data.get('password')||'');row.username=get('username');row.email=get('email');
      if(!row.username)return toast('請填寫登入帳號。');
      if(rows.some(r=>r.id!==row.id&&r.username===row.username))return toast('登入帳號已存在。');
      if((adding||password)&&!(password.length>=10&&/[A-Z]/.test(password)&&/[a-z]/.test(password)))return toast('密碼至少 10 碼，且需包含英文大小寫。');
      if(password){row.passwordSet=true;row.passwordRevision=(old?.passwordRevision||0)+1;}
    }
  }
  if(old)Object.assign(old,row);else rows.push(row);
  syncDemoMasters(db);ui.masterSelection[kind]=row.id;
  recordMasterChange((adding?'新增':'修改')+MASTER_TABS[kind],kind==='rules'?`${db.masters.systems.find(s=>s.id===row.systemId)?.name} → ${ROLE_NAMES[row.person]}`:row.name);
  save();refreshRoleOptions();render();toast(adding?'已新增資料。':'已儲存修改；既有案件內容保留。');
}
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-action="settings-tab"]');if(!tab)return;
  const keys=Object.keys(MASTER_TABS),index=keys.indexOf(tab.dataset.tab);let next;
  if(event.key==='ArrowRight')next=keys[(index+1)%keys.length];
  if(event.key==='ArrowLeft')next=keys[(index+keys.length-1)%keys.length];
  if(event.key==='Home')next=keys[0];if(event.key==='End')next=keys.at(-1);
  if(next){event.preventDefault();ui.settingsTab=next;render();document.getElementById('settings-tab-'+next).focus();}
});
