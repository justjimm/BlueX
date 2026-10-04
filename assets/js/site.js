/* Bluechip site behaviour. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------------------------------------------------- header */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var list = document.getElementById("nav-list");
  if (toggle && list) {
    list.setAttribute("data-open", "false");
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      list.setAttribute("data-open", String(!open));
      toggle.textContent = open ? "Menu" : "Close";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.click(); toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------- scroll-linked state */
  var mark = document.querySelector(".hero-mark");
  var hero = document.querySelector(".hero");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      if (header) header.classList.toggle("is-scrolled", y > 4);
      if (mark && hero && !reduce.matches) {
        var p = Math.min(1, Math.max(0, y / (hero.offsetHeight * 0.6)));
        var ease = p * p * (3 - 2 * p);
        mark.style.setProperty("--explode", (1 - ease).toFixed(3));
        mark.dataset.progress = ease.toFixed(3);
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------- magnetic buttons */
  if (finePointer.matches && !reduce.matches) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty("--mx", (dx * 6).toFixed(2) + "px");
        el.style.setProperty("--my", (dy * 4).toFixed(2) + "px");
      });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      });
    });
  }

  /* ---------------------------------------------------- the X: two forms meet */
  if ("IntersectionObserver" in window && !reduce.matches) {
    document.querySelectorAll(".x-device").forEach(function (x) {
      var r = x.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85) return; // already in view: leave it crossed
      x.classList.add("is-armed");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            requestAnimationFrame(function () { x.classList.remove("is-armed"); });
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(x);
    });
  }

  /* ---------------------------------------------------- copy buttons */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectText(b); });
      } else { selectText(b); }
    });
  });
  function selectText(b) {
    var target = b.previousElementSibling;
    if (!target) return;
    var range = document.createRange(); range.selectNodeContents(target);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    b.textContent = "Press Ctrl+C";
  }

  /* ---------------------------------------------------- contact form */
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("cf-status");
    var fields = {
      name: document.getElementById("cf-name"),
      email: document.getElementById("cf-email"),
      message: document.getElementById("cf-message")
    };
    var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
    var setErr = function (el, bad) {
      var msg = document.getElementById(el.id + "-err");
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (msg) { msg.hidden = !bad; if (bad) el.setAttribute("aria-describedby", msg.id); else el.removeAttribute("aria-describedby"); }
    };
    Object.keys(fields).forEach(function (k) {
      fields[k].addEventListener("input", function () {
        if (fields[k].getAttribute("aria-invalid") === "true") validate(k);
      });
    });
    function validate(k) {
      var v = fields[k].value.trim();
      var bad = k === "email" ? !emailOk(v) : v.length < 2;
      setErr(fields[k], bad);
      return !bad;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status"; status.textContent = "";
      var ok = ["name", "email", "message"].map(validate);
      var firstBad = ["name", "email", "message"].filter(function (k, i) { return !ok[i]; })[0];
      if (firstBad) { fields[firstBad].focus(); return; }

      var data = new FormData(form);
      var id = (form.getAttribute("data-formspree") || "").trim();
      var btn = form.querySelector('button[type="submit"]');
      if (id) {
        btn.disabled = true; btn.textContent = "Sending…";
        fetch("https://formspree.io/f/" + encodeURIComponent(id), {
          method: "POST", body: data, headers: { Accept: "application/json" }
        }).then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          status.className = "form-status ok";
          status.textContent = "Message sent. We will reply to the email address you gave.";
        }).catch(function () {
          status.className = "form-status err";
          status.textContent = "The message did not send. Email " + form.getAttribute("data-email") + " instead, or try again.";
        }).finally(function () { btn.disabled = false; btn.textContent = "Send message"; });
      } else {
        var to = form.getAttribute("data-email");
        var subject = "Website enquiry: " + data.get("topic");
        var body = data.get("message") + "\n\n" + data.get("name") +
          (data.get("company") ? "\n" + data.get("company") : "") + "\n" + data.get("email");
        window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        status.className = "form-status ok";
        status.textContent = "Your email app should open with the message ready to send. If it does not, email " + to + ".";
      }
    });
  }
})();
