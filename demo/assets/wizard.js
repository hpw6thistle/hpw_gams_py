/* Form presentation and client validation. Identity remains employee-number based. */
'use strict';
const FORM_STEPS=['申請方式','人員資料','系統權限','確認送出'];
const FIELD_RULES={
  employee:{max:30,placeholder:'請輸入公司員工編號',hint:'登入帳號統一使用員工編號；不可填寫信箱。',pattern:'[A-Za-z0-9][A-Za-z0-9_-]{0,29}'},
  name:{max:40,placeholder:'請輸入中文姓名'},english:{max:60,placeholder:'請輸入英文姓名（選填）'},department:{max:60,placeholder:'例如：財務部'},
  reason:{max:300,placeholder:'請說明協助申請的原因'},description:{max:600,placeholder:'請補充實際工作用途或其他權限需求（選填）'}
};
const SYSTEM_REFERENCE={
  finance:{code:'FIN',name:'德安財會系統',original:'財會ERP',description:'財會、財務、應付帳款、採購及驗收',roles:['財會主管','財會專員','財會助理','財務主管','財務專員','財務助理','應付帳款','採購主管','採購專員','各店驗收']},
  hr:{code:'HR',name:'德安人事系統',original:'人事ERP',description:'總部及各店人事、核薪、扣繳申報',roles:['總部人事','各店人事','核薪','扣繳申報']},
  collab:{code:'KAO',name:'高益營建系統',original:'高益系統',description:'AWM／ACM／AHM 工務、財會、採購與銷控收款',roles:['AWM-工地主任','AWM-財會專員','AWM-採購專員','AWM-採購主管','ACM-財會專員','AHM-銷控收款']},
  bpm:{code:'BPM',name:'德安流程系統',original:'德安BPM',description:'BPM 表單與流程簽核',roles:[]}
};
function alignOriginalSystems(state){
  if(state.catalog.originalRolesAligned)return;
  const previous={finance:['財會系統','財會ERP'],hr:['人事系統','人事ERP'],collab:['協作平台','高益系統'],bpm:['簽核平台','德安BPM']};
  for(const [id,ref] of Object.entries(SYSTEM_REFERENCE)){
    const system=state.masters.systems.find(s=>s.id===id);if(!system)continue;
    if(previous[id].includes(system.name))system.name=ref.name;
    system.code??=ref.code;system.sourceName??=ref.original;system.description??=ref.description;
    const legacy={finance:['財會主管','財會專員','財會助理','財務主管','財務專員','財務助理','應付帳款','採購主管','採購專員','各區驗收'],hr:['總部人事','各區人事','薪資作業','扣繳申報'],collab:['工務管理','專案財會','專案採購','採購主管','帳務管理','收款管理'],bpm:[]};
    ref.roles.forEach((name,i)=>{const row=state.catalog.roles.find(r=>r.id===id+'-role-'+i);if(row&&(row.name===legacy[id][i]||row.name===name))row.name=name;});
  }
  for(const person of state.catalog.people){if(person.username==='demo.manager.1')person.username='DEMOADMIN001';if(person.username==='demo.manager.2')person.username='DEMOADMIN002';}
  state.catalog.originalRolesAligned=true;
}
function freshForm(){return {mode:'自行申請',employee:'',name:'',english:'',unit:'',department:'',ben_employee:'',ben_name:'',ben_english:'',ben_unit:'',ben_department:'',reason:'',type:'新增帳號',existing:'',description:'',systems:[],roles:{},companies:[]};}
function inputField(label,name,value,type='text',required=true,full=false,readonly=false){
  const key=name.startsWith('ben_')?name.slice(4):name,rule=FIELD_RULES[key]||{max:120,placeholder:'請輸入'+label};
  return `<label class="field ${full?'full':''}"><span>${esc(label)}${required?' <span class="required">*</span>':key==='english'?' <span class="optional-label">選填</span>':''}</span><input name="${name}" type="${type}" value="${esc(value)}" maxlength="${rule.max}" ${rule.pattern?`pattern="${rule.pattern}"`:''} placeholder="${esc(rule.placeholder)}" ${required?'required':''} ${readonly?'readonly':''} autocomplete="off" aria-describedby="hint-${name}"><span class="field-meta" id="hint-${name}"><span>${esc(rule.hint||'')}</span><span data-counter="${name}">${String(value||'').length}/${rule.max}</span></span></label>`;
}
function longField(label,name,value,required=false){const r=FIELD_RULES[name];return `<label class="field full"><span>${label}${required?' <span class="required">*</span>':''}</span><textarea name="${name}" maxlength="${r.max}" placeholder="${esc(r.placeholder)}" ${required?'required':''}>${esc(value)}</textarea><span class="field-meta"><span></span><span data-counter="${name}">${String(value||'').length}/${r.max}</span></span></label>`;}
function wizardSteps(){return `<ol class="process-steps wizard-steps" aria-label="填寫進度">${FORM_STEPS.map((label,i)=>`<li class="${i===ui.wizardStep?'current':i<ui.wizardStep?'done':''}" ${i===ui.wizardStep?'aria-current="step"':''}><span class="process-number">${i<ui.wizardStep?icon('check'):i+1}</span><span>${label}</span>${i<3?`<span class="process-arrow" aria-hidden="true">${icon('arrow')}</span>`:''}</li>`).join('')}</ol>`;}
function renderHome(){return mainHeading('系統帳號與權限','請依需求選擇入口。')+`<section class="home-services" aria-label="服務入口">${[
  ['apply','plus','提出申請','申請新帳號或調整既有權限'],['overview','grid','我的申請','查看申請、補件提醒與處理結果'],['lookup','search','進度查詢','用申請編號及員工編號查詢'],[isManager()?'workbench':'login','briefcase',isManager()?'案件工作台':'管理者登入',isManager()?'處理分派給您的申請':'進入管理人的案件處理入口']
].map(([view,i,title,description])=>`<a class="home-service" href="#${view}" ${view==='apply'?'data-action="new"':''}><span class="home-service-icon">${icon(i)}</span><div><h2>${title}</h2><p>${description}</p></div>${icon('arrow')}</a>`).join('')}</section><section class="panel home-notices"><div class="panel-head"><h2>待辦提醒</h2></div><div class="home-notice-body">${visibleRequests().some(r=>overall(r.tasks)==='退回補件')?`<p>有 ${visibleRequests().filter(r=>overall(r.tasks)==='退回補件').length} 件申請需要補充資料。</p>${button('前往我的申請','home-requests','primary')}`:'<p>目前沒有需要補充資料的申請。</p>'}</div></section>`;}
function wizardBody(d,original){
  if(ui.wizardStep===0)return `<h2>申請方式</h2><p class="section-intro">先選擇權限給誰使用，以及要申請的服務。</p><div class="choice-layout"><fieldset class="choice-field"><legend>這份權限給誰使用？ <span class="required">*</span></legend><div class="radio-group choice-options">${[['自行申請','我自己','申請本人工作所需權限'],['代為申請','其他同仁','協助同仁提出申請']].map(([v,t,p])=>`<label><input type="radio" name="mode" value="${v}" ${d.mode===v?'checked':''} ${original?'disabled':''}><span class="choice-copy"><strong>${t}</strong><small>${p}</small></span></label>`).join('')}</div></fieldset><fieldset class="choice-field"><legend>需要哪一種服務？ <span class="required">*</span></legend><div class="radio-group choice-options">${[['新增帳號','新增帳號','尚未開通要申請的系統'],['已有帳號新增功能','調整既有權限','已有帳號，需要增加功能']].map(([v,t,p])=>`<label><input type="radio" name="type" value="${v}" ${d.type===v?'checked':''} ${original?'disabled':''}><span class="choice-copy"><strong>${t}</strong><small>${p}</small></span></label>`).join('')}</div></fieldset></div>${d.type==='已有帳號新增功能'?`<div class="account-definition"><strong>既有帳號＝權限使用人的員工編號</strong><p>下一步填寫員工編號後自動帶入，不使用 Email 或手機號碼作為登入帳號。</p></div>`:''}`;
  if(ui.wizardStep===1)return `<h2>人員資料</h2><p class="section-intro">標示 <span class="required">*</span> 為必填。員工編號同時作為登入帳號。</p><div class="form-grid">${inputField('申請人員工編號','employee',d.employee,'text',true,true,Boolean(original))}${inputField('申請人中文姓名','name',d.name)}${inputField('申請人英文姓名','english',d.english,'text',false)}${unitField('所屬單位','unit',d.unit)}${inputField('部門名稱','department',d.department)}</div>${d.mode==='代為申請'?`<h3>權限使用人</h3><p class="section-intro">填寫實際使用這些系統的同仁資料。</p><div class="form-grid">${inputField('權限使用人員工編號','ben_employee',d.ben_employee,'text',true,true)}${inputField('權限使用人中文姓名','ben_name',d.ben_name)}${inputField('權限使用人英文姓名','ben_english',d.ben_english,'text',false)}${unitField('權限使用人單位','ben_unit',d.ben_unit)}${inputField('權限使用人部門','ben_department',d.ben_department)}${longField('代為申請原因','reason',d.reason,true)}</div>`:''}`;
  if(ui.wizardStep===2){
    const systems=original?original.tasks.map(t=>db.masters.systems.find(s=>s.id===t.systemId)).filter(Boolean):db.masters.systems.filter(s=>s.active);
    return `<h2>系統與權限</h2><p class="selection-hint">${icon('info')}系統、角色與負責帳套皆可複選；請依實際工作需求勾選。</p><div id="system-choices">${systems.map(system=>{
      const selected=d.systems.includes(system.id),prior=original?.tasks.find(t=>t.systemId===system.id),done=prior?.status==='已完成',roles=done?prior.roles:system.roles;
      return `<section class="system-card ${selected?'selected':''}"><label class="system-choice"><input type="checkbox" name="systems" value="${system.id}" ${selected?'checked':''} ${original?'disabled':''}><span class="system-copy"><strong class="system-name">${esc(system.name)}</strong><small>${esc(system.description||SYSTEM_REFERENCE[system.id]?.description||'依工作需要選擇系統')}</small></span><span class="system-code">${esc(system.code||SYSTEM_REFERENCE[system.id]?.code||'')}</span></label>${selected?`<div class="role-heading"><strong>角色／功能權限</strong><span>${done?'已完成，保留原權限':'可複選'}</span></div><div class="role-options">${roles.map(role=>`<label><input type="checkbox" name="role_${system.id}" value="${esc(role)}" ${(d.roles[system.id]||[]).includes(role)?'checked':''} ${done?'disabled':''}>${esc(role)}</label>`).join('')||'<p class="field-help">此系統不需另外選擇角色。</p>'}</div>`:''}</section>`;
    }).join('')}</div><div id="companies-slot">${companySection(d)}</div><div class="wizard-description">${longField('其他功能／權限說明','description',d.description)}</div>`;
  }
  const target=draftProfile(d),fields=[['申請方式',d.mode],['申請類型',d.type],['申請人',`${d.name}（${d.employee}）`],['權限使用人',`${target.name}（${target.employee}）`],['登入帳號（員工編號）',target.employee],['使用人單位／部門',`${target.unit}／${target.department}`]];
  return `<h2>確認申請內容</h2><p class="section-intro">送出前請再次確認使用人與所需權限。</p><dl class="review-grid">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><h3>申請系統與角色</h3><div class="review-systems">${d.systems.map(id=>{const system=db.masters.systems.find(s=>s.id===id);return `<div><strong>${esc(system?.name)}</strong><p>${esc((d.roles[id]||[]).join('、')||'不需另外選擇角色')}</p></div>`;}).join('')}</div>${needsCompanies(d)?`<p><strong>負責帳套：</strong>${esc(d.companies.join('、'))}</p>`:''}${d.description?`<p class="review-description"><strong>其他說明：</strong>${esc(d.description)}</p>`:''}<div class="review-edit-actions">${button('修改人員資料','wizard-edit','text small','data-step="1"')}${button('修改系統權限','wizard-edit','text small','data-step="2"')}</div><label class="review-confirm"><input type="checkbox" name="confirmed" required>我已確認申請資料與所需權限。</label>`;
}
function renderWizard(){
  if(ui.success)return mainHeading('申請已送出','請保留申請編號。')+`<section class="panel success-panel"><div class="success-mark">${icon('check')}</div><h2>申請已成功送出</h2><div class="request-number"><code>${ui.success}</code>${button(`${icon('copy')}複製`,'copy','small',`data-value="${ui.success}"`)}</div><p>查詢員工編號：${esc(findRequest(ui.success).applicant.employee)}</p><div class="success-actions">${button('查看申請進度','lookup-success','primary')}${button('再建立一筆','new')}</div></section>`;
  ui.draft??=freshForm();ui.wizardStep??=0;const d=ui.draft,original=ui.editing?findRequest(ui.editing):null;
  return mainHeading(original?'補件／修改申請':'資訊系統帳號權限申請','依步驟填寫，最後確認後送出。')+wizardSteps()+`<div class="form-layout"><form id="application-form" class="panel wizard-panel" data-step="${ui.wizardStep}" novalidate><div class="wizard-section"><div class="wizard-kicker">步驟 ${ui.wizardStep+1}／4</div><div id="form-error" class="error-summary" role="alert" tabindex="-1" hidden></div>${wizardBody(d,original)}</div><div class="form-submit wizard-actions">${ui.wizardStep>0?button('上一步','wizard-back'):button('返回首頁','go-home','text')}<button type="submit" class="btn primary">${ui.wizardStep===3?(original?'重新送出補件':'送出申請'):'下一步'} ${icon('arrow')}</button></div></form></div>`;
}
function readWizardDraft(form){
  const data=new FormData(form),d={...ui.draft,systems:[...(ui.draft?.systems||[])],roles:{...(ui.draft?.roles||{})},companies:[...(ui.draft?.companies||[])]};
  for(const [key,value] of data.entries())if(!['systems','companies','confirmed'].includes(key)&&!key.startsWith('role_'))d[key]=String(value);
  if(form.querySelector('#system-choices')){
    d.systems=ui.editing?findRequest(ui.editing).tasks.map(t=>t.systemId):data.getAll('systems');
    for(const id of d.systems)d.roles[id]=data.getAll('role_'+id);
    if(form.querySelector('[name="companies"]'))d.companies=data.getAll('companies');
    if(ui.editing)for(const t of findRequest(ui.editing).tasks)if(t.status==='已完成')d.roles[t.systemId]=[...t.roles];
  }
  d.existing=d.type==='已有帳號新增功能'?draftProfile(d).employee.trim():'';
  return d;
}
function validateStep(form){
  for(const input of form.querySelectorAll('input,textarea,select')){
    input.setCustomValidity('');input.removeAttribute('aria-invalid');
    if(input.required&&!input.disabled&&!String(input.value).trim()&&input.type!=='checkbox')input.setCustomValidity('請填寫此欄位。');
    if(input.name.includes('employee')&&input.value&&!/^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/.test(input.value))input.setCustomValidity('請輸入員工編號，限英數字、底線或連字號，最多 30 字；不可使用 Email。');
    if(!input.checkValidity()){input.setAttribute('aria-invalid','true');applicationError(input.validationMessage);input.focus();input.reportValidity();return false;}
  }
  if(ui.wizardStep===2){const d=ui.draft;if(!d.systems.length){applicationError('請至少選擇一個申請系統（可複選）。');return false;}
    for(const id of d.systems){const system=db.masters.systems.find(s=>s.id===id);if(system.roles.length&&!d.roles[id]?.length){applicationError('請選擇「'+system.name+'」的角色／功能權限（可複選）。');return false;}}
    if(needsCompanies(d)&&!d.companies.length){applicationError('請選擇至少一個負責帳套（可複選）。');return false;}}
  return true;
}
function advanceWizard(form){ui.draft=readWizardDraft(form);if(!validateStep(form))return;if(ui.wizardStep<3){ui.wizardStep++;render();window.scrollTo({top:0,behavior:'instant'});}else submitApplication(form);}
function updateCounters(form){const error=form.querySelector('#form-error');if(error){error.hidden=true;error.textContent='';}for(const input of form.querySelectorAll('input[name],textarea[name]')){const span=form.querySelector(`[data-counter="${input.name}"]`);if(span)span.textContent=input.value.length+'/'+input.maxLength;input.setCustomValidity('');input.removeAttribute('aria-invalid');}}
function renderBreadcrumbs(){
  const el=document.getElementById('breadcrumb-current');if(!el)return;
  if(ui.view==='settings'&&ui.role==='super'){el.innerHTML=`<a href="#settings">主檔與規則</a><span aria-hidden="true">／</span><span aria-current="page">${MASTER_TABS[ui.settingsTab]||MASTER_TABS.systems}</span>`;el.parentElement.hidden=false;}
  else{el.textContent='';el.parentElement.hidden=true;}
}

/* Reading focus remains visual: every section stays operable. */
let readingSections=[];
let readingFrame=0;
function setReadingFocus(index){
  readingSections.forEach((section,i)=>section.dataset.focusState=i===index?'active':i>index?'upcoming':'previous');
}
function refreshReadingFocus(){
  readingFrame=0;
  if(!readingSections.length)return;
  const line=Math.min(300,window.innerHeight*.4);
  let index=readingSections.findIndex(section=>section.getBoundingClientRect().bottom>line);
  if(index<0)index=readingSections.length-1;
  setReadingFocus(index);
}
function queueReadingFocus(){if(!readingFrame)readingFrame=requestAnimationFrame(refreshReadingFocus);}
function initFormPresentation(){
  const form=document.getElementById('application-form');
  document.documentElement.classList.toggle('form-scrolling',Boolean(form));
  document.body.classList.toggle('application-entry',Boolean(form&&form.dataset.step==='0'));
  readingSections=[];
  if(!form)return;
  const step=Number(form.dataset.step);
  const selector=step===0?'.choice-field':step===1?'.wizard-section>.form-grid':step===2?'.system-card,.company-section,.wizard-description':'.review-grid,.review-systems,.review-confirm';
  readingSections=[...form.querySelectorAll(selector)];
  readingSections.forEach((section,i)=>{
    section.classList.add('focus-section');
    section.addEventListener('pointerenter',()=>setReadingFocus(i));
    section.addEventListener('pointerleave',()=>{if(!section.contains(document.activeElement))queueReadingFocus();});
  });
  form.addEventListener('focusin',event=>{const index=readingSections.indexOf(event.target.closest('.focus-section'));if(index>=0)setReadingFocus(index);});
  refreshReadingFocus();
}
window.addEventListener('scroll',queueReadingFocus,{passive:true});
window.addEventListener('resize',queueReadingFocus,{passive:true});
