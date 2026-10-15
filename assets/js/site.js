/* KERI 50년 온라인역사관 — 화면 동작 (외부 라이브러리 없음) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, "0"); };

  /* ── 전체 메뉴 ── */
  var menu = $("#menu");
  if (menu) {
    var opener = null;
    var setMenu = function (open) {
      menu.classList.toggle("open", open);
      $$("[aria-controls='menu']").forEach(function (b) { b.setAttribute("aria-expanded", open); });
      document.body.style.overflow = open ? "hidden" : "";
      if (open) { opener = document.activeElement; $(".menu-close", menu).focus(); } else if (opener) opener.focus();
    };
    $$("[aria-controls='menu']").forEach(function (b) { b.addEventListener("click", function () { setMenu(true); }); });
    $(".menu-close", menu).addEventListener("click", function () { setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) setMenu(false); });
  }

  /* ── 메인 카드 회전 (가운데 카드가 선택) ── */
  var track = $(".flow-track");
  if (track) {
    var cards = $$(".flow-card", track), n = cards.length, active = 0;
    var dots = $(".flow-dots");
    dots.innerHTML = cards.map(function (c, i) { return '<button type="button" aria-label="' + (i + 1) + '번 메뉴 보기"></button>'; }).join("");
    var dotBtns = $$("button", dots);
    function layout() {
      var w = track.getBoundingClientRect().width;
      var gap = window.innerWidth < 640 ? 0.52 : 0.78;
      cards.forEach(function (c, i) {
        var d = i - active;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        var ad = Math.abs(d);
        c.style.transform = "translateX(" + (d * w * gap) + "px) translateZ(" + (-ad * 180) + "px) rotateY(" + (-d * 32) + "deg) scale(" + (1 - ad * 0.08) + ")";
        c.style.zIndex = 10 - ad;
        c.style.opacity = ad > 2 ? 0 : 1 - ad * 0.18;
        c.style.filter = ad ? "brightness(" + (1 - ad * 0.25) + ")" : "";
        c.setAttribute("aria-current", d === 0);
        c.tabIndex = d === 0 ? 0 : -1;
      });
      dotBtns.forEach(function (b, i) { b.setAttribute("aria-current", i === active); });
    }
    function go(i) { active = (i + n) % n; layout(); }
    cards.forEach(function (c, i) {
      c.addEventListener("click", function (e) { if (i !== active) { e.preventDefault(); go(i); } });
    });
    dotBtns.forEach(function (b, i) { b.addEventListener("click", function () { go(i); }); });
    $(".flow-btn.prev").addEventListener("click", function () { go(active - 1); });
    $(".flow-btn.next").addEventListener("click", function () { go(active + 1); });
    document.addEventListener("keydown", function (e) {
      if (menu && menu.classList.contains("open")) return;
      if (e.key === "ArrowLeft") go(active - 1);
      if (e.key === "ArrowRight") go(active + 1);
    });
    var sx = null;
    track.parentNode.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    track.parentNode.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(active + (dx < 0 ? 1 : -1)); }
    });
    window.addEventListener("resize", layout);
    layout();
  }

  /* ── 키워드 ── */
  var grid = $("#kw-grid");
  if (grid && window.KERI_KEYWORDS) {
    var K = window.KERI_KEYWORDS;
    function render(q) {
      var list = K.filter(function (k) {
        return !q || (k.title + " " + k.body.filter(function (b) { return typeof b === "string"; }).join(" ")).toLowerCase().indexOf(q.toLowerCase()) > -1 || pad(k.no) === q;
      });
      $("#kw-count").innerHTML = "<b>" + list.length + "</b>개 키워드";
      grid.innerHTML = list.map(function (k) {
        return '<li><button class="kw-tile" type="button" data-no="' + k.no + '">' +
          '<img src="' + esc(k.image) + '" alt="" loading="lazy">' +
          (k.body.length ? "" : '<span class="flag">원고 준비 중</span>') +
          '<span class="cap"><span class="num">' + pad(k.no) + '</span><span class="ttl">' + esc(k.title) + "</span></span></button></li>";
      }).join("");
      $("#kw-empty").hidden = list.length > 0;
    }
    render("");
    $("#kw-q").addEventListener("input", function (e) { render(e.target.value.trim()); });
    grid.addEventListener("click", function (e) { var b = e.target.closest(".kw-tile"); if (b) open(+b.dataset.no); });

    var modal = $("#kw-modal"), sheet = $(".sheet", modal), cur = 0;
    function open(no) {
      var k = K[no - 1]; if (!k) return;
      cur = no;
      $(".sheet-hd", modal).style.backgroundImage = "url(" + k.image + ")";
      $(".pill", modal).textContent = "KEYWORD " + pad(no);
      $("#kw-title").textContent = k.title;
      $(".photo-cap", modal).textContent = k.tempImage ? "※ 사진은 임시 이미지입니다." : "사진 · " + k.caption;
      $(".sheet-bd", modal).innerHTML = k.body.length ? k.body.map(function (b) {
        return typeof b === "string" ? "<p>" + esc(b) + "</p>" : '<figure><img src="' + esc(b.img) + '" alt="' + esc(b.cap) + '" loading="lazy"><figcaption>' + esc(b.cap) + "</figcaption></figure>";
      }).join("") : '<div class="pending"><strong>원고 준비 중입니다</strong>이 키워드의 이야기는 역사서 원고가 정리되는 대로 공개됩니다.</div>';
      var p = K[no - 2], nx = K[no];
      var pb = $(".sheet-nav .prev", modal), nb = $(".sheet-nav .next", modal);
      pb.disabled = !p; nb.disabled = !nx;
      if (p) $("strong", pb).textContent = pad(p.no) + " " + p.title;
      if (nx) $("strong", nb).textContent = pad(nx.no) + " " + nx.title;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      sheet.scrollTop = 0;
      $(".sheet-x", modal).focus();
      history.replaceState(null, "", "#k" + pad(no));
    }
    function close() {
      modal.classList.remove("open");
      document.body.style.overflow = "";
      history.replaceState(null, "", location.pathname);
      var t = $('.kw-tile[data-no="' + cur + '"]'); if (t) t.focus();
    }
    $(".sheet-x", modal).addEventListener("click", close);
    $(".dim", modal).addEventListener("click", close);
    $(".sheet-nav .prev", modal).addEventListener("click", function () { open(cur - 1); });
    $(".sheet-nav .next", modal).addEventListener("click", function () { open(cur + 1); });
    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft" && cur > 1) open(cur - 1);
      if (e.key === "ArrowRight" && cur < K.length) open(cur + 1);
      if (e.key === "Tab") {
        var f = $$("button:not([disabled])", sheet), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var m = location.hash.match(/^#k(\d{1,2})$/);
    if (m) open(+m[1]);
  }

  /* ── 탭 (영상) ── */
  $$(".tabs").forEach(function (tabs) {
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("[role='tab']"); if (!b) return;
      $$("[role='tab']", tabs).forEach(function (t) { t.setAttribute("aria-selected", t === b); });
    });
  });
})();

/* 검토용 배포본: PDF를 올리지 않은 경우 안내 (deploy.py가 data-pending을 붙인다) */
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a[data-pending]");
  if (!a) return;
  e.preventDefault();
  alert("검토용 미리보기에서는 역사서 PDF를 제공하지 않습니다.\n정식 오픈 시 바로보기·다운로드가 가능합니다.");
});
