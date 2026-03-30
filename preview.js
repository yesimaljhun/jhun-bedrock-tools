/* ── Template panel live preview ── */
(function () {
  var pvwWrap  = document.getElementById('tmpl-pvw-wrap');
  var pvwCvs   = document.getElementById('tmpl-pvw-img');   /* now a <canvas> */
  var pvwEmpty = document.getElementById('tmpl-pvw-empty');
  var pvwZoom  = document.getElementById('tmpl-pvw-zoom');
  if (!pvwWrap || !pvwCvs) return;

  var zoom = 1;
  var STEP = 0.5, MIN_ZOOM = 0.5, MAX_ZOOM = 32;
  var srcW = 1, srcH = 1;

  function applyZoom() {
    pvwCvs.style.transform = 'scale(' + zoom + ')';
    pvwZoom.textContent = zoom + '×';
  }

  function fitZoom() {
    var ww = pvwWrap.clientWidth  - 4;
    var wh = pvwWrap.clientHeight - 4;
    if (!ww || !wh || !srcW) return;
    var fit = Math.min(ww / srcW, wh / srcH);
    zoom = Math.max(MIN_ZOOM, Math.floor(fit / STEP) * STEP || STEP);
    applyZoom();
  }

  /* Draw an already-decoded <img> element onto the preview canvas.
     Works even when the blob URL has been revoked — canvas drawImage
     reads from the browser's decoded pixel buffer, not the URL. */
  function drawThumb(thumb, targetSize) {
    var nw = thumb.naturalWidth  || thumb.width;
    var nh = thumb.naturalHeight || thumb.height;
    if (!nw || !nh) return false;
    srcW = nw; srcH = nh;
    var cw = targetSize || nw;
    var ch = targetSize || nh;
    pvwCvs.width  = cw;
    pvwCvs.height = ch;
    var ctx = pvwCvs.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(thumb, 0, 0, cw, ch);
    return true;
  }

  function showPreview(thumb, targetSize, defaultZoom) {
    function tryDraw() {
      if (!drawThumb(thumb, targetSize)) return;
      pvwEmpty.style.display = 'none';
      pvwCvs.style.display   = 'block';
      if (defaultZoom != null) { zoom = defaultZoom; applyZoom(); } else { fitZoom(); }
    }
    if (thumb.complete && thumb.naturalWidth > 0) {
      tryDraw();
    } else {
      /* image not yet decoded — wait for it */
      var prevOnload = thumb.onload;
      thumb.onload = function (e) {
        if (prevOnload) prevOnload.call(this, e);
        tryDraw();
      };
    }
  }

  function clearPreview() {
    pvwCvs.style.display = 'none';
    pvwEmpty.style.display = 'block';
    pvwZoom.textContent = '';
  }

  /* intercept cell clicks via delegation */
  document.getElementById('tmpl-grid').addEventListener('click', function (e) {
    var cell = e.target.closest('.tmpl-cell');
    if (!cell) return;
    var thumb = cell.querySelector('img.tmpl-thumb');
    if (thumb) showPreview(thumb, cell.dataset.sword === '1' ? 128 : null, cell.dataset.sword === '1' ? 1 : null);
  });

  /* clear preview when modal closes or tab switches */
  ['tmpl-cancel', 'tmpl-close-btn', 'tmpl-confirm'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', clearPreview);
  });
  document.querySelectorAll('.tmpl-tab').forEach(function (tab) {
    tab.addEventListener('click', clearPreview);
  });

  /* scroll wheel zoom — 0.5× increments */
  pvwWrap.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (pvwCvs.style.display === 'none') return;
    var delta = e.deltaY < 0 ? STEP : -STEP;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    applyZoom();
  }, { passive: false });
})();

/* ── Adjustments panel live preview ── */
(function () {
  var mainCvs = document.getElementById('main-canvas');
  var aftCvs  = document.getElementById('adj-pvw-after');
  if (!mainCvs || !aftCvs) return;

  function drawScaled(src, dst) {
    var sw = src.width, sh = src.height;
    if (!sw || !sh) return;
    var wrap = dst.parentElement;
    var ww = wrap.offsetWidth - 2;
    var wh = wrap.offsetHeight - 2;
    if (ww <= 0 || wh <= 0) return;
    var scale = Math.min(ww / sw, wh / sh);
    var pw = Math.max(1, Math.round(sw * scale));
    var ph = Math.max(1, Math.round(sh * scale));
    dst.width = pw; dst.height = ph;
    var ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, pw, ph);
  }

  var _orig = window.adjPreview;
  window.adjPreview = function () {
    _orig.apply(this, arguments);
    try { drawScaled(mainCvs, aftCvs); } catch (e) {}
  };
})();
