// =============================================================
// 智骨科技 · workflow.html 页面逻辑（六步全流程）
// =============================================================
(function () {
  var WF = {
    step: 1,
    maxVisited: 1,
    images: [],          // { id, name, file, url }
    selectedId: null,
    detectReport: null,
    detectOnline: true,
    treatmentText: "",
    treatmentOnline: true,
    recoveryText: "",
    recoveryOnline: true
  };
  window.WF = WF;

  var GALLERY_ITEMS = [
    { src: "images/implant-sem.png", caption: "3D打印多孔钛合金内植物 SEM 显微结构" },
    { src: "images/microct-3d.png", caption: "Micro-CT 三维重构 · TPMS 多孔架构" },
    { src: "images/stress-distribution.png", caption: "有限元应力分布分析（0~5MPa 安全区间）" },
    { src: "images/bone-growth.png", caption: "骨长入仿真验证 · 骨长入提升 42%" },
    { src: "images/bone-result.png", caption: "术后骨愈合随访影像" },
    { src: "images/pelvic-recon.png", caption: "骨盆三维重建与术前规划" },
    { src: "images/mao-coating.png", caption: "MAO 微弧氧化钙磷涂层表面形貌" },
    { src: "images/ct-sample-1.png", caption: "骶骨 CT 断层影像示例" },
    { src: "images/ct-sample-2.png", caption: "骨盆 X 线平片示例" },
    { src: "images/model-3d.png", caption: "定制化3D打印内植物三维模型" }
  ];

  // ---------- 步骤切换 ----------
  function gotoStep(n) {
    if (n < 1 || n > 6) return;
    WF.step = n;
    WF.maxVisited = Math.max(WF.maxVisited, n);
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("show", parseInt(p.dataset.step, 10) === n);
    });
    document.querySelectorAll(".step-btn").forEach(function (b) {
      var s = parseInt(b.dataset.step, 10);
      b.classList.toggle("active", s === n);
      b.classList.toggle("done", s < WF.maxVisited && s !== n);
      var num = b.querySelector(".num");
      if (s < WF.maxVisited && s !== n) {
        num.textContent = "✓";
        if (!num.dataset.orig) num.dataset.orig = "0" + s;
      } else {
        num.textContent = num.dataset.orig || ("0" + s);
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.gotoStep = gotoStep;

  // ---------- 第 1 步：影像选择与上传 ----------
  function initImages() {
    WF.images = CT_SAMPLES.map(function (s) {
      return { id: s.id, name: s.name, file: s.file, url: s.url };
    });
    WF.selectedId = WF.images[0].id;
    renderImages();
  }

  function renderImages() {
    var grid = document.getElementById("ctGrid");
    if (!grid) return;
    grid.innerHTML = "";
    WF.images.forEach(function (img, i) {
      var item = document.createElement("div");
      item.className = "ct-item" + (WF.selectedId === img.id ? " selected" : "");
      item.tabIndex = 0;
      item.innerHTML =
        '<div class="ct-img"><img src="' + img.url + '" alt="' + img.name + '"></div>' +
        '<div class="ct-name"><span>' + img.name + '</span><span class="file">' + img.file + '</span></div>';
      item.addEventListener("click", function () {
        WF.selectedId = img.id;
        renderImages();
        renderDetectImage();
      });
      grid.appendChild(item);
    });
  }

  function getSelected() {
    return WF.images.find(function (x) { return x.id === WF.selectedId; }) || WF.images[0];
  }

  function bindUpload() {
    var btn = document.getElementById("btnUploadData");
    var input = document.getElementById("fileData");
    if (!btn || !input) return;
    btn.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) {
        showToast("请选择图片文件（CT / X 光截图）");
        input.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var id = "up_" + Date.now();
        WF.images.unshift({ id: id, name: "本机上传影像：" + f.name, file: f.name, url: reader.result });
        WF.selectedId = id;
        renderImages();
        renderDetectImage();
        showToast("已插入并选中：" + f.name);
        input.value = "";
      };
      reader.readAsDataURL(f);
    });
  }

  // ---------- 第 2 步：AI 检测 ----------
  function renderDetectImage() {
    var img = document.getElementById("detectImg");
    var name = document.getElementById("detectName");
    if (!img) return;
    var sel = getSelected();
    img.src = sel.url;
    img.alt = sel.name;
    name.textContent = "当前影像：" + sel.file;
  }

  var detecting = false;
  function bindDetect() {
    var btn = document.getElementById("btnDetect");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      if (detecting) return;
      detecting = true;
      btn.disabled = true;
      var out = document.getElementById("detectReport");
      out.innerHTML = '<div class="loading-row"><span class="spinner"></span>AI 视觉模型正在分析影像，请稍候…</div>';
      var notice = document.getElementById("detectNotice");
      notice.classList.remove("show");

      var sel = getSelected();
      var prompt = "你是一名骨科影像 AI 助手。请分析这张骶骨/骨盆区域的医学影像，按以下结构输出（使用简体中文、分点呈现）：\n" +
        "1. 诊断结论（一句话）\n2. 置信度（百分比数字）\n3. 影像所见（3~5 条）\n4. 下一步建议（含治疗方向）";
      var text = "";
      var online = true;
      try {
        var src = sel.url;
        if (src.indexOf("data:") !== 0) {
          var c = await fetch(src);
          var b = await c.blob();
          src = await new Promise(function (resolve) {
            var r = new FileReader();
            r.onload = function () { resolve(r.result); };
            r.readAsDataURL(b);
          });
        }
        try {
          text = await callVision(src, prompt);
        } catch (e) { throw e; }
      } catch (e) {
        text = "";
        online = false;
      }

      if (!text) {
        var fb = detectFallback(sel.file);
        WF.detectReport = fb;
        WF.detectOnline = false;
        notice.classList.add("show");
        renderDetectReport(fb, false);
      } else {
        WF.detectOnline = true;
        WF.detectReport = { markdown: text };
        renderDetectMarkdown(text);
      }
      detecting = false;
      btn.disabled = false;
    });
  }

  function renderDetectMarkdown(text) {
    var out = document.getElementById("detectReport");
    out.innerHTML = '<div class="md">' + renderMarkdown(text) + "</div>";
  }

  function renderDetectReport(r, online) {
    var out = document.getElementById("detectReport");
    var html = '<div class="md">';
    html += "<h4>诊断结论</h4><p>" + escapeHtml(r.conclusion) + "</p>";
    html += "<h4>置信度</h4><p><strong>" + r.confidence + "%</strong></p>";
    html += '<div class="conf-bar"><i style="width:' + r.confidence + '%"></i></div>';
    html += "<h4>影像所见</h4><ul>";
    r.findings.forEach(function (f) { html += "<li>" + escapeHtml(f) + "</li>"; });
    html += "</ul><h4>下一步建议</h4><p>" + escapeHtml(r.advice) + "</p></div>";
    out.innerHTML = html;
  }

  // ---------- 第 3 步：参数表 + Excel + 3D 打印机上传 ----------
  function renderParamTable() {
    var tbody = document.getElementById("paramBody");
    if (!tbody || tbody.children.length) return;
    var lastCat = "";
    IMPLANT_DATA.forEach(function (r) {
      if (r.cat !== lastCat) {
        lastCat = r.cat;
        var g = document.createElement("tr");
        g.className = "group";
        g.innerHTML = '<td colspan="3">▸ ' + r.cat + "</td>";
        tbody.appendChild(g);
      }
      var tr = document.createElement("tr");
      tr.innerHTML = "<td class='k'>" + escapeHtml(r.name) + "</td><td class='v'>" + escapeHtml(r.value) + "</td><td class='cat'>" + escapeHtml(r.cat) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function bindExcel() {
    var btn = document.getElementById("btnExcel");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (typeof XLSX === "undefined") {
        showToast("离线表格组件未加载，请刷新页面");
        return;
      }
      downloadImplantExcel();
      showToast("Excel 已开始下载：智骨科技-3D打印内植物数据.xlsx");
    });
  }

  function bindPrinterUpload() {
    ["btnPrinter1", "btnPrinter2"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", function () { document.getElementById("filePrinter").click(); });
    });
    var input = document.getElementById("filePrinter");
    if (!input) return;
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      showToast("已发送至 3D 打印机：" + f.name);
      input.value = "";
    });
  }

  // ---------- 第 4 步：3D 模型灯箱 ----------
  function bindModel() {
    var box = document.getElementById("modelImgBox");
    if (!box) return;
    box.addEventListener("click", function () {
      openGallery([{ src: "images/model-3d.png", caption: "定制化3D打印内植物三维模型" }], 0);
    });
  }

  // ---------- 第 5 步：诊疗方案 ----------
  var generatingTx = false;
  function bindTreatment() {
    var btn = document.getElementById("btnTreat");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      if (generatingTx) return;
      generatingTx = true;
      btn.disabled = true;
      var out = document.getElementById("treatReport");
      out.innerHTML = '<div class="loading-row"><span class="spinner"></span>AI 正在生成诊疗方案，请稍候…</div>';
      document.getElementById("treatNotice").classList.remove("show");

      var prompt = "请为以下病例生成完整诊疗方案：55 岁男性，高处坠落伤致骶骨骨折，Denis II 区（累及骶孔），双能 X 线骨密度 T 值 -1.8（骨量减少）。\n" +
        "要求按四部分输出：一、患者评估；二、保守 vs 手术决策（给出明确结论）；三、手术方案（含 3D打印多孔钛接骨板 + 骶髂螺钉、术中光功能化 10~15min、骨界面应力 0~5MPa 等要素）；四、术后管理。使用简体中文分点呈现。";
      var res = await smartAsk([{ role: "user", content: prompt }], treatmentFallback, { maxTokens: 2200 });
      WF.treatmentText = res.text;
      WF.treatmentOnline = res.online;
      if (!res.online) document.getElementById("treatNotice").classList.add("show");
      out.innerHTML = '<div class="md">' + renderMarkdown(res.text) + "</div>";
      generatingTx = false;
      btn.disabled = false;
    });
  }

  // ---------- 第 6 步：恢复计划 ----------
  function bindRecovery() {

    document.querySelectorAll('#recoveryOpts .opt').forEach(function (o) {
      o.addEventListener("click", function () {
        var group = o.closest(".opt-group");
        group.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("selected"); });
        o.classList.add("selected");
      });
    });

    var btn = document.getElementById("btnRecovery");
    if (!btn) return;
    var generating = false;
    btn.addEventListener("click", async function () {
      if (generating) return;
      generating = true;
      btn.disabled = true;
      var out = document.getElementById("recoveryReport");
      out.innerHTML = '<div class="loading-row"><span class="spinner"></span>AI 正在生成恢复计划，请稍候…</div>';
      document.getElementById("recoveryNotice").classList.remove("show");

      var method = document.querySelector('#optMethod .opt.selected').dataset.value;
      var timing = document.querySelector('#optTiming .opt.selected').dataset.value;
      var age = parseInt(document.getElementById("ageInput").value, 10) || 55;

      var prompt = "请为以下患者生成骶骨骨折恢复计划：治疗方式「" + method + "」；距开始治疗时间「" + timing +
        "」；年龄 " + age + " 岁。\n按「炎症期 / 修复期 / 重塑期 / 康复期」四个阶段输出，每阶段包含：时间范围、康复目标、锻炼建议、饮食营养、注意事项、复查节点。使用简体中文分点呈现。";
      var res = await smartAsk([{ role: "user", content: prompt }], function () {
        return recoveryFallback({ method: method, timing: timing, age: age });
      }, { maxTokens: 2200 });
      WF.recoveryText = res.text;
      WF.recoveryOnline = res.online;
      if (!res.online) document.getElementById("recoveryNotice").classList.add("show");
      renderStageCards(res.text);
      generating = false;
      btn.disabled = false;
    });
  }

  function renderStageCards(text) {
    var grid = document.getElementById("stageGrid");
    var out = document.getElementById("recoveryReport");
    out.innerHTML = '<div class="md">' + renderMarkdown(text) + "</div>";
    grid.innerHTML = "";
    RECOVERY_STAGES.forEach(function (s, i) {
      var c = document.createElement("div");
      c.className = "card stage-card";
      c.innerHTML =
        "<h3><span>第 " + (i + 1) + " 阶段 · " + s.stage + "</span><span class='stage-time'>" + escapeHtml(s.time) + "</span></h3>" +
        "<ul>" +
        "<li><b>康复目标</b>：" + escapeHtml(s.goal) + "</li>" +
        "<li><b>锻炼建议</b>：" + escapeHtml(s.exercise) + "</li>" +
        "<li><b>饮食营养</b>：" + escapeHtml(s.diet) + "</li>" +
        "<li><b>注意事项</b>：" + escapeHtml(s.notes) + "</li>" +
        "<li><b>复查节点</b>：" + escapeHtml(s.review) + "</li>" +
        "</ul>";
      grid.appendChild(c);
    });
  }

  // ---------- 初始化 ----------
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".step-btn").forEach(function (b) {
      b.addEventListener("click", function () { gotoStep(parseInt(b.dataset.step, 10)); });
    });
    document.querySelectorAll("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () { gotoStep(parseInt(b.dataset.next, 10)); });
    });
    document.querySelectorAll("[data-prev]").forEach(function (b) {
      b.addEventListener("click", function () { gotoStep(parseInt(b.dataset.prev, 10)); });
    });

    initImages();
    bindUpload();
    renderDetectImage();
    bindDetect();
    renderParamTable();
    bindExcel();
    bindPrinterUpload();
    bindModel();
    bindTreatment();
    bindRecovery();

    gotoStep(1);
  });
})();