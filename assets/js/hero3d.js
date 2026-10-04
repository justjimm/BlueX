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

  var GEO = {"box":[120,170],"upper":[{"outer":[[0.0,63.0],[83.0,63.0],[95.49,74.1],[97.66,72.55],[100.03,70.59],[102.19,68.5],[104.14,66.27],[105.89,63.91],[107.42,61.4],[108.74,58.74],[109.84,55.94],[110.72,52.98],[111.37,49.87],[111.79,46.61],[111.99,43.18],[111.9,38.8],[111.59,35.71],[111.07,32.73],[110.36,29.86],[109.93,28.47],[108.92,25.77],[107.72,23.19],[106.32,20.74],[104.74,18.4],[102.97,16.2],[101.02,14.12],[98.88,12.17],[96.57,10.36],[94.08,8.69],[91.42,7.15],[90.03,6.43],[87.11,5.11],[84.03,3.93],[79.1,2.45],[73.81,1.31],[70.08,0.74],[66.2,0.33],[62.18,0.08],[58.0,0.0],[0.0,0.0]],"holes":[]}],"lower":[{"outer":[[0.0,170.0],[58.0,170.0],[62.79,169.9],[67.41,169.61],[71.86,169.13],[76.13,168.46],[80.23,167.61],[84.14,166.58],[87.87,165.37],[91.41,164.0],[94.76,162.46],[97.91,160.76],[100.87,158.89],[102.27,157.9],[104.93,155.81],[107.38,153.57],[108.53,152.39],[110.67,149.93],[112.59,147.33],[113.48,145.98],[115.08,143.18],[116.46,140.25],[117.07,138.74],[118.12,135.62],[118.94,132.39],[119.26,130.73],[119.73,127.32],[119.97,123.8],[120.0,122.0],[119.93,119.53],[119.71,117.11],[119.13,113.58],[118.56,111.3],[117.87,109.07],[116.58,105.85],[115.56,103.78],[114.41,101.77],[112.46,98.87],[111.02,97.02],[109.45,95.24],[107.78,93.53],[105.99,91.89],[104.1,90.31],[102.1,88.81],[100.0,87.39],[97.79,86.04],[95.49,84.76],[93.1,83.56],[90.61,82.44],[88.03,81.41],[84.0,80.0],[86.43,79.0],[18.0,79.0],[0.0,63.0]],"holes":[]}],"bowl":[{"outer":[[0.0,79.0],[0.0,146.0],[59.73,145.98],[63.11,145.85],[66.35,145.58],[69.47,145.19],[72.46,144.66],[76.69,143.64],[80.61,142.34],[84.23,140.78],[86.46,139.59],[88.55,138.29],[91.42,136.13],[93.15,134.55],[94.73,132.87],[96.16,131.08],[97.43,129.19],[99.06,126.17],[100.34,122.94],[100.99,120.66],[101.67,117.08],[101.92,114.58],[102.0,112.0],[101.81,108.33],[101.26,104.84],[100.34,101.53],[99.53,99.43],[98.02,96.44],[96.16,93.65],[93.96,91.08],[91.42,88.73],[89.54,87.29],[86.46,85.34],[84.23,84.17],[81.85,83.11],[79.34,82.17],[76.69,81.34],[73.9,80.64],[70.98,80.06],[67.93,79.6],[63.11,79.15],[58.0,79.0]],"holes":[]}],"slash":[{"outer":[[0.0,79.0],[0.0,108.0],[42.0,146.0],[74.0,146.0]],"holes":[]}],"colors":{"navy":"#101D3A","cobalt":"#2357FF","cobaltLight":"#5B8CFF","green":"#22CE5E"}};

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
