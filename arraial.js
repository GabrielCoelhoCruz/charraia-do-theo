/* ============================================================
   Arraial do Theo — interactions
   ============================================================ */
(function () {
  "use strict";

  const EVENT_DATE = new Date(2026, 6, 4, 17, 0, 0);

  const FLAG_CLASSES = ["f-terra", "f-areia", "f-most", "f-sage", "f-terra-d"];
  function buildBunting() {
    document.querySelectorAll(".bunting").forEach((b) => {
      const count = parseInt(b.dataset.count || "13", 10);
      b.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const f = document.createElement("span");
        f.className = "flag " + FLAG_CLASSES[i % FLAG_CLASSES.length];
        if (i % 3 === 1) f.classList.add("dotty");
        f.style.animationDelay = (i * 0.12).toFixed(2) + "s";
        b.appendChild(f);
      }
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    const el = document.getElementById("countdown");
    if (!el) return;
    const now = new Date();
    let diff = Math.max(0, EVENT_DATE - now);
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set("cd-d", d);
    set("cd-h", pad(h));
    set("cd-m", pad(m));
    set("cd-s", pad(s));
  }

  function initStepper() {
    const input = document.getElementById("guests");
    if (!input) return;
    document.querySelectorAll("[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = parseInt(input.value || "1", 10) || 1;
        const next = Math.min(20, Math.max(1, cur + parseInt(btn.dataset.step, 10)));
        input.value = next;
      });
    });
  }

  const CONFETTI_COLORS = ["#C2674A", "#D69A3C", "#9DA886", "#E7D3BC", "#9E4F38", "#FBF6EE"];
  function burstConfetti() {
    const layer = document.getElementById("confetti");
    if (!layer) return;
    const N = 110;
    for (let i = 0; i < N; i++) {
      const bit = document.createElement("span");
      bit.className = "confetti-bit";
      const size = 6 + Math.random() * 9;
      const round = Math.random() > 0.6;
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.width = size + "px";
      bit.style.height = (round ? size : size * (0.4 + Math.random() * 0.7)) + "px";
      bit.style.background = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
      bit.style.borderRadius = round ? "50%" : "1px";
      const dur = 2.6 + Math.random() * 2.4;
      const delay = Math.random() * 0.6;
      bit.style.animation = `fall ${dur}s cubic-bezier(.3,.1,.5,1) ${delay}s forwards`;
      bit.style.opacity = "0.95";
      layer.appendChild(bit);
      setTimeout(() => bit.remove(), (dur + delay) * 1000 + 200);
    }
  }

  function resetSubmitButton(btn) {
    btn.classList.remove("loading");
    const label = btn.querySelector(".btn-label");
    if (label) label.textContent = "Confirmar presença";
  }

  function showFormError(message) {
    let el = document.getElementById("rsvp-error");
    if (!el) {
      const form = document.getElementById("rsvp-form");
      if (!form) return;
      el = document.createElement("p");
      el.id = "rsvp-error";
      el.className = "rsvp-error";
      el.setAttribute("role", "alert");
      form.querySelector(".submit-row").before(el);
    }
    el.textContent = message;
    el.hidden = false;
  }

  function hideFormError() {
    const el = document.getElementById("rsvp-error");
    if (el) el.hidden = true;
  }

  function initForm() {
    const form = document.getElementById("rsvp-form");
    if (!form) return;
    const card = document.getElementById("rsvp-card");
    const btn = form.querySelector(".btn-submit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideFormError();

      const nameEl = document.getElementById("name");
      const name = (nameEl && nameEl.value) || "";
      if (!name.trim()) {
        nameEl.focus();
        nameEl.style.borderColor = "var(--terracota)";
        nameEl.style.boxShadow = "0 0 0 4px rgba(194,103,74,.18)";
        return;
      }

      if (!window.__charraiaApi || !window.__charraiaApi.isConfigured()) {
        showFormError("Confirmação online ainda não configurada. Veja o SETUP.md.");
        return;
      }

      btn.classList.add("loading");
      btn.querySelector(".btn-label").textContent = "Confirmando…";

      const guestsEl = document.getElementById("guests");
      const dietEl = document.getElementById("diet");
      const giftMode = (window.__charraiaGifts && window.__charraiaGifts.mode) || "lista";
      const gifts = giftMode === "lista" && window.__charraiaGifts
        ? window.__charraiaGifts.getPickedForSubmit()
        : [];

      try {
        const result = await window.__charraiaApi.submitRsvp({
          name: name.trim(),
          guests: parseInt(guestsEl && guestsEl.value, 10) || 1,
          diet: (dietEl && dietEl.value.trim()) || "",
          giftMode,
          gifts,
        });

        if (!result.ok) {
          resetSubmitButton(btn);
          if (result.error === "stock") {
            showFormError(
              (result.message || "Esse presente acabou de ser reservado.") +
              " Escolhe outro na listinha."
            );
            if (window.__charraiaGifts) {
              await window.__charraiaGifts.refreshClaims();
              window.__charraiaGifts.openSheet();
            }
            return;
          }
          showFormError(result.message || "Não conseguimos confirmar. Tenta de novo.");
          return;
        }

        const first = name.trim().split(" ")[0];
        const nameSlot = document.getElementById("success-name");
        if (nameSlot) nameSlot.textContent = first;

        const giftSlot = document.getElementById("success-gift");
        if (giftSlot) {
          const msg = result.message || "";
          if (msg) {
            giftSlot.textContent = msg;
            giftSlot.hidden = false;
          } else {
            giftSlot.hidden = true;
          }
        }

        if (window.__charraiaGifts) {
          window.__charraiaGifts.clearPickedAfterSubmit();
          await window.__charraiaGifts.refreshClaims();
        }

        card.classList.add("done");
        burstConfetti();
      } catch (err) {
        resetSubmitButton(btn);
        showFormError("Sem conexão ou erro no servidor. Tenta de novo em instantes.");
      }
    });
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  function init() {
    buildBunting();
    tick();
    setInterval(tick, 1000);
    initStepper();
    initForm();
    initReveal();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.__arraial = { burstConfetti, buildBunting };
})();
