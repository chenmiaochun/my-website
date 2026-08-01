import { initialState, products, progress, proposalSummary, steps, totalStorage, verifiedProductNames } from "./model.js";

const saved = localStorage.getItem("jiaxu-demo-v1");
const state = saved ? { ...structuredClone(initialState), ...JSON.parse(saved) } : structuredClone(initialState);
state.profile = { ...initialState.profile, ...state.profile };
const friendlyProfileValues = {
  "转介绍直接到店": "朋友介绍后到店",
  "自主到店": "路过或自己找到",
  "预约到店（可选）": "提前约好到店",
  "优先改善客厅共处体验": "让一家人更愿意待在客厅",
  "优先改善坐感": "让沙发坐起来更舒服",
  "优先改善收纳秩序": "让东西更好拿、更好放",
  "整体平衡": "都想兼顾"
};
state.profile.arrival = friendlyProfileValues[state.profile.arrival] || state.profile.arrival;
state.profile.priority = friendlyProfileValues[state.profile.priority] || state.profile.priority;
if (state.needs?.R === "空间尺寸与配置待确认") state.needs.R = "沙发怎么摆、走路顺不顺，还要量过空间再看";
if (state.profile.customer && !state.profile.familyStage) state.profile.familyStage = state.profile.customer === "新婚家庭" ? "新婚" : state.profile.customer;
if (!["揭阳", "潮州", "汕头", "普宁"].includes(state.profile.city)) state.profile.city = "揭阳";
if (!verifiedProductNames.includes(state.selectedProduct)) state.selectedProduct = "五福沙发";
const main = document.querySelector("#main");
const summary = document.querySelector("#summary");
const nav = document.querySelector("#step-nav");

const option = (label, group, selected, detail = "") => `<button class="option ${selected ? "selected" : ""}" data-option="${group}" data-value="${label}"><b>${selected ? "✓ " : ""}${label}</b>${detail ? `<small>${detail}</small>` : ""}</button>`;
const options = (values, group, selected, details = {}) => `<div class="option-grid">${values.map(v => option(v, group, selected.includes(v), details[v])).join("")}</div>`;

const views = [
  () => `<span class="eyebrow">01 · 从生活开始</span><h1>先认识一下你们家</h1><p class="lead">不用先想产品，也不用现在说预算。我们先聊聊谁住在家里、平时怎么过日子。</p><div class="field-grid"><div class="field"><label>怎么称呼你</label><input data-field="profile.salutation" value="${state.profile.salutation}"></div><div class="field"><label>房子在哪个城市</label><select data-field="profile.city"><option>揭阳</option><option>潮州</option><option>汕头</option><option>普宁</option></select></div><div class="field"><label>大约多少平方米</label><input type="number" data-field="profile.area" value="${state.profile.area}"></div><div class="field"><label>你的房子是</label><select data-field="profile.housing"><option>大平层</option><option>自建房</option><option>其他改善型住宅</option></select></div><div class="field"><label>现在家里是什么状态</label><select data-field="profile.familyStage"><option>新婚</option><option>成长家庭</option><option>三代同住</option></select></div><div class="field"><label>怎么知道我们的</label><select data-field="profile.arrival"><option>看视频后直接到店</option><option>朋友介绍后到店</option><option>路过或自己找到</option><option>提前约好到店</option></select></div><div class="field"><label>这次最想先改善什么</label><select data-field="profile.priority"><option>让一家人更愿意待在客厅</option><option>让沙发坐起来更舒服</option><option>让东西更好拿、更好放</option><option>都想兼顾</option></select></div></div><p class="privacy-note">户型图、装修进度和预算都可以等聊清楚后再说。</p>`,
  () => `<span class="eyebrow">02 · 家里的人</span><h1>平时谁一起住？</h1><p class="lead">可以多选。家里有哪些人，会影响大家怎么坐、东西放多高、走路顺不顺。</p>${options(["独居", "夫妻", "学龄前儿童", "学龄儿童", "青少年", "偶尔长辈留宿"], "family", state.family, {"夫妻":"两个人每天都在用","学龄儿童":"需要玩耍、阅读和随手收拾","偶尔长辈留宿":"坐下起身和走动要更轻松"})}`,
  () => `<span class="eyebrow">03 · 每天怎么过</span><h1>你家的客餐厅，平时都在做什么？</h1><p class="lead">选出最常发生、最舍不得放弃的三个时刻。</p>${options(["亲子陪伴", "家庭观影", "朋友小聚", "居家办公", "阅读独处", "餐桌手作"], "scene", state.scene, {"亲子陪伴":"孩子在地上玩，大人能随时看见","家庭观影":"一家人舒服地朝同一个方向坐","朋友小聚":"人多时坐得下，也方便聊天"})}`,
  () => `<span class="eyebrow">04 · 东西放哪里</span><h1>客餐厅最容易乱的是什么？</h1><p class="lead">不用量得很准，按你家现在东西的多少加减就可以。</p><div class="counter-list">${[["books","书籍与绘本"],["toys","玩具与手作"],["display","展示与纪念品"],["misc","随手会放的日常杂物"]].map(([key,label]) => `<div class="counter-row"><span>${label}</span><div class="counter"><button data-counter="${key}" data-delta="-1">−</button><b>${state.storage[key]}</b><button data-counter="${key}" data-delta="1">＋</button></div></div>`).join("")}</div><p class="privacy-note">目前大约有 ${totalStorage(state.storage)} 份东西需要找到固定位置，还会为以后新增的物品留一点空间。</p>`,
  () => `<span class="eyebrow">05 · 坐得舒不舒服</span><h1>你们平时喜欢怎么坐？</h1><p class="lead">没有标准答案，按身体最自然、最放松的感觉来选。</p><div class="range-wrap"><div class="range-head"><b>坐下去的感觉</b><span>${["","偏硬","有支撑","刚刚好","柔软","很有包裹感"][state.sitting.softness]}</span></div><input type="range" min="1" max="5" data-range="softness" value="${state.sitting.softness}"><div class="range-labels"><span>稳稳托住</span><span>柔软放松</span></div></div><div class="range-wrap"><div class="range-head"><b>喜欢坐直还是窝进去</b><span>${["","坐得直","比较直","都可以","比较深","喜欢窝进去"][state.sitting.depth]}</span></div><input type="range" min="1" max="5" data-range="depth" value="${state.sitting.depth}"><div class="range-labels"><span>坐直、容易起身</span><span>盘腿、躺靠更放松</span></div></div><div class="section-label">在沙发上最常是什么姿势</div>${options(["端坐交流", "放松倚靠", "盘腿阅读"], "posture", [state.sitting.posture])}`,
  () => `<span class="eyebrow">06 · 说清楚最在意的事</span><h1>如果只能先做好几件事</h1><p class="lead">我们把刚才聊到的生活，整理成四句话。看看是不是你真正想要的。</p>${[["A","一定要做到"],["B","很希望做到"],["C","有了会更好"],["R","还要再确认"]].map(([code,label]) => `<div class="need-row"><span class="need-code" title="${label}">${label}</span><input data-need="${code}" aria-label="${label}" value="${state.needs[code]}"></div>`).join("")}<p class="privacy-note">不合适可以直接改，最后以你和家人的真实感受为准。</p>`,
  () => `<span class="eyebrow">07 · 先坐下来试试</span><h1>这三款，建议按这个顺序试</h1><p class="lead">不是现在就替你决定，而是用三次真实试坐，慢慢找出全家都舒服的选择。</p><div class="product-list">${products.map(p => `<article class="product ${p.tone} ${state.selectedProduct === p.name ? "selected" : ""}" data-product="${p.name}"><div class="product-visual" aria-hidden="true"></div><div><h3>${state.selectedProduct === p.name ? "✓ " : ""}${p.name}</h3><p>${p.reason}</p><div class="specs">${p.specs.map(s=>`<span>${s}</span>`).join("")}</div></div><div class="score"><small>${p.tag}</small></div></article>`).join("")}</div>`,
  () => `<span class="eyebrow">08 · 你家的生活建议</span><h1>先把这个家想清楚</h1><p class="lead">这不是一张催你购买的清单，而是把全家真实的生活放在一起，方便回去慢慢商量。</p><article class="proposal"><div class="proposal-head"><div><span>JIA XU · HOME NOTE</span><h2>${state.profile.salutation}家的客餐厅建议</h2></div><span>本次体验免费</span></div><p class="proposal-statement">“${proposalSummary(state)}”</p><div class="proposal-grid"><section><h4>先试哪一款</h4><p><b>${state.selectedProduct}</b><br>先坐下来感受，不急着当场决定。</p></section><section><h4>这次最想改善</h4><p>${state.profile.priority}<br>先看生活是否真的变得更舒服。</p></section><section><h4>还需要看看</h4><p>聊清楚后再看户型图和装修进度，确认摆放、走路和收纳是否合适。</p></section><section><h4>如果还想深入</h4><p>可以自愿选择更完整的空间建议，再由主理人或设计师一起判断。</p></section></div></article>`,
  () => `<span class="eyebrow">09 · 接下来怎么做</span><h1>今天不用马上做决定</h1><p class="lead">先把真正重要的事情带走。下一步做什么、什么时候联系，都由你们一起定。</p><div class="task-list">${[["全家一起试坐","让经常使用的人都说说真实感受","今天"],["回家看看空间","留意沙发墙、走路位置和最容易乱的地方","回家后"],["收到今天的建议","销售整理成一页，方便家人一起讨论","24 小时内"],["决定要不要继续","想深入时再补户型图、装修进度和其他资料","你决定"]].map(t=>`<div class="task"><span class="task-dot"></span><span><b>${t[0]}</b><p>${t[1]}</p></span><time>${t[2]}</time></div>`).join("")}</div><div class="section-label">今天已经弄清楚</div><div class="chips"><span class="chip">家里谁在使用</span><span class="chip">最重要的生活时刻</span><span class="chip">坐起来喜欢什么感觉</span><span class="chip">下一步由你决定</span></div>`
];

function save() { localStorage.setItem("jiaxu-demo-v1", JSON.stringify(state)); }
function setPath(path, value) { const [group,key] = path.split("."); state[group][key] = value; save(); }
function renderSummary() { summary.innerHTML = `<h3>我们刚刚聊到的家</h3><div class="summary-block"><span>这个家</span><p><b>${state.profile.salutation}</b> · ${state.profile.city}<br>${state.profile.housing} · ${state.profile.familyStage}<br>${state.profile.arrival}</p></div><div class="summary-block"><span>平时谁一起住</span><div class="chips">${state.family.map(x=>`<i class="chip">${x}</i>`).join("")}</div></div><div class="summary-block"><span>最想先改善</span><p>${state.profile.priority}</p></div><div class="summary-block"><span>客餐厅最常做</span><p>${state.scene.join(" / ")}</p></div><div class="summary-block"><span>最在意的事</span><p>${state.needs.A}<br>${state.needs.C}</p></div><div class="summary-block"><span>建议先试</span><p><b>${state.selectedProduct}</b><br>现场坐过、量过空间后再判断</p></div>`; }
function render() {
  const pct = progress(state.step);
  nav.innerHTML = steps.map((s,i)=>`<button class="step-btn ${i===state.step?"active":i<state.step?"done":""}" data-step="${i}"><i>${i<state.step?"✓":i+1}</i>${s}</button>`).join("");
  main.innerHTML = `<div class="main-content">${views[state.step]()}</div><footer class="actions"><button class="btn" id="back" ${state.step===0?"disabled":""}>上一步</button><button class="btn primary" id="next">${state.step===steps.length-1?"重新开始":"确认并继续 →"}</button></footer>`;
  document.querySelector("#progress-label").textContent = `第 ${state.step+1} / ${steps.length} 步`;
  document.querySelector("#progress-percent").textContent = `${pct}%`;
  document.querySelector("#progress-bar").style.width = `${pct}%`;
  document.querySelector("#mobile-title").textContent = steps[state.step]; document.querySelector("#mobile-percent").textContent = `${pct}%`;
  renderSummary(); bind();
}
function bind() {
  document.querySelector("#back").onclick=()=>{state.step--;save();render();scrollTo(0,0)};
  document.querySelector("#next").onclick=()=>{state.step=state.step===steps.length-1?0:state.step+1;save();render();scrollTo(0,0)};
  document.querySelectorAll("[data-field]").forEach(el=>{ if(el.tagName==="SELECT") el.value=el.dataset.field.split(".").reduce((o,k)=>o[k],state); el.onchange=()=>{setPath(el.dataset.field,el.value);renderSummary()}; });
  document.querySelectorAll("[data-option]").forEach(el=>el.onclick=()=>{const g=el.dataset.option,v=el.dataset.value;if(g==="posture")state.sitting.posture=v;else{const list=state[g];state[g]=list.includes(v)?list.filter(x=>x!==v):[...list,v];}save();render()});
  document.querySelectorAll("[data-counter]").forEach(el=>el.onclick=()=>{const k=el.dataset.counter;state.storage[k]=Math.max(0,Math.min(9,state.storage[k]+Number(el.dataset.delta)));save();render()});
  document.querySelectorAll("[data-range]").forEach(el=>el.oninput=()=>{state.sitting[el.dataset.range]=Number(el.value);save();render()});
  document.querySelectorAll("[data-need]").forEach(el=>el.onchange=()=>{state.needs[el.dataset.need]=el.value;save();renderSummary()});
  document.querySelectorAll("[data-product]").forEach(el=>el.onclick=()=>{state.selectedProduct=el.dataset.product;save();render()});
}
nav.onclick=e=>{const btn=e.target.closest("[data-step]");if(btn){state.step=Number(btn.dataset.step);document.querySelector(".sidebar").classList.remove("open");save();render();}};
document.querySelector("#mobile-steps").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");
render();
