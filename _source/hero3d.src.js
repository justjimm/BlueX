/* Bluechip hero: the B monogram in 3D.
   Its layers float apart in depth, lean toward the cursor, and settle flat into the logo as
   you scroll. Desktop with a fine pointer only; everyone else keeps the layered SVG version.
   Built by _source/build.py from _source/hero3d.src.js (geometry from the fixed brand files). */
(function () {
  "use strict";
  var box = document.querySelector(".hero-mark");
  if (!box) return;
  var capable = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 961px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!capable.matches || reduce.matches) return;
  try {
    var probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;
  } catch (e) { return; }

  var here = document.currentScript && document.currentScript.src;
  var lib = here ? here.replace(/js\/hero3d\.js.*$/, "vendor/three-r128.min.js") : "assets/vendor/three-r128.min.js";
  var s = document.createElement("script");
  s.src = lib; s.async = true; s.onload = start;
  document.head.appendChild(s);

  var GEO = %%GEO%%;

  function start() {
    if (!window.THREE) return;
    var T = window.THREE;
    var canvas = box.querySelector(".mark-canvas");
    var hero = document.querySelector(".hero");
    var W = GEO.box[0], H = GEO.box[1];

    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(20, 1, 10, 3000);

    function shapes(parts) {
      return parts.map(function (p) {
        var sh = new T.Shape(p.outer.map(function (q) { return new T.Vector2(q[0] - W / 2, -(q[1] - H / 2)); }));
        p.holes.forEach(function (h) {
          sh.holes.push(new T.Path(h.map(function (q) { return new T.Vector2(q[0] - W / 2, -(q[1] - H / 2)); })));
        });
        return sh;
      });
    }
    function layer(parts, depth, cap, side, bevel) {
      var g = new T.ExtrudeGeometry(shapes(parts), {
        depth: depth, curveSegments: 1, bevelEnabled: true,
        bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 2
      });
      var m = new T.Mesh(g, [new T.MeshBasicMaterial({ color: cap }), new T.MeshBasicMaterial({ color: side })]);
      return m;
    }
    var C = GEO.colors;
    var upper = layer(GEO.upper, 16, C.navy, "#0A1430", 1.1);
    var lower = layer(GEO.lower, 16, C.navy, "#0A1430", 1.1);
    var bowl = layer(GEO.bowl, 8, C.cobalt, "#1838B8", 0.9);
    var slash = layer(GEO.slash, 4, C.cobaltLight, "#3F68D6", 0.6);
    var mark = new T.Group();
    [upper, lower, bowl, slash].forEach(function (m) { mark.add(m); });
    var pivot = new T.Group();
    pivot.add(mark);
    mark.position.z = -14;          // rotate around the middle of the stack
    scene.add(pivot);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the B the same height as the SVG it replaces (canvas is 136% of the box height)
      var visibleH = (H + 8) * 1.36;
      camera.position.set(0, 0, (visibleH / 2) / Math.tan(T.MathUtils.degToRad(camera.fov / 2)));
      camera.updateProjectionMatrix();
    }
    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    // pointer → target tilt, measured from the mark's own centre
    var tx = 0, ty = 0, rx = 0.35, ry = -0.9;
    window.addEventListener("pointermove", function (e) {
      var r = box.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.45)));
      ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.55)));
    }, { passive: true });

    var visible = true, running = false, first = true;
    var t0 = performance.now();
    function frame(now) {
      running = visible && !document.hidden;
      if (!running) return;
      var t = (now - t0) / 1000;
      var intro = Math.min(1, t / 1.6);
      var introEase = 1 - Math.pow(1 - intro, 3);
      var p = parseFloat(box.dataset.progress || "0");          // set by site.js from scroll
      var settle = 1 - p;                                          // 1 at top, 0 when flat
      var e = settle * (1 + (1 - introEase) * 0.8);                // explode amount

      upper.position.y = 7 * e;
      lower.position.y = -3 * e;
      bowl.position.z = 16 + 30 * e;
      slash.position.z = 24 + 52 * e;

      var sway = Math.sin(t * 0.6) * 0.07;
      var targetY = (tx * 0.42 + sway - 0.26) * settle;
      var targetX = (ty * 0.26 + 0.1) * settle;
      var k = intro < 1 ? 0.04 : 0.07;
      ry += (targetY - ry) * k;
      rx += (targetX - rx) * k;
      pivot.rotation.set(rx, ry, 0);

      renderer.render(scene, camera);
      if (first) { first = false; box.classList.add("is-3d"); }
      requestAnimationFrame(frame);
    }
    function wake() { if (!running && visible && !document.hidden) requestAnimationFrame(frame); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }).observe(box);
    }
    document.addEventListener("visibilitychange", wake);
    reduce.addEventListener && reduce.addEventListener("change", function () {
      if (reduce.matches) { visible = false; box.classList.remove("is-3d"); }
    });
    requestAnimationFrame(frame);
  }
})();
