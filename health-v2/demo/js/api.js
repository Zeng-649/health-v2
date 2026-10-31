// =============================================================
// 智骨科技 · API 层
// 代理优先 / 直连兜底 / 超时控制 / 离线回退状态记录
// file:// 模式：仅可选走 cloudProxyUrl 云端代理，否则立即回退内置知识库
// =============================================================

function isFileMode() {
  return location.protocol === "file:";
}

function getProxyUrl() {
  if (location.origin === "http://localhost:5500") return "/api/chat";
  return "http://localhost:5500/api/chat";
}

function fileModeFail() {
  return new Error("file:// 直接打开模式未配置云端代理，已使用内置知识库");
}

async function fetchOnce(url, payload, opts) {
  opts = opts || {};
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || APP_CONFIG.timeoutMs);
  try {
    var headers = { "Content-Type": "application/json" };
    if (opts.withAuth && APP_CONFIG.apiKey && APP_CONFIG.apiKey.indexOf("YOUR_") !== 0) {
      headers["Authorization"] = "Bearer " + APP_CONFIG.apiKey;
    }
    var res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    var text = await res.text();
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data;
    try { data = JSON.parse(text); } catch (e) { throw new Error("响应格式异常"); }
    var msg = data && data.choices && data.choices[0] && data.choices[0].message;
    var content = msg ? (msg.content || "") : "";
    if (!content) throw new Error("AI 未返回内容，推理可能耗尽 token，请重试");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callDeepSeek(messages, opts) {
  opts = opts || {};
  var payload = {
    model: APP_CONFIG.chatModel,
    messages: messages,
    max_tokens: opts.maxTokens || APP_CONFIG.maxTokens,
    stream: false
  };
  if (isFileMode()) {
    if (APP_CONFIG.cloudProxyUrl) {
      return await fetchOnce(APP_CONFIG.cloudProxyUrl, payload, { withAuth: false, timeoutMs: opts.timeoutMs });
    }
    throw fileModeFail();
  }
  try {
    return await fetchOnce(getProxyUrl(), payload, { withAuth: false, timeoutMs: opts.timeoutMs });
  } catch (e) {
    return await fetchOnce(APP_CONFIG.apiUrl, payload, { withAuth: true, timeoutMs: opts.timeoutMs });
  }
}

function compressImage(dataUrl, maxWidth, quality) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      try {
        var nw = img.naturalWidth || maxWidth;
        var nh = img.naturalHeight || maxWidth;
        var scale = Math.min(1, maxWidth / nw);
        var w = Math.round(nw * scale);
        var h = Math.round(nh * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = function () { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

async function callVision(dataUrl, prompt) {
  var compressed = await compressImage(dataUrl, 900, 0.85);
  var payload = {
    model: APP_CONFIG.visionModel,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: compressed } }
      ]
    }],
    max_tokens: 4000,
    stream: false
  };
  if (isFileMode()) {
    if (APP_CONFIG.cloudProxyUrl) {
      return await fetchOnce(APP_CONFIG.cloudProxyUrl, payload, { withAuth: false });
    }
    throw fileModeFail();
  }
  try {
    return await fetchOnce(getProxyUrl(), payload, { withAuth: false });
  } catch (e) {
    return await fetchOnce(APP_CONFIG.apiUrl, payload, { withAuth: true });
  }
}

async function apiSelfTest() {
  try {
    await callDeepSeek([{ role: "user", content: "请用两个字回复：正常" }], { maxTokens: 500 });
    window.API_STATE = { mode: "online", ts: Date.now(), lastError: "" };
    return true;
  } catch (e) {
    window.API_STATE = { mode: "offline", ts: Date.now(), lastError: String((e && e.message) || e) };
    return false;
  }
}

async function smartAsk(userMessages, fallbackFn, opts) {
  opts = opts || {};
  var messages = [{ role: "system", content: buildSystemPrompt(opts.context) }].concat(userMessages);
  try {
    var text = await callDeepSeek(messages, opts);
    window.API_STATE = { mode: "online", ts: Date.now(), lastError: "" };
    return { text: text, online: true };
  } catch (e) {
    window.API_STATE = { mode: "offline", ts: Date.now(), lastError: String((e && e.message) || e) };
    return { text: fallbackFn(), online: false };
  }
}

function buildSystemPrompt(context) {
  var base = "你是「智骨科技」骨科智慧医疗助手，专注于骨科（尤其骶骨骨折）的 AI 智慧诊疗、定制化3D打印多孔钛合金内植物（Ti6Al4V、PBF 激光选区熔化、TPMS 三周期极小曲面、孔隙率 65%±5%、孔径 500±100μm、MAO 钙磷涂层、万古霉素涂层、术中光功能化 10~15 分钟）与术后康复管理。请全程使用简体中文回答，条理清晰、分点呈现，语气专业且易懂。";
  if (context) base += " " + context;
  base += " 本回答仅供演示参考，不构成医疗诊断建议，具体诊疗请以执业医师意见为准。";
  return base;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(text) {
  var lines = escapeHtml(text).split(/\r?\n/);
  var html = "";
  var inList = false;
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (/^[-*•]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += "<li>" + inline(line.replace(/^[-*•]\s+/, "")) + "</li>";
      continue;
    }
    if (/^\d+[.、)]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += "<li>" + inline(line.replace(/^\d+[.、)]\s+/, "")) + "</li>";
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (/^#{1,6}\s+/.test(line)) {
      html += "<h4>" + inline(line.replace(/^#{1,6}\s+/, "")) + "</h4>";
    } else if (line === "") {
      continue;
    } else {
      html += "<p>" + inline(line) + "</p>";
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function showToast(text, ms) {
  var old = document.querySelector(".toast");
  if (old) old.remove();
  var t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = "<span>📄</span><span>" + escapeHtml(text) + "</span>";
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, ms || 3200);
}