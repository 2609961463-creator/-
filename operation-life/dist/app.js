'use strict';
const $ = s => document.querySelector(s);
const KEY = 'operation-life-v1';
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plusDays = n => {const d=new Date();d.setDate(d.getDate()+n);return day(d)};
function initial(){return {version:1,season:{name:'代号：重启生活',start:day(),end:plusDays(29)},tasks:[
{id:uid(),title:'让身体先醒过来',description:'散步、跑步或拉伸 20 分钟，让今天从运动开始。',category:'体能训练',type:'daily',target:1,unit:'次',points:100,created:day()},
{id:uid(),title:'专注，是你的超能力',description:'放下手机，完成 2 个 25 分钟的专注时段。',category:'专注行动',type:'daily',target:2,unit:'轮',points:150,created:day()},
{id:uid(),title:'给大脑补充一点弹药',description:'读 10 页书，记下一个你想留下的观点。',category:'成长计划',type:'daily',target:1,unit:'次',points:80,created:day()},
{id:uid(),title:'为明天留下一个坐标',description:'睡前写下今天的一件收获，以及明天最重要的一件事。',category:'生活秩序',type:'daily',target:1,unit:'次',points:60,created:day()},
{id:uid(),title:'建立你的运动节奏',description:'本赛季累计完成 12 次运动，每次都向更好的自己靠近。',category:'赛季挑战',type:'season',target:12,unit:'次',points:800,created:day()}],rewards:[
{id:uid(),title:'一杯喜欢的咖啡',description:'给认真生活的自己，一杯小小的奖励。',cost:200,icon:'☕'},
{id:uid(),title:'一小时游戏时间',description:'心安理得地放松，享受属于你的时间。',cost:300,icon:'⌘'},
{id:uid(),title:'一场期待的电影',description:'关掉待办，走进另一个世界。',cost:600,icon:'▷'}],progress:{},logs:[]}};
function valid(s){
if(!s||s.version!==1||!s.season||!Array.isArray(s.tasks)||!Array.isArray(s.rewards)||!Array.isArray(s.logs)||!s.progress||typeof s.progress!=='object'||Array.isArray(s.progress))return false;
const str=(x,n=500)=>typeof x==='string'&&x.length<=n;
const date=x=>str(x,10)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(new Date(x+'T00:00:00').valueOf());
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
if(!str(s.season.name,60)||!date(s.season.start)||!date(s.season.end)||s.season.end<s.season.start)return false;
if(s.tasks.length>1000||s.rewards.length>1000||s.logs.length>50000)return false;
if(!s.tasks.every(t=>str(t.id,100)&&str(t.title,80)&&str(t.description)&&str(t.category,30)&&['daily','season'].includes(t.type)&&integer(t.target,1,9999)&&integer(t.points,0,100000)&&str(t.unit,10)&&date(t.created)))return false;
if(!s.rewards.every(r=>str(r.id,100)&&str(r.title,80)&&str(r.description)&&integer(r.cost,1,1000000)&&str(r.icon,10)))return false;
if(new Set(s.tasks.map(t=>t.id)).size!==s.tasks.length||new Set(s.rewards.map(r=>r.id)).size!==s.rewards.length)return false;
if(!Object.entries(s.progress).every(([k,v])=>k.length<250&&integer(v,0,9999)))return false;
if(!s.logs.every(l=>str(l.id,100)&&['task','redeem'].includes(l.kind)&&str(l.ref,100)&&str(l.title,80)&&str(l.period,150)&&str(l.time,50)&&!Number.isNaN(new Date(l.time).valueOf())&&integer(l.amount,-1000000,100000)))return false;
if(s.logs.some(l=>l.kind==='task'&&l.amount<0||l.kind==='redeem'&&l.amount>=0))return false;
return true;
}
let state;let saveBlocked=false;
try{const raw=localStorage.getItem(KEY);state=raw?JSON.parse(raw):initial();if(!valid(state))throw new Error('Invalid data');}catch(e){state=initial();saveBlocked=true;}
let view='daily',filter='all',editing=null,editorMode='task',confirmAction=null,toastTimer;
function persist(){if(saveBlocked){toast('存档异常，已暂停写入。请先在设置中导出原始存档。');return false}try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){toast('存储空间不可用，请导出备份后重试。');return false}}
function transact(action){const before=JSON.stringify(state);action();if(!persist()){state=JSON.parse(before);return false}render();return true}
const period=t=>t.type==='daily'?day():`${state.season.start}_${state.season.end}`;
const progress=t=>Math.min(t.target,state.progress[`${t.id}|${period(t)}`]||0);
const awarded=t=>state.logs.some(l=>l.kind==='task'&&l.ref===t.id&&l.period===period(t));
const done=t=>awarded(t);
const balance=()=>state.logs.reduce((n,l)=>n+l.amount,0);
const earned=()=>state.logs.filter(l=>l.kind==='task').reduce((n,l)=>n+l.amount,0);
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function confirm(title,body,fn){$('#confirm-title').textContent=title;$('#confirm-body').textContent=body;confirmAction=fn;$('#confirm').showModal()}
function render(){
const daily=state.tasks.filter(t=>t.type==='daily');const todayDone=daily.filter(done).length;
$('#stat-today').innerHTML=`${todayDone} <small>/ ${daily.length}</small>`;
$('#stat-points').innerHTML=`${balance().toLocaleString()} <small>PT</small>`;
$('#stat-total').innerHTML=`${state.logs.filter(l=>l.kind==='task').length} <small>次</small>`;
const xp=earned();$('#stat-level').textContent=`LV. ${String(Math.floor(xp/500)+1).padStart(2,'0')}`;$('#level-fill').style.width=`${xp%500/5}%`;$('#level-hint').textContent=`${xp%500} / 500 XP · 累计 ${xp} XP`;
$('#season-name').textContent=state.season.name;$('#season-dates').textContent=`${state.season.start.replaceAll('-','.')} — ${state.season.end.replaceAll('-','.')}`;
const start=new Date(state.season.start+'T00:00:00'),end=new Date(state.season.end+'T23:59:59'),now=new Date();
$('#remaining').textContent=now<start?'赛季即将开始':now>end?'赛季已结束 · 可在设置中调整':`剩余 ${Math.ceil((end-now)/86400000)} 天`;
$('#season-time').style.width=`${Math.max(0,Math.min(100,(now-start)/(end-start)*100))}%`;
const titles={daily:['每日任务','DAILY OPERATIONS','今日行动'],season:['赛季目标','SEASON OBJECTIVES','长期作战'],rewards:['奖励仓库','REWARD INVENTORY','奖励仓库'],history:['行动记录','OPERATION LOG','行动记录']};
const title=titles[view];$('#breadcrumb').textContent=title[0];$('#view-en').textContent=title[1];$('#view-title').textContent=title[2];
$('#add').hidden=view==='history';$('#add').textContent=view==='rewards'?'＋ 新建奖励':'＋ 新建任务';
$('#filters').style.display=['daily','season'].includes(view)?'flex':'none';$('#toolbar-note').textContent=view==='rewards'?'每一份奖励，都由你的行动解锁':view==='history'?'记录你的每一次前进':'按自己的节奏，逐一推进';
if(view==='rewards')renderRewards();else if(view==='history')renderHistory();else renderTasks();
document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
document.querySelectorAll('#filters button').forEach(b=>b.classList.toggle('selected',b.dataset.filter===filter));
}
function renderTasks(){let tasks=state.tasks.filter(t=>t.type===view);$('#task-count').textContent=tasks.length;tasks=tasks.filter(t=>filter==='all'||(filter==='done'?done(t):!done(t)));
if(!tasks.length){$('#content').innerHTML=`<div class="empty"><strong>${filter==='done'?'你的行动记录，从第一步开始':filter==='pending'?'当前任务已全部完成':'还没有行动任务'}</strong><p>${filter==='all'?'点击「新建任务」，给自己一个清晰的小目标。':filter==='pending'?'去奖励仓库，给自己一点奖励吧。':'选择一个小目标，完成后它就会出现在这里。'}</p></div>`;return}
$('#content').innerHTML=tasks.map((t,i)=>{const finished=done(t),p=finished?t.target:progress(t);return `<article class="task ${finished?'done':''}"><div class="task-number">${finished?'✓':String(i+1).padStart(2,'0')}</div><div><div class="task-meta"><span class="tag">${esc(t.category)}</span><span>${t.type==='daily'?'每日重置':'赛季累计'} · ${t.target} ${esc(t.unit)}</span><span class="inline-points">◇ ${t.points} PT</span></div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p>${t.target>1?`<div class="task-progress"><div class="bar"><span style="width:${p/t.target*100}%"></span></div>${p} / ${t.target} ${esc(t.unit)}</div>`:''}</div><div class="task-reward"><span>行动奖励</span><strong>◇ ${t.points} <small>PT</small></strong></div><div class="task-actions">${finished?'<span class="completed">✓ 已完成 · 积分已到账</span>':`<button class="secondary" data-action="advance" data-id="${esc(t.id)}">${t.target>1?'＋ 推进一次':'完成任务 ↗'}<span class="mobile-points">${t.target===1?'':''}</span></button>`}<div class="edit-controls"><button data-action="edit-task" data-id="${esc(t.id)}">编辑</button><button data-action="delete-task" data-id="${esc(t.id)}">删除</button></div></div></article>`}).join('');
}
function renderRewards(){if(!state.rewards.length){$('#content').innerHTML='<div class="empty"><strong>给自己设一个值得期待的奖励</strong><p>点击「新建奖励」，由你决定努力的价值。</p></div>';return}
$('#content').innerHTML='<div class="rewards-grid">'+state.rewards.map(r=>`<article class="reward"><div class="eyebrow">PERSONAL SUPPLY</div><div class="reward-art"><span>${esc(r.icon)}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><div class="reward-bottom"><strong>◇ ${r.cost} <small>PT</small></strong><button class="secondary" data-action="redeem" data-id="${esc(r.id)}" ${balance()<r.cost?'disabled':''}>${balance()<r.cost?'积分不足':'兑换奖励 ↗'}</button></div><div class="edit-controls"><button data-action="edit-reward" data-id="${esc(r.id)}">编辑</button><button data-action="delete-reward" data-id="${esc(r.id)}">删除</button></div></article>`).join('')+'</div>';
}
function renderHistory(){if(!state.logs.length){$('#content').innerHTML='<div class="empty"><strong>新的行动，等待开始</strong><p>完成任务和兑换奖励后，记录会保存在这里。</p></div>';return}
$('#content').innerHTML=state.logs.slice().reverse().map(l=>`<div class="log"><span class="log-icon">${l.kind==='task'?'✓':'◇'}</span><div><strong>${l.kind==='task'?'完成任务':'兑换奖励'} · ${esc(l.title)}</strong><small>${esc(new Date(l.time).toLocaleString('zh-CN',{hour12:false}))}</small></div><span class="amount ${l.amount<0?'spent':''}">${l.amount>0?'+':''}${l.amount} <small style="display:inline">PT</small></span></div>`).join('');
}
function field(label,name,value='',type='text',extra=''){return `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function textField(label,name,value=''){return `<label class="field">${label}<textarea name="${name}" maxlength="500">${esc(value)}</textarea></label>`}
function openEditor(mode,id){editorMode=mode;editing=id||null;let html='';const isTask=mode==='task';
if(isTask){const t=state.tasks.find(t=>t.id===id)||{title:'',description:'',type:view==='season'?'season':'daily',target:1,unit:'次',points:100,category:'个人行动'};
$('#dialog-title').textContent=id?'编辑任务':'新建任务';$('#dialog-en').textContent='MISSION BRIEFING';
html=field('任务名称','title',t.title,'text','required maxlength="80" placeholder="例如：今天散步 20 分钟"')+textField('行动说明（选填）','description',t.description)+`<div class="field-row"><label class="field">任务周期<select name="type"><option value="daily" ${t.type==='daily'?'selected':''}>每日任务 · 每天重置</option><option value="season" ${t.type==='season'?'selected':''}>赛季目标 · 累计推进</option></select></label>${field('任务分类','category',t.category,'text','required maxlength="30"')}</div><div class="field-row" style="margin-top:16px">${field('目标次数','target',t.target,'number','required min="1" max="9999" step="1"')}${field('计量单位','unit',t.unit,'text','required maxlength="10"')}</div>`+field('完成奖励 / PT','points',t.points,'number','required min="0" max="100000" step="1"')+'<p class="hint">点击推进直到目标完成，一次性领取积分。每日任务在本地时间零点重新开始。编辑会保留本周期已领取的奖励，修改后的积分用于之后的周期。</p>';
}else if(mode==='reward'){const r=state.rewards.find(r=>r.id===id)||{title:'',description:'',cost:200,icon:'◇'};$('#dialog-title').textContent=id?'编辑奖励':'新建奖励';$('#dialog-en').textContent='SUPPLY CONFIGURATION';html=field('奖励名称','title',r.title,'text','required maxlength="80" placeholder="例如：一顿喜欢的大餐"')+textField('奖励说明（选填）','description',r.description)+`<div class="field-row">${field('所需积分 / PT','cost',r.cost,'number','required min="1" max="1000000" step="1"')}${field('奖励符号','icon',r.icon,'text','required maxlength="10"')}</div><p class="hint">每次兑换都会扣除积分并记入行动记录，同一奖励可以重复兑换。</p>`;
}else{$('#dialog-title').textContent='数据与赛季设置';$('#dialog-en').textContent='TERMINAL SETTINGS';html=field('赛季名称','name',state.season.name,'text','required maxlength="60"')+`<div class="field-row">${field('开始日期','start',state.season.start,'date','required')}${field('结束日期','end',state.season.end,'date','required')}</div><p class="hint">修改赛季日期会开启一个新的赛季进度，历史积分和记录保留。结束日期不会自动关闭任务。</p><p class="hint">数据仅保存在当前浏览器，不跨设备同步。清理浏览器数据可能丢失记录，建议定期导出备份。初始任务和奖励都是可编辑的示例。</p><div class="data-actions"><button type="button" class="secondary" id="export">导出备份 ↓</button><button type="button" class="secondary" id="import">导入备份 ↑</button><button type="button" class="secondary" id="source">下载源代码 ↓</button></div>${saveBlocked?'<p class="hint" style="color:#e6bd7e">检测到无法读取的存档，已暂停写入以保护原数据。请先导出原始存档，再导入有效备份，或清空存档重新开始。</p><button type="button" class="secondary" id="export-raw">导出原始存档</button>':''}<div class="data-actions"><button type="button" class="text-button" id="reset">清空全部数据</button></div>`;}
$('#form-fields').innerHTML=html;$('#editor').showModal();}
$('#edit-form').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));for(const k in data)data[k]=String(data[k]).trim();
if(editorMode==='task'&&(!data.title||!data.category||!data.unit)||editorMode==='reward'&&(!data.title||!data.icon)||editorMode==='settings'&&!data.name){toast('请填写完整，内容不能只包含空格。');return}
if(editorMode==='settings'&&data.end<data.start){toast('结束日期不能早于开始日期。');return}
const save=()=>{const ok=transact(()=>{if(editorMode==='task'){const old=state.tasks.find(t=>t.id===editing);const t={id:editing||uid(),title:data.title,description:data.description,type:data.type,category:data.category,target:Number(data.target),unit:data.unit,points:Number(data.points),created:old?.created||day()};if(old)Object.assign(old,t);else state.tasks.push(t);const key=`${t.id}|${period(t)}`;if(!awarded(t)&&progress(t)>=t.target){state.logs.push({id:uid(),kind:'task',ref:t.id,title:t.title,amount:t.points,period:period(t),time:new Date().toISOString()})}}
else if(editorMode==='reward'){const old=state.rewards.find(r=>r.id===editing);const r={id:editing||uid(),title:data.title,description:data.description,cost:Number(data.cost),icon:data.icon};if(old)Object.assign(old,r);else state.rewards.push(r)}else state.season={name:data.name,start:data.start,end:data.end};});if(ok){$('#editor').close();toast('设置已保存')}};
if(editorMode==='settings'&&(data.start!==state.season.start||data.end!==state.season.end)){confirm('更新赛季日期？','赛季目标将按新的日期重新累计，之前的积分和行动记录会保留。',save)}else save();});
function advance(id){const t=state.tasks.find(t=>t.id===id);if(!t||done(t))return;let completed=false;const ok=transact(()=>{const key=`${t.id}|${period(t)}`;state.progress[key]=progress(t)+1;if(state.progress[key]>=t.target){completed=true;state.logs.push({id:uid(),kind:'task',ref:t.id,title:t.title,amount:t.points,period:period(t),time:new Date().toISOString()})}});if(ok)toast(completed?`任务完成！＋${t.points} PT，做得好。`:`进度已更新：${progress(t)} / ${t.target} ${t.unit}`)}
$('#content').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id,action=b.dataset.action;if(action==='advance')advance(id);else if(action==='edit-task')openEditor('task',id);else if(action==='edit-reward')openEditor('reward',id);else if(action.startsWith('delete-')){const type=action==='delete-task'?'tasks':'rewards';const item=state[type].find(x=>x.id===id);if(!item)return;confirm('删除这项'+(type==='tasks'?'任务':'奖励')+'？',`「${item.title}」将从列表中移除，历史积分与行动记录会保留。`,()=>{if(transact(()=>state[type]=state[type].filter(x=>x.id!==id)))toast('已删除')})}else if(action==='redeem'){const r=state.rewards.find(r=>r.id===id);if(!r)return;confirm('领取你的奖励',`使用 ${r.cost} PT 兑换「${r.title}」？确认后会扣除积分，请记得兑现对自己的奖励。`,()=>{if(balance()<r.cost){toast('积分不足，再完成一个小目标吧。');return}if(transact(()=>state.logs.push({id:uid(),kind:'redeem',ref:r.id,title:r.title,amount:-r.cost,period:day(),time:new Date().toISOString()})))toast('兑换成功，去享受你的奖励吧！')})}});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;filter='all';render()}});$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;render()}});
$('#add').onclick=()=>openEditor(view==='rewards'?'reward':'task');$('#settings').onclick=()=>openEditor('settings');
const mobileSettings=document.createElement('button');mobileSettings.className='mobile-settings';mobileSettings.textContent='⚙';mobileSettings.setAttribute('aria-label','数据与赛季设置');mobileSettings.onclick=()=>openEditor('settings');$('header>span').appendChild(mobileSettings);
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$('#editor').close();for(const b of document.querySelectorAll('[data-confirm-close]'))b.onclick=()=>$('#confirm').close();$('#confirm-ok').onclick=()=>{const fn=confirmAction;confirmAction=null;$('#confirm').close();fn?.()};
function download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000)}
$('#form-fields').addEventListener('click',e=>{if(e.target.id==='export')download(`行动终端备份-${day()}.json`,JSON.stringify(state,null,2));if(e.target.id==='export-raw'){try{download(`原始存档-${day()}.txt`,localStorage.getItem(KEY)||'','text/plain')}catch(err){toast('浏览器不允许读取存档。')}}if(e.target.id==='import')$('#import-file').click();if(e.target.id==='source'){const a=document.createElement('a');a.href='operation-life-source.zip';a.download='operation-life-source.zip';a.click()}if(e.target.id==='reset')confirm('清空全部数据？','所有任务、奖励、积分和记录都会被永久清除。建议先导出备份。清空后会得到空白任务列表。',()=>{const previous=state,blocked=saveBlocked;saveBlocked=false;state=initial();state.tasks=[];state.rewards=[];if(persist()){$('#editor').close();render();toast('已清空，可以开始新的行动了')}else{state=previous;saveBlocked=blocked}})});
$('#import-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>10*1024*1024){toast('备份文件过大，请选择小于 10 MB 的文件。');return}try{const imported=JSON.parse(await file.text());if(!valid(imported))throw new Error('invalid');confirm('导入备份？',`当前数据将被替换为备份中的 ${imported.tasks.length} 个任务、${imported.rewards.length} 个奖励和 ${imported.logs.length} 条记录。建议先导出当前数据。`,()=>{const prev=state,blocked=saveBlocked;state=imported;saveBlocked=false;if(persist()){$('#editor').close();render();toast('备份已恢复')}else{state=prev;saveBlocked=blocked}})}catch(err){toast('无法导入：请选择本工具导出的有效 JSON 备份。')}};
// Refresh the current date when the tab returns or local midnight passes.
let renderedDay=day();function tick(){const now=new Date();$('#clock').textContent=`${day().replaceAll('-','.')} / ${now.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}`;if(day()!==renderedDay){renderedDay=day();render()}}
setInterval(tick,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();render()}});
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{if(!e.newValue){toast('其他窗口已移除存档，请刷新页面。');saveBlocked=true;return}const incoming=JSON.parse(e.newValue);if(valid(incoming)){state=incoming;saveBlocked=false;render();toast('已同步其他窗口的修改')}else{saveBlocked=true;toast('其他窗口的存档异常，已暂停写入。')}}catch(err){saveBlocked=true;toast('存档异常，已暂停写入。')}});
render();tick();if(!saveBlocked){try{if(!localStorage.getItem(KEY))persist()}catch(e){saveBlocked=true}}if(saveBlocked)setTimeout(()=>toast('存档无法读取，已保护原数据。请打开设置导出检查。'),500);
