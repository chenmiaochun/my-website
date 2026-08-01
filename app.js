import { buildRecommendations, initialState, lifeStatement, memberSpaceAdvice, progress, reflection, sharedFamilyWishes, steps } from "./model.js";

const STORAGE_KEY = "jiaxu-life-v3";
const saved = localStorage.getItem(STORAGE_KEY);
const state = saved ? { ...structuredClone(initialState), ...JSON.parse(saved) } : structuredClone(initialState);
const main = document.querySelector("#main");
const summary = document.querySelector("#summary");
const nav = document.querySelector("#step-nav");

const details = {
  "东西总在临时找位置": "台面、餐桌和沙发边慢慢变成临时区",
  "一家人在客厅却各看各的": "人在一起，交流却没有自然发生",
  "回家能慢下来": "身体和情绪都能从外面的节奏退回来",
  "家人自然待在一起": "不需要刻意组织，也愿意留在同一空间",
  "亲友来喝茶聊天": "重点是面对面交流和随手取用",
  "日常杂物容易停在台面": "不是不爱整理，而是没有顺手的位置",
  "日常容易恢复整洁": "用完以后，十分钟内能回到舒服的状态"
};
const option = (label, group) => `<button class="option ${state[group].includes(label) ? "selected" : ""}" data-option="${group}" data-value="${label}"><b>${state[group].includes(label) ? "✓ " : ""}${label}</b>${details[label] ? `<small>${details[label]}</small>` : ""}</button>`;
const options = (values, group) => `<div class="option-grid">${values.map(value => option(value, group)).join("")}</div>`;
const heard = () => `<div class="heard"><span>我听懂了</span><p>${reflection(state)}</p></div>`;
const writeMore = (field, label, placeholder) => `<label class="story-field"><span>${label}</span><textarea data-text="${field}" placeholder="${placeholder}">${state[field]}</textarea><small>这段话会进入你们家的生活提案，写真实发生过的事就好。</small></label>`;
const familyWishChoices = ["家里更整洁", "有自己的安静角落", "家人有更多交流", "亲友来了更从容", "有自由活动的地方", "东西容易拿也容易放回", "临时工作不被打扰", "行动和起身更轻松"];
const activeMember = () => state.familyMembers.find(member => member.id === state.activeMemberId) || state.familyMembers[0];
const familyEditor = () => {
  const member = activeMember();
  return `<div class="member-tabs" role="tablist">${state.familyMembers.map(item => `<button class="member-tab ${item.id === member.id ? "active" : ""}" data-member-tab="${item.id}">${item.name || item.role}</button>`).join("")}<button class="member-add" data-add-member title="添加家人">＋ 添加家人</button></div><section class="member-editor"><div class="member-fields"><label>怎么称呼<input data-member-name value="${member.name}"></label><label>家庭角色<select data-member-role>${["女主人", "男主人", "孩子", "长辈", "其他家人"].map(role => `<option ${member.role === role ? "selected" : ""}>${role}</option>`).join("")}</select></label>${member.id.startsWith("member-") ? `<button class="member-remove" data-remove-member title="删除这位家人">×</button>` : ""}</div><p class="member-prompt">如果只说自己，你最希望未来的家照顾到什么？</p><div class="option-grid">${familyWishChoices.map(wish => `<button class="option ${member.wishes.includes(wish) ? "selected" : ""}" data-member-wish="${wish}"><b>${member.wishes.includes(wish) ? "✓ " : ""}${wish}</b></button>`).join("")}</div></section>`;
};
const familyProposal = () => {
  const shared = sharedFamilyWishes(state.familyMembers);
  return `<section class="family-proposal"><div class="family-proposal-head"><span>每个人都被看见</span><h3>共同生活，不等于拥有同一个答案</h3><p>${shared.length ? `你们共同在意“${shared.join("、")}”，这些会优先成为公共空间的依据。` : "目前没有完全相同的选择，这并不代表冲突。公共空间要容纳相处，个人空间则要认真保留差异。"}</p></div><div class="member-advice-grid">${state.familyMembers.map(member => `<article class="member-advice"><b>${member.name || member.role}${member.name && member.name !== member.role ? `<small>${member.role}</small>` : ""}</b><p>${member.wishes.join("、") || "还没有说出自己的需要"}</p><span>给设计师的提醒</span><p>${memberSpaceAdvice(member).join("；")}</p></article>`).join("")}</div></section>`;
};

const views = [
  () => `<span class="eyebrow">01 · 从住过的日子开始</span><h1>哪些事情，曾经一遍遍消耗你？</h1><p class="lead">未来的家，不该只比现在更好看。先回忆那些每天都在发生、却很少被认真说出来的小事。</p>${options(["东西总在临时找位置", "一家人在客厅却各看各的", "来客人时总要临时搬东西", "有些空间漂亮但很少使用", "打扫和整理总落在一个人身上", "买过的东西后来发现并不好用"], "pastPain")}${writeMore("pastMoment", "想起一个具体的生活片段", "例如：每天晚饭前，都要先把餐桌上的东西挪走……")}${heard()}<div class="soft-fields"><label>怎么称呼你<input data-field="salutation" value="${state.profile.salutation}"></label><label>你家的房子<select data-field="housing"><option>大平层</option><option>自建房</option><option>其他改善型住宅</option></select></label></div>`,
  () => `<span class="eyebrow">02 · 想象的不是风格</span><h1>推开新家的门，你希望自己变成什么状态？</h1><p class="lead">家不会替我们解决所有问题，但好的环境能让想要的生活更容易发生。</p>${options(["回家能慢下来", "家里看起来清爽", "不必一直提醒家人收拾", "家人自然待在一起", "亲友来了心里从容", "每个人都有自己的安静角落"], "homeFeeling")}${writeMore("desiredMoment", "最想在新家发生的一幕", "例如：晚饭后不用催，大家自然留在客厅聊一会儿……")}${heard()}`,
  () => `<span class="eyebrow">03 · 家不是一个人的答案</span><h1>这一次，让家里每个人都替自己说</h1><p class="lead">可以把页面依次交给女主人、男主人、孩子或长辈。每个人只回答自己的感受，不需要先商量成同一个答案。</p>${familyEditor()}${heard()}<p class="insight-note">相同的答案会成为公共空间的共同依据；不同的答案会被保留，帮助设计师照顾卧室、书房、个人角落和行动习惯。</p>`,
  () => `<span class="eyebrow">04 · 顺着真实的一天</span><h1>从早到晚，这个家真正要接住什么？</h1><p class="lead">不选网上喜欢的画面，只选每周真的会发生的生活。</p>${options(["一家人聊天看电视", "孩子玩耍，大人在旁陪伴", "围着餐桌吃饭做手工", "一个人安静阅读休息", "临时在家办公", "一家人各自做事但仍在一起"], "realScenes")}${writeMore("dailyRhythm", "你们家平日与周末的节奏", "例如：平日晚饭后全家相处，周末常有亲友来坐……")}${heard()}`,
  () => `<span class="eyebrow">05 · 潮汕家庭的待客日常</span><h1>客人来了，你希望家里是什么状态？</h1><p class="lead">待客不是一个单独摆出来的功能，它要和一家人平时的生活自然共存。</p>${options(["亲友来喝茶聊天", "来的人数经常变化", "希望随意坐也不局促", "需要正式围坐用餐", "孩子也会一起活动", "待客用品希望随手拿到"], "hosting")}<div class="single-field"><label>大约多久会有亲友来坐<select data-field="hostingFrequency"><option>每周或每两周</option><option>每月一两次</option><option>节日或重要日子</option><option>很少正式待客</option></select></label></div>${heard()}`,
  () => `<span class="eyebrow">06 · 不是多做柜子</span><h1>什么东西最容易打乱生活的秩序？</h1><p class="lead">真正有效的收纳，是让每件常用物品顺着动作找到位置，让全家都愿意用完放回去。</p>${options(["孩子用品增长很快", "茶具和待客用品常用", "日常杂物容易停在台面", "囤货和快递没有固定位置", "书籍文件分散各处", "行李与低频用品占用日常空间"], "objects")}<div class="section-label">什么样的秩序更适合你们家？</div>${options(["常用物品要伸手可取", "最好全家都知道放回哪里", "隐藏起来比展示更重要", "少量喜欢的物品值得展示", "希望十分钟内恢复整洁", "不想为了整齐增加复杂动作"], "orderHabit")}${heard()}`,
  () => `<span class="eyebrow">07 · 家会和人一起变化</span><h1>三五年以后，谁会改变？生活会多出什么？</h1><p class="lead">提前考虑不等于提前购买。我们只为变化留下余地，不把还没发生的事变成今天的负担。</p>${options(["准备迎接孩子或二孩", "孩子从玩耍进入学习阶段", "父母偶尔留宿", "父母以后可能同住", "居家办公会变多", "家庭物品会持续增加"], "futureChanges")}${heard()}`,
  () => `<span class="eyebrow">08 · 好的家也需要做减法</span><h1>什么最重要？什么其实不必拥有？</h1><p class="lead">最多选择三项最重要的生活，再明确两件愿意放下的东西。真正的需要，在取舍以后才会清楚。</p><div class="section-label">最舍不得放弃的三件事</div>${options(["一家人愿意共处", "潮汕待客更从容", "日常容易恢复整洁", "孩子有自由活动空间", "每个人都有安静角落", "空间保持通透", "容易打理和长期使用"], "priorities")}<p class="choice-count">已选择 ${state.priorities.length} / 3 项</p><div class="section-label">愿意明确放下</div>${options(["只为拍照好看的摆设", "低频使用却长期占地方的功能", "为了完整而购买的整套家具", "需要频繁维护的复杂设计", "网上流行但不符合习惯的布局"], "notNeeded")}${writeMore("concerns", "还有什么担心，希望未来的自己不会后悔？", "例如：希望空间耐住几年变化，不要刚入住好看，住久了又乱……")}${heard()}`,
  () => { const recommendations = buildRecommendations(state); return `<span class="eyebrow">09 · 你们家的生活提案</span><h1>这份提案，不替你决定，而是帮你守住真正重要的生活</h1><p class="lead">它将成为后续空间规划、收纳、家具和购买决策的共同依据。任何方案都应该先回应这些生活，再谈形式。</p><article class="proposal detailed-proposal"><div class="proposal-head"><div><span>JIA XU · LIFE PROPOSAL</span><h2>${state.profile.salutation}家的生活提案</h2></div><div class="proposal-brand"><img src="shangpinju-mark.jpg" alt="" /><span>尚品居原创家具</span></div></div><p class="proposal-statement">“${lifeStatement(state)}”</p><section class="story-compare"><div><span>想离开的过去</span><p>${state.pastMoment}</p></div><div><span>想走进的生活</span><p>${state.desiredMoment}</p></div></section>${familyProposal()}<div class="recommendation-list">${recommendations.map((item, index) => `<section class="recommendation"><i>0${index + 1}</i><div><h3>${item.title}</h3><p class="observation">我们看到：${item.observation}</p><p><b>生活建议：</b>${item.advice}</p></div></section>`).join("")}</div><section class="proposal-concern"><span>希望未来不会后悔的事</span><p>${state.concerns}</p></section><footer class="proposal-footer"><b>接下来怎么使用这份提案</b><p>先与家人一起确认它是否说中了你们的生活；再把它交给设计师和销售。后续每个建议都要说明回应了哪一条生活需要，不能只因为流行、好看或方便销售。</p></footer></article><div class="promise"><b>尚品居的服务立场</b><span>不替你制造需求，不用专业术语压过真实感受，只把真正适合你们家的生活说明白。</span></div>`; }
];

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function renderSummary() {
  summary.innerHTML = `<span class="summary-kicker">边聊边理解</span><h3>逐渐清晰的家</h3><p class="summary-quote">${reflection(state)}</p><div class="summary-block"><span>想离开的过去</span><p>${state.pastPain.join("<br>") || "还在慢慢回想"}</p></div><div class="summary-block"><span>想要的感受</span><div class="chips">${state.homeFeeling.map(item => `<i class="chip">${item}</i>`).join("")}</div></div><div class="summary-block"><span>每个人的声音</span>${state.familyMembers.map(member => `<p class="family-summary"><b>${member.name || member.role}</b>${member.wishes.join("、") || "还没选择"}</p>`).join("")}</div><div class="summary-block"><span>真实生活</span><p>${state.realScenes.join("<br>") || "还在一起想象"}</p></div><div class="summary-block"><span>最重要</span><p>${state.priorities.join("<br>") || "还没有做取舍"}</p></div><small class="summary-note">答案可以改变。想起真实的一幕，比选得快更重要。</small>`;
}
function render() {
  const pct = progress(state.step);
  nav.innerHTML = steps.map((label, index) => `<button class="step-btn ${index === state.step ? "active" : index < state.step ? "done" : ""}" data-step="${index}"><i>${index < state.step ? "✓" : index + 1}</i>${label}</button>`).join("");
  main.innerHTML = `<div class="main-content">${views[state.step]()}</div><footer class="actions"><button class="btn" id="back" ${state.step === 0 ? "disabled" : ""}>上一步</button><button class="btn primary" id="next">${state.step === steps.length - 1 ? "重新梳理" : "继续想一想 →"}</button></footer>`;
  document.querySelector("#progress-label").textContent = `第 ${state.step + 1} / ${steps.length} 步`;
  document.querySelector("#progress-percent").textContent = `${pct}%`;
  document.querySelector("#progress-bar").style.width = `${pct}%`;
  document.querySelector("#mobile-title").textContent = steps[state.step];
  document.querySelector("#mobile-percent").textContent = `${pct}%`;
  renderSummary(); bind();
}
function bind() {
  document.querySelector("#back").onclick = () => { state.step--; save(); render(); scrollTo(0, 0); };
  document.querySelector("#next").onclick = () => { state.step = state.step === steps.length - 1 ? 0 : state.step + 1; save(); render(); scrollTo(0, 0); };
  document.querySelectorAll("[data-field]").forEach(element => { if (element.tagName === "SELECT") element.value = state.profile[element.dataset.field] ?? state[element.dataset.field]; element.onchange = () => { if (element.dataset.field in state.profile) state.profile[element.dataset.field] = element.value; else state[element.dataset.field] = element.value; save(); renderSummary(); }; });
  document.querySelectorAll("[data-text]").forEach(element => element.onchange = () => { state[element.dataset.text] = element.value.trim(); save(); renderSummary(); });
  document.querySelectorAll("[data-option]").forEach(element => element.onclick = () => { const group = element.dataset.option; const value = element.dataset.value; const list = state[group]; if (!list.includes(value) && group === "priorities" && list.length >= 3) return; state[group] = list.includes(value) ? list.filter(item => item !== value) : [...list, value]; save(); render(); });
  document.querySelectorAll("[data-member-tab]").forEach(element => element.onclick = () => { state.activeMemberId = element.dataset.memberTab; save(); render(); });
  document.querySelectorAll("[data-member-wish]").forEach(element => element.onclick = () => { const member = activeMember(); const wish = element.dataset.memberWish; member.wishes = member.wishes.includes(wish) ? member.wishes.filter(item => item !== wish) : [...member.wishes, wish]; save(); render(); });
  const memberName = document.querySelector("[data-member-name]");
  if (memberName) memberName.onchange = () => { activeMember().name = memberName.value.trim() || activeMember().role; save(); render(); };
  const memberRole = document.querySelector("[data-member-role]");
  if (memberRole) memberRole.onchange = () => { const member = activeMember(); const oldRole = member.role; member.role = memberRole.value; if (!member.name || member.name === oldRole) member.name = member.role; save(); render(); };
  const addMember = document.querySelector("[data-add-member]");
  if (addMember) addMember.onclick = () => { const id = `member-${Date.now()}`; state.familyMembers.push({ id, role: "其他家人", name: "其他家人", wishes: [] }); state.activeMemberId = id; save(); render(); };
  const removeMember = document.querySelector("[data-remove-member]");
  if (removeMember) removeMember.onclick = () => { state.familyMembers = state.familyMembers.filter(member => member.id !== state.activeMemberId); state.activeMemberId = state.familyMembers[0].id; save(); render(); };
}
nav.onclick = event => { const button = event.target.closest("[data-step]"); if (!button) return; state.step = Number(button.dataset.step); document.querySelector(".sidebar").classList.remove("open"); save(); render(); };
document.querySelector("#mobile-steps").onclick = () => document.querySelector(".sidebar").classList.toggle("open");
render();
