export const steps = ["住过的家", "想要的感受", "听见家人", "一天的生活", "家里来客", "物品与秩序", "未来的变化", "重要与不需要", "生活提案"];

export const initialState = {
  step: 0,
  profile: { salutation: "周女士", housing: "自建房", customerGroup: "改善型生活家庭", arrival: "看视频后直接到店" },
  pastPain: ["东西总在临时找位置", "一家人在客厅却各看各的"],
  pastMoment: "晚上回到家，包、孩子的东西和快递都先放在餐桌上，吃饭前又要重新收一次。",
  homeFeeling: ["回家能慢下来", "家人自然待在一起"],
  desiredMoment: "晚饭后不用催，大家会自然留在客厅里聊一会儿。",
  activeMemberId: "hostess",
  familyMembers: [
    { id: "hostess", role: "女主人", name: "女主人", wishes: ["家里更整洁", "有自己的安静角落"] },
    { id: "host", role: "男主人", name: "男主人", wishes: ["亲友来了更从容", "家人有更多交流"] },
    { id: "child", role: "孩子", name: "孩子", wishes: ["有自由活动的地方", "东西容易拿也容易放回"] }
  ],
  realScenes: ["一家人聊天看电视", "孩子玩耍，大人在旁陪伴", "围着餐桌吃饭做手工"],
  dailyRhythm: "平日晚上全家相处，周末常有亲友来坐。",
  hosting: ["亲友来喝茶聊天", "来的人数经常变化", "希望随意坐也不局促"],
  hostingFrequency: "每周或每两周",
  objects: ["孩子用品增长很快", "茶具和待客用品常用", "日常杂物容易停在台面"],
  orderHabit: ["常用物品要伸手可取", "最好全家都知道放回哪里"],
  futureChanges: ["孩子从玩耍进入学习阶段", "父母偶尔留宿"],
  priorities: ["一家人愿意共处", "潮汕待客更从容", "日常容易恢复整洁"],
  notNeeded: ["只为拍照好看的摆设", "低频使用却长期占地方的功能"],
  concerns: "希望空间耐住几年变化，不要刚入住好看，住久了又乱。"
};

export function progress(step) {
  return Math.round(((Math.min(step, steps.length - 1) + 1) / steps.length) * 100);
}

const join = (items, fallback = "还在慢慢想") => items.length ? items.join("、") : fallback;

export function reflection(state) {
  if (state.step === 0) return `真正让人累的，可能不是东西多，而是${join(state.pastPain)}反复发生。`;
  if (state.step === 1) return `你想改善的不是一种装修风格，而是回家以后能${join(state.homeFeeling)}。`;
  if (state.step === 2) {
    const shared = sharedFamilyWishes(state.familyMembers);
    return shared.length
      ? `家人共同在意${join(shared)}，每个人没有说在一起的需要，也会被单独保留下来。`
      : "家人现在没有完全相同的答案，这不是冲突，而是设计需要认真照顾的差异。";
  }
  if (state.step === 3) return `空间应该顺着你们真实的一天，支持${join(state.realScenes)}。`;
  if (state.step === 4) return `对你们家来说，待客不是偶尔摆出来的场面，而是${join(state.hosting)}的日常。`;
  if (state.step === 5) return `整洁不该依赖一个人不停收拾，而要让${join(state.orderHabit)}。`;
  if (state.step === 6) return `现在不必一次买齐，但家可以为${join(state.futureChanges)}留出改变的余地。`;
  if (state.step === 7) return `你们真正想守住的是${join(state.priorities)}，也愿意明确放下${join(state.notNeeded)}。`;
  return lifeStatement(state);
}

export function lifeStatement(state) {
  const feelings = state.homeFeeling.map(item => item === "回家能慢下来" ? "一进门就能慢下来" : item);
  return `${state.profile.salutation}想要的，不是被功能和物品填满的家，而是一个${join(feelings)}的家；亲友来了从容，平常也不必靠一个人反复整理才能维持。`;
}

export function buildRecommendations(state) {
  return [
    {
      title: "这个家的核心",
      observation: `你们最想守住的是${join(state.priorities)}。`,
      advice: "后续每一个空间和购买决定，都先问一句：它是否让这三件事更容易发生？如果没有，就不必急着加入。"
    },
    {
      title: "家人的相处",
      observation: `真实生活包括${join(state.realScenes)}。${state.familyMembers.map(member => `${member.name}在意${join(member.wishes)}`).join("；")}。`,
      advice: "公共空间先回应家人的共同需要；没有形成共识的个人需要，不应被多数人的选择覆盖，而应在个人空间或专属角落里得到回应。"
    },
    {
      title: "潮汕待客",
      observation: `你们${state.hostingFrequency}会有来客，常见状态是${join(state.hosting)}。`,
      advice: "先按真实来客人数和交流方式组织坐、取、放、走的关系。待客用品应靠近使用位置，平时也不能妨碍一家人的日常。"
    },
    {
      title: "物品与秩序",
      observation: `最需要被安顿的是${join(state.objects)}。`,
      advice: `不要只追求柜子数量。先按使用频率决定位置，让${join(state.orderHabit)}，整洁才不会只成为一个人的负担。`
    },
    {
      title: "为未来留余地",
      observation: `未来三五年可能出现${join(state.futureChanges)}。`,
      advice: "优先保留可调整的空间和接口。现在只解决已经明确的需要，把尚未发生的需求留成可能性，而不是提前买成负担。"
    },
    {
      title: "暂时不做什么",
      observation: `你们已经明确不需要${join(state.notNeeded)}。`,
      advice: "不为网络图片、完整套系或低频场景增加项目。先住得舒服、用得顺手，再根据真实生活补充。"
    }
  ];
}

export function sharedFamilyWishes(members) {
  const counts = new Map();
  for (const member of members) {
    for (const wish of new Set(member.wishes)) counts.set(wish, (counts.get(wish) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([wish]) => wish);
}

export function memberSpaceAdvice(member) {
  const advice = [];
  if (member.wishes.includes("有自己的安静角落")) advice.push("保留不被公共活动打断的安静位置");
  if (member.wishes.includes("有自由活动的地方")) advice.push("活动区域要安全、开敞，并保持与照看者的视线联系");
  if (member.wishes.includes("行动和起身更轻松")) advice.push("减少绕行与高差，常用位置要方便坐下和起身");
  if (member.wishes.includes("东西容易拿也容易放回")) advice.push("个人常用品按身高和使用动作安排固定位置");
  if (member.wishes.includes("临时工作不被打扰")) advice.push("预留可短时专注、声音干扰较少的位置");
  if (member.wishes.includes("亲友来了更从容")) advice.push("个人休息区域与待客活动之间保留适当边界");
  if (member.wishes.includes("家人有更多交流")) advice.push("从个人位置能自然参与公共空间的交流");
  if (member.wishes.includes("家里更整洁")) advice.push("减少需要反复整理的开放台面，明确个人物品归属");
  return advice.length ? advice : ["保留一处可以由本人逐渐定义和调整的位置"];
}
