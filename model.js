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
      : "家里人现在想要的并不完全一样，这很正常。谁的需要都不该被一句“大家都这样”带过去。";
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
      title: "这个家最不能丢的三件事",
      observation: `你们最想守住的是${join(state.priorities)}。`,
      advice: "以后不管做哪个房间、买哪件东西，都先问一句：它能不能让这三件事更容易做到？如果不能，就可以先不花这笔钱。"
    },
    {
      title: "家人的相处",
      observation: `你们家平时会有${join(state.realScenes)}。${state.familyMembers.map(member => `${member.name}在意${join(member.wishes)}`).join("；")}。`,
      advice: "大家都想要的，先放进客厅、餐厅这些一起用的地方。只有一个人在意的，也别当成小事，可以在他的房间或常待的角落里想办法。"
    },
    {
      title: "潮汕待客",
      observation: `你们${state.hostingFrequency}会有亲友来坐，平时多半是${join(state.hosting)}。`,
      advice: "先想平时到底来几个人、大家喜欢怎么坐。茶具和常用东西放在伸手能拿到的地方；没客人时，这些安排也不能挡着一家人正常过日子。"
    },
    {
      title: "东西怎么放，家人才愿意收",
      observation: `最容易没地方放的是${join(state.objects)}。`,
      advice: `别先急着算要做多少柜子。常用的放近一点，不常用的再收里面，让${join(state.orderHabit)}。这样收拾家里才不会总落在一个人身上。`
    },
    {
      title: "为未来留余地",
      observation: `未来三五年可能出现${join(state.futureChanges)}。`,
      advice: "现在先把眼前确定要用的做好，同时留一点能挪、能换、能加的地方。未来的东西不用今天就买回来占位置。"
    },
    {
      title: "暂时不做什么",
      observation: `你们已经明确不需要${join(state.notNeeded)}。`,
      advice: "不因为网上一张好看的图，就多做一个平时用不上的东西；也不用为了看起来成套，把家具一次买齐。先住得舒服、用得顺手，以后真需要了再加。"
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
  if (member.wishes.includes("有自己的安静角落")) advice.push("留一个不容易被电视声和走动打扰的地方");
  if (member.wishes.includes("有自由活动的地方")) advice.push("玩的地方要安全、宽松，大人在旁边也看得到");
  if (member.wishes.includes("行动和起身更轻松")) advice.push("少绕路、少高低差，常坐的地方起身要省力");
  if (member.wishes.includes("东西容易拿也容易放回")) advice.push("把常用东西放在本人够得着、用完顺手能放回的地方");
  if (member.wishes.includes("临时工作不被打扰")) advice.push("留一个偶尔能安静做事、声音没那么吵的地方");
  if (member.wishes.includes("亲友来了更从容")) advice.push("客人来了热闹，也别占掉家人休息和做事的地方");
  if (member.wishes.includes("家人有更多交流")) advice.push("坐在自己常待的地方，也能自然看见家人、接得上话");
  if (member.wishes.includes("家里更整洁")) advice.push("少留容易堆东西的台面，每个人的东西都有自己的家");
  return advice.length ? advice : ["先给他留一个位置，住进去以后还能慢慢改成自己喜欢的样子"];
}
