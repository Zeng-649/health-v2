// =============================================================
// 智骨科技 · 骨科智慧医疗演示网站
// API 集中配置 —— 换密钥 / 模型 / 接口地址只需改这里
// =============================================================
const APP_CONFIG = {
  // DeepSeek API 密钥（复用旧项目本地密钥，仅限本地演示，请勿提交到公开仓库）
  apiKey: "sk-c01c82881ab2402ca3f5253397ee9457",
  // 接口地址
  apiUrl: "https://api.deepseek.com/chat/completions",
  // 文本生成模型（对话 / 诊疗方案 / 恢复计划）
  chatModel: "deepseek-v4-flash",
  // 视觉模型（CT 影像 AI 检测）
  visionModel: "deepseek-v4-flash-vision-exp",
  // 单次生成最大 token
  maxTokens: 2500,
  // 请求超时时间（毫秒）
  timeoutMs: 45000,
  // 云端代理地址（file:// 直接打开模式可选；用于未来部署 Vercel/Netlify/Cloudflare
  // 的 serverless 代理，留空表示 file:// 模式直接使用内置知识库，不做任何网络请求）
  cloudProxyUrl: ""
};

window.API_STATE = { mode: "unknown", ts: 0, lastError: "" };