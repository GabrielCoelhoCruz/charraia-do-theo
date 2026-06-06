/* Tweaks panel for Arraial do Theo.
   The page itself is static HTML; this React island only renders the panel
   and applies tweaks to the document (data attributes + CSS variables). */

const ARRAIAL_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hero": "centered",
  "accent": "#C2674A",
  "bunting": "cheio"
}/*EDITMODE-END*/;

function ArraialTweaks() {
  const [t, setTweak] = useTweaks(ARRAIAL_DEFAULTS);

  // hero layout
  React.useEffect(() => {
    document.documentElement.dataset.hero = t.hero;
  }, [t.hero]);

  // accent color (cascades through buttons, headings em, chips…)
  React.useEffect(() => {
    document.documentElement.style.setProperty("--terracota", t.accent);
    // derive a darker shade for the deep accent
    document.documentElement.style.setProperty("--terracota-escuro", shade(t.accent, -0.18));
    document.documentElement.style.setProperty("--terracota-suave", shade(t.accent, 0.18));
  }, [t.accent]);

  // bunting density
  React.useEffect(() => {
    const count = t.bunting === "discreto" ? 9 : 15;
    document.querySelectorAll(".bunting").forEach((b) => { b.dataset.count = count; });
    if (window.__arraial) window.__arraial.buildBunting();
  }, [t.bunting]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Hero" />
      <TweakRadio
        label="Layout"
        value={t.hero}
        options={["centered", "split", "editorial"]}
        onChange={(v) => setTweak("hero", v)}
      />
      <TweakSection label="Enfeites" />
      <TweakRadio
        label="Bandeirinhas"
        value={t.bunting}
        options={["discreto", "cheio"]}
        onChange={(v) => setTweak("bunting", v)}
      />
      <TweakColor
        label="Cor de destaque"
        value={t.accent}
        options={["#C2674A", "#D69A3C", "#9DA886", "#B0573C"]}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakSection label="Brincar" />
      <TweakButton label="Soltar confete 🎉" onClick={() => window.__arraial && window.__arraial.burstConfetti()} />
    </TweaksPanel>
  );
}

/* tiny hex shade helper */
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c : 255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<ArraialTweaks />);
