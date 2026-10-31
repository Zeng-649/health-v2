// =============================================================
// 智骨科技 · 打开模式检测
// file:// 直接打开时在页面顶部显示一条可关闭的浅色提示
// http://localhost 模式不显示任何内容
// =============================================================
(function () {
  if (location.protocol !== "file:") return;

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("modeTip")) return;

    var bar = document.createElement("div");
    bar.id = "modeTip";
    bar.setAttribute("role", "note");

    var text = document.createElement("span");
    text.className = "mode-tip-text";
    text.textContent = "💡 当前为直接打开模式，AI 使用内置知识库；双击『一键打开.vbs』可启用真实 AI";

    var closeBtn = document.createElement("button");
    closeBtn.id = "modeTipClose";
    closeBtn.type = "button";
    closeBtn.title = "关闭提示";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function () {
      bar.remove();
    });

    bar.appendChild(text);
    bar.appendChild(closeBtn);
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();