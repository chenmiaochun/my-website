export const steps = ["认识这个家", "谁住在家里", "客餐厅怎么用", "东西放哪里", "全家怎么坐", "最在意什么", "先试哪几款", "你家的建议", "接下来怎么做"];

export const initialState = {
  step: 0,
  profile: { salutation: "周女士", city: "揭阳", area: "160", housing: "自建房", customerGroup: "改善型生活家庭", familyStage: "新婚", arrival: "看视频后直接到店", priority: "让一家人更愿意待在客厅" },
  family: ["夫妻", "学龄儿童", "偶尔长辈留宿"],
  scene: ["亲子陪伴", "家庭观影", "朋友小聚"],
  storage: { books: 3, toys: 4, display: 2, misc: 3 },
  sitting: { softness: 3, depth: 3, posture: "放松倚靠" },
  needs: { A: "一家人自然聚在一起", B: "玩具与书随手归位", C: "空间看起来清爽有序", R: "沙发怎么摆、走路顺不顺，还要量过空间再看" },
  selectedProduct: "五福沙发"
};

export const products = [
  { name: "五福沙发", score: 94, tag: "建议先试", tone: "green", verification: "pending_verification", reason: "更贴近你家一起看电视、陪孩子和朋友来坐的日常，可以先坐下来感受。", specs: ["现场坐一坐", "量过空间再判断", "配置当面确认"] },
  { name: "心适沙发", score: 88, tag: "一起对比", tone: "ochre", verification: "pending_verification", reason: "可以和第一款一起试，看看全家更喜欢哪种坐下去的感觉。", specs: ["现场坐一坐", "量过空间再判断", "配置当面确认"] },
  { name: "儒气沙发", score: 82, tag: "再试一款", tone: "blue", verification: "pending_verification", reason: "用来比较另一种坐姿和客厅感觉，帮助你们更清楚真正喜欢什么。", specs: ["现场坐一坐", "量过空间再判断", "配置当面确认"] }
];

export const verifiedProductNames = products.map(product => product.name);
export function productDisplayText(product) { return `${product.name} 价格与配置到店核验 ${product.verification}`; }

export function totalStorage(storage) { return Object.values(storage).reduce((sum, value) => sum + Number(value), 0); }
export function progress(step) { return Math.round(((Math.min(step, steps.length - 1) + 1) / steps.length) * 100); }
export function proposalSummary(state) {
  const scenePhrases = { "亲子陪伴": "陪孩子", "家庭观影": "一起看电视和电影", "朋友小聚": "招待亲友", "居家办公": "临时办公", "阅读独处": "安静看书", "餐桌手作": "在餐桌做手工" };
  const dailyLife = state.scene.slice(0, 2).map(scene => scenePhrases[scene] || scene).join("、");
  return `${state.profile.salutation}一家最常在客餐厅${dailyLife}，这次最想让${state.needs.B}。${state.needs.R}。`;
}
