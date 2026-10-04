/* BlueX hero: the X in 3D.
   The two halves fly in from either side, hang apart in depth, lean toward the cursor,
   and close into the flat X as you scroll. Desktop with a fine pointer only; everyone
   else keeps the layered SVG version.
   Built by _source/build.py from _source/hero3d.src.js (geometry from the BlueX X file). */
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
    var W = GEO.box[0], H = GEO.box[1];
    var C = GEO.colors;

    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(20, 1, 10, 3000);

    function half(pts, cap, side, depth) {
      var sh = new T.Shape(pts.map(function (q) { return new T.Vector2(q[0] - W / 2, -(q[1] - H / 2)); }));
      var g = new T.ExtrudeGeometry(sh, {
        depth: depth, curveSegments: 1, bevelEnabled: true,
        bevelThickness: 0.9, bevelSize: 0.5, bevelSegments: 2
      });
      // pivot each half around its own centre so it can roll as it flies in
      g.computeBoundingBox();
      var c = new T.Vector3(); g.boundingBox.getCenter(c);
      g.translate(-c.x, -c.y, -depth / 2);
      var m = new T.Mesh(g, [new T.MeshBasicMaterial({ color: cap }), new T.MeshBasicMaterial({ color: side })]);
      var holder = new T.Group(); holder.add(m);
      holder.userData.home = new T.Vector3(c.x, c.y, 0);
      holder.position.copy(holder.userData.home);
      return holder;
    }
    var blue = half(GEO.blue, C.blue, C.blueSide, 12);
    var green = half(GEO.green, C.green, C.greenSide, 12);
    var pivot = new T.Group();
    pivot.add(blue); pivot.add(green);
    scene.add(pivot);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // the canvas is 160% of the box; the box shows the X's 107-unit-high view box
      var visibleH = 107 * 1.6;
      camera.position.set(0, 0, (visibleH / 2) / Math.tan(T.MathUtils.degToRad(camera.fov / 2)));
      camera.updateProjectionMatrix();
    }
    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    var tx = 0, ty = 0, rx = 0.2, ry = -0.6;
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
      var intro = Math.min(1, t / 1.8);
      var ie = 1 - Math.pow(1 - intro, 3);                       // ease-out
      var p = parseFloat(box.dataset.progress || "0");           // set by site.js from scroll
      var settle = 1 - p;                                         // 1 at top, 0 when closed
      var fly = 1 - ie;                                           // 1 at load, 0 once the intro ends
      var sep = 4 * settle + 46 * fly;                            // sideways gap between the halves
      var depth = settle + 1.6 * fly;                             // how far they float apart in depth
      var roll = 0.4 * settle + 1.2 * fly;

      var bh = blue.userData.home, gh = green.userData.home;
      blue.position.set(bh.x - sep, bh.y + 1.5 * depth, -12 * depth);
      green.position.set(gh.x + sep, gh.y - 1.5 * depth, 9 + 26 * depth);
      blue.rotation.set(0.05 * roll, -0.12 * roll, 0.08 * roll);
      green.rotation.set(-0.05 * roll, 0.12 * roll, -0.08 * roll);

      var sway = Math.sin(t * 0.6) * 0.06;
      var targetY = (tx * 0.42 + sway - 0.22) * settle;
      var targetX = (ty * 0.26 + 0.08) * settle;
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
    if (reduce.addEventListener) reduce.addEventListener("change", function () {
      if (reduce.matches) { visible = false; box.classList.remove("is-3d"); }
    });
    requestAnimationFrame(frame);
  }
})();
