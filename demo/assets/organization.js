'use strict';
const ORGANIZATION={
  "9": [
    "採購一部",
    "財務會計",
    "董事長室",
    "驗收部",
    "人事部",
    "採購二部",
    "資訊部",
    "廣告部",
    "建設工務",
    "管理部",
    "設計部",
    "主管司機-福苑",
    "秘書部",
    "財務部",
    "財務管理",
    "法務部",
    "都更部",
    "採購三部",
    "建設部",
    "主管司機",
    "凱德唐管理部",
    "總務部",
    "企劃部"
  ],
  "2014": [
    "蘆洲業務部",
    "蘆洲廚務部",
    "蘆洲總務部"
  ],
  "1161": [
    "航空房務部",
    "航空廚務部",
    "航空管理部",
    "航空餐廳部",
    "航空公清組",
    "航空客務部",
    "航空安全部"
  ],
  "2004": [
    "北區業務部",
    "北區管理部",
    "北區廚務部",
    "北區總務部",
    "北區訂席組"
  ],
  "2015": [
    "海山管理部",
    "海山廚務部",
    "海山業務部",
    "海山總務部",
    "海山安全部"
  ],
  "1028": [
    "德立莊餐廳部",
    "德超市廚務",
    "德立莊西廚部",
    "德立莊管理部",
    "德立莊房務部",
    "德立莊客務部",
    "德立莊公清部",
    "德立莊廚務部",
    "德立莊西餐部",
    "德立莊工務部",
    "德超市餐廳部",
    "霸霸冰廚務部",
    "德立莊餐飲部"
  ],
  "2003": [
    "長安廚務部",
    "長安總務部",
    "長安業務部",
    "德立莊廚務部"
  ],
  "1026": [
    "南東房務部",
    "南東客房部",
    "南東廚務部",
    "南東餐廳部",
    "南東管理部"
  ],
  "1025": [
    "城商房務部",
    "城商客務部",
    "城商廚務部",
    "聯訂-訂房中心(南區)",
    "聯訂-收益管理中心",
    "城商聯合訂房中心",
    "城商管理部",
    "聯訂-業務部",
    "聯訂-訂房中心",
    "城商公清部"
  ],
  "1027": [
    "真愛房務部",
    "真愛管理部",
    "真愛總務部",
    "真愛公清部",
    "真愛客房部",
    "真愛工務部",
    "真愛中餐外場",
    "真愛烘焙部",
    "真打狗餐廳部",
    "真愛廚務部",
    "真愛百匯部",
    "真愛西餐外場",
    "真打狗廚務部"
  ],
  "3": [
    "業務部",
    "工廠管理部",
    "工廠生產課",
    "工廠總務課",
    "工廠養護課",
    "工廠儲運課",
    "工廠業務課",
    "工廠研發課",
    "北食總務部",
    "工廠品管課"
  ],
  "1034": [
    "城商桃車客務部",
    "城商桃車房務部"
  ],
  "1032": [
    "博愛房務部",
    "博愛餐廳部",
    "博愛公清部",
    "博愛客務部",
    "博愛管理部",
    "博愛工務部",
    "博愛廚務部"
  ],
  "1029": [
    "海景客務部",
    "海景房務部"
  ],
  "1036": [
    "美麗島客務部",
    "美麗島房務部"
  ],
  "1031": [
    "北門房務部",
    "北門管理部",
    "北門客務部"
  ],
  "1037": [
    "德立莊客務部",
    "德立莊房務部",
    "德立莊管理部",
    "德立莊工務部"
  ],
  "1030": [
    "昆明房務部",
    "昆明公清部",
    "昆明超市廚務部",
    "昆明客務部",
    "昆明廚務部",
    "昆明餐廳部",
    "昆明超市餐廳部",
    "昆明工務部",
    "昆明管理部"
  ],
  "1033": [
    "站前房務部",
    "站前管理部",
    "站前客務部"
  ],
  "1035": [
    "凱德唐工程部",
    "凱德唐機電部",
    "凱德唐管理部",
    "凱德唐安全部"
  ],
  "5": [
    "香織度餐飲部"
  ],
  "4001": [
    "冷鏈機電課",
    "冷鏈環安課",
    "冷鏈管理課",
    "冷鏈物流課"
  ]
};
function importOrganization(state){
 if(state.catalog.organizationRevision===1)return;
 const defaults=['總部','北區','中區','南區'];
 for(const [i,name] of defaults.entries()){const row=state.catalog.units.find(r=>r.id==='units-'+i&&r.name===name);if(row)row.active=false;}
 for(const unit of Object.keys(ORGANIZATION))if(!state.catalog.units.some(r=>r.name===unit))state.catalog.units.push({id:'org-unit-'+unit,name:unit,active:true,sort:100+state.catalog.units.length});
 state.catalog.organizationRevision=1;
}
function orgOptions(name,form){
 if(name==='unit'||name==='ben_unit')return Object.keys(ORGANIZATION).filter(u=>db.catalog.units.some(r=>r.name===u&&r.active));
 const unit=form?.elements.namedItem(name==='department'?'unit':'ben_unit')?.value||'';
 return ORGANIZATION[unit]||[];
}
function organizationField(label,name,value){return `<label class="field org-field"><span>${esc(label)} <span class="required">*</span></span><input name="${name}" value="${esc(value)}" placeholder="${name.includes('department')?'先選單位，再搜尋部門':'輸入或搜尋大部門代號'}" maxlength="60" required aria-label="${esc(label)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="options-${name}" autocomplete="off"><span class="org-options" role="listbox" aria-label="${esc(label)}選項" id="options-${name}" hidden></span><span class="field-meta">可輸入關鍵字搜尋，請從清單選取。</span></label>`;}
function showOrgOptions(input){
 const list=document.getElementById('options-'+input.name);if(!list)return;
 const matches=orgOptions(input.name,input.form).filter(v=>v.toLocaleLowerCase().includes(input.value.trim().toLocaleLowerCase()));
 list.replaceChildren();
 for(const value of matches){const option=document.createElement('button');option.type='button';option.role='option';option.textContent=value;option.dataset.orgValue=value;option.dataset.orgName=input.name;option.tabIndex=-1;list.append(option);}
 if(!matches.length){const empty=document.createElement('span');empty.className='org-empty';empty.textContent=input.name.includes('department')?'請先選擇有效單位，或更換搜尋文字。':'沒有符合的選項。';list.append(empty);}
 list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
}
function closeOrgOptions(){document.querySelectorAll('.org-options').forEach(e=>e.hidden=true);document.querySelectorAll('.org-field input').forEach(e=>{e.setAttribute('aria-expanded','false');e.removeAttribute('aria-activedescendant');});}
function pickOrg(input,value){
 if(!orgOptions(input.name,input.form).includes(value))return;
 input.value=value;
 if(input.name==='unit'||input.name==='ben_unit'){const dept=input.form.elements.namedItem(input.name==='unit'?'department':'ben_department');dept.value='';}
 input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closeOrgOptions();input.focus();closeOrgOptions();
}
document.addEventListener('focusin',e=>{if(e.target.matches('.org-field input'))showOrgOptions(e.target);else if(!e.target.closest('.org-field'))closeOrgOptions();});
document.addEventListener('input',e=>{if(e.target.matches('.org-field input')){if(['unit','ben_unit'].includes(e.target.name)){const dept=e.target.form.elements.namedItem(e.target.name==='unit'?'department':'ben_department');dept.value='';}showOrgOptions(e.target);}});
document.addEventListener('mousedown',e=>{if(e.target.closest('[data-org-value]'))e.preventDefault();});
document.addEventListener('click',e=>{const option=e.target.closest('[data-org-value]');if(option){const input=document.querySelector('.org-field input[name="'+option.dataset.orgName+'"]');pickOrg(input,option.dataset.orgValue);}else if(e.target.matches('.org-field input'))showOrgOptions(e.target);else if(!e.target.closest('.org-field'))closeOrgOptions();});
document.addEventListener('keydown',e=>{
 const input=e.target;if(!input.matches('.org-field input'))return;
 if(e.key==='Escape'||e.key==='Tab'){closeOrgOptions();return;}
 if(!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;
 const list=document.getElementById('options-'+input.name);if(list.hidden&&e.key==='Enter')return;
 e.preventDefault();if(list.hidden)showOrgOptions(input);
 const options=[...list.querySelectorAll('button')];if(!options.length)return;
 let i=options.findIndex(o=>o.getAttribute('aria-selected')==='true');
 if(e.key==='Enter'){if(i>=0||options.length===1)pickOrg(input,options[Math.max(0,i)].dataset.orgValue);return;}
 i=i<0?(e.key==='ArrowDown'?0:options.length-1):(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
 options.forEach((o,n)=>{o.id='org-'+input.name+'-'+n;o.setAttribute('aria-selected',String(n===i));});input.setAttribute('aria-activedescendant',options[i].id);options[i].scrollIntoView({block:'nearest'});
});
function orgValidation(d){
 for(const prefix of d.mode==='代為申請'?['','ben_']:['']){
  const unit=d[prefix+'unit'],dept=d[prefix+'department'];
  if(!Object.keys(ORGANIZATION).includes(unit)||!db.catalog.units.some(r=>r.name===unit&&r.active))return '請從清單選擇有效的單位（大部門代號）。';
  if(!ORGANIZATION[unit].includes(dept))return '部門不屬於所選單位，請從清單重新選擇。';
 }
 return '';
}
function applicationValidation(d){
 if(!['自行申請','代為申請'].includes(d.mode)||!['新增帳號','已有帳號新增功能'].includes(d.type))return '申請方式或類型無效。';
 for(const prefix of d.mode==='代為申請'?['','ben_']:[''])for(const [key,max] of Object.entries({employee:30,name:40,english:60,unit:60,department:60})){
  const v=d[prefix+key];if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))return '人員資料包含不允許的字元或超過長度限制。';
  if(key!=='english'&&!v.trim())return '請填寫必填的人員資料。';
 }
 for(const key of ['reason','description']){const v=d[key]||'';if(typeof v!=='string'||v.length>(key==='reason'?300:600)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))return '說明文字包含不允許的字元或超過長度限制。';}
 const org=orgValidation(d);if(org)return org;
 if(!Array.isArray(d.systems)||!d.systems.length||new Set(d.systems).size!==d.systems.length)return '請選擇有效系統。';
 for(const id of d.systems){const s=db.masters.systems.find(s=>s.id===id);const prior=ui.editing?findRequest(ui.editing)?.tasks.find(t=>t.systemId===id):null;
  if(!s||(!ui.editing&&!s.active)||!Array.isArray(d.roles[id])||d.roles[id].some(r=>!(prior?.status==='已完成'?prior.roles:s.roles).includes(r)))return '系統或角色不在允許的清單中。';}
 if(!Array.isArray(d.companies)||d.companies.some(c=>!db.masters.companies.includes(c)))return '帳套不在允許的清單中。';
 return '';
}
