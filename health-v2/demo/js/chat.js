// =============================================================
// 智骨科技 · chat.html 页面逻辑（AI 对话）
// =============================================================
(function () {
  var history = [];
  var busy = false;
  var chatBox = null;
  var input = null;
  var sendBtn = null;

  var QUICK_QUESTIONS = [
    "骶骨骨折一般多久能康复？",
    "保守治疗还是手术？",
    "术后多久能下床？",
    "术后怎么预防感染？",
    "多久复查一次？",
    "3D打印内植物有什么优势？"
  ];

  var WELCOME =
    "您好！我是「智骨科技」AI 骨科智慧医疗助手 🦴\n\n" +
    "- 以**骶骨骨折**为例，提供 AI 智慧诊疗、3D打印内植物与康复管理咨询\n" +
    "- 由 DeepSeek 大模型驱动，离线时自动切换内置知识库，演示不受影响\n\n" +
    "您可以直接输入问题，或点击下方快捷提问开始。";

  function createMsg(role) {
    var wrap = document.createElement("div");
    wrap.className = "msg " + (role === "user" ? "user" : "ai");
    var avatarText = role === "user" ? "我" : "AI";
    wrap.innerHTML =
      '<div class="avatar">' + avatarText + "</div>" +
      '<div class="bubble"></div>';
    chatBox.appendChild(wrap);
    scrollBottom();
    return wrap.querySelector(".bubble");
  }

  function scrollBottom() {
    requestAnimationFrame(function () {
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  }

  function appendUser(text) {
    var b = createMsg("user");
    b.textContent = text;
    scrollBottom();
  }

  function typewrite(bubble, text, done) {
    var i = 0;
    var step = 3;
    var md = null;
    var timer = setInterval(function () {
      i += step;
      var partial = text.slice(0, i);
      bubble.innerHTML = '<div class="md">' + renderMarkdown(partial) + "</div>";
      scrollBottom();
      if (i >= text.length) {
        clearInterval(timer);
        bubble.innerHTML = '<div class="md">' + renderMarkdown(text) + "</div>";
        scrollBottom();
        if (done) done();
      }
    }, 18);
  }

  function appendAI(text, instant) {
    var b = createMsg("ai");
    if (instant) {
      b.innerHTML = '<div class="md">' + renderMarkdown(text) + "</div>";
      scrollBottom();
    } else {
      typewrite(b, text);
    }
  }

  function showThinking() {
    var wrap = document.createElement("div");
    wrap.className = "msg ai";
    wrap.id = "thinkingMsg";
    wrap.innerHTML =
      '<div class="avatar">AI</div>' +
      '<div class="bubble"><div class="loading-row" style="padding:2px 0"><span class="spinner"></span>AI 正在思考…</div></div>';
    chatBox.appendChild(wrap);
    scrollBottom();
  }

  function hideThinking() {
    var t = document.getElementById("thinkingMsg");
    if (t) t.remove();
  }

  async function send(q) {
    if (busy || !q || !q.trim()) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "";

    appendUser(q.trim());
    showThinking();

    var msgs = history.concat([{ role: "user", content: q.trim() }]);
    var res = await smartAsk(msgs, function () { return knowledgeFallback(q); });

    hideThinking();
    appendAI(res.text, false);
    history = msgs.concat([{ role: "assistant", content: res.text }]);

    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  function renderChips() {
    var box = document.getElementById("chips");
    if (!box) return;
    QUICK_QUESTIONS.forEach(function (q) {
      var c = document.createElement("button");
      c.className = "chip";
      c.type = "button";
      c.textContent = q;
      c.addEventListener("click", function () { send(q); });
      box.appendChild(c);
    });
  }

  function bindInput() {
    sendBtn.addEventListener("click", function () { send(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });
  }

  async function selfTest() {
    var ok = await apiSelfTest();
    var banner = document.getElementById("apiBanner");
    if (!ok && banner) banner.classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", function () {
    chatBox = document.getElementById("chatBox");
    input = document.getElementById("chatInput");
    sendBtn = document.getElementById("sendBtn");
    if (!chatBox || !input || !sendBtn) return;

    renderChips();
    bindInput();
    appendAI(WELCOME, false);
    selfTest();
  });
})();