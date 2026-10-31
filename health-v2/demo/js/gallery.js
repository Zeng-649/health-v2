// =============================================================
// 智骨科技 · 全局灯箱画廊
// openGallery(items, start)
// items: [{ src, caption }]
// 支持 遮罩/×/ESC 关闭，左右按钮与方向键切换，显示「图注（x/n）」
// =============================================================
(function () {
  var items = [];
  var idx = 0;
  var box = null;

  function ensureBox() {
    if (box) return box;
    box = document.createElement("div");
    box.className = "lightbox";
    box.style.display = "none";
    box.innerHTML =
      '<button class="lb-close" title="关闭">×</button>' +
      '<button class="lb-prev" title="上一张">‹</button>' +
      '<div class="lb-body"><img alt="预览大图"></div>' +
      '<button class="lb-next" title="下一张">›</button>' +
      '<div class="lb-cap"></div>';
    document.body.appendChild(box);

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lb-body")) close();
    });
    box.querySelector(".lb-close").addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", function () { nav(-1); });
    box.querySelector(".lb-next").addEventListener("click", function () { nav(1); });

    document.addEventListener("keydown", function (e) {
      if (!box || box.style.display === "none") return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    });
    return box;
  }

  function render() {
    var img = box.querySelector(".lb-body img");
    var cap = box.querySelector(".lb-cap");
    var item = items[idx];
    img.src = item.src;
    cap.textContent = item.caption + "（" + (idx + 1) + "/" + items.length + "）";
    box.querySelector(".lb-prev").style.display = items.length > 1 ? "flex" : "none";
    box.querySelector(".lb-next").style.display = items.length > 1 ? "flex" : "none";
  }

  function nav(d) {
    if (!items.length) return;
    idx = (idx + d + items.length) % items.length;
    render();
  }

  function close() {
    if (box) box.style.display = "none";
  }

  window.openGallery = function (list, start) {
    items = (list || []).filter(function (x) { return x && x.src; });
    if (!items.length) return;
    idx = Math.min(Math.max(start || 0, 0), items.length - 1);
    ensureBox();
    box.style.display = "flex";
    render();
  };
})();