/* Shared helpers — loaded before admin.js and gifts.js */
(function () {
  "use strict";

  function isEmailGiftMode(mode) {
    return mode === "email" || mode === "pix";
  }

  function joinGiftParts(parts) {
    if (!parts.length) return "";
    return parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
  }

  window.__charraiaShared = {
    isEmailGiftMode,
    joinGiftParts,
  };
})();
