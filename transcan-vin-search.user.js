// ==UserScript==
// @name         Transcan VIN search (from Inventory viewer)
// @namespace    inventory-viewer
// @version      1.0
// @description  When the Inventory viewer opens the dashboard with ?tcvin=VIN, types that VIN into the vehicle search bar and runs the search.
// @match        https://dashboard.transcanauto.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const vin = params.get("tcvin");
  if (!vin) return; // the page wasn't opened by the Search button

  // The search bar you pointed to, with a looser fallback in case the layout shifts slightly.
  const XPATH = "/html/body/div/div[2]/div[2]/nav/div/div/form/fieldset/div/div/input";
  const findInput = () =>
    document.evaluate(XPATH, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ||
    document.querySelector("nav form fieldset input");

  // Sets the value in a way that React, Vue and Angular all notice.
  function typeValue(input, value) {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Presses Enter, and also tells the form it was submitted (without reloading the page).
  function pressEnter(input) {
    const key = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    input.dispatchEvent(new KeyboardEvent("keydown", key));
    input.dispatchEvent(new KeyboardEvent("keypress", key));
    input.dispatchEvent(new KeyboardEvent("keyup", key));
    const form = input.closest("form");
    if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }

  // Remove ?tcvin= from the address so refreshing the page doesn't search again.
  function cleanAddress() {
    params.delete("tcvin");
    const qs = params.toString();
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  // The dashboard builds its page after loading, so wait for the search bar (up to 30 seconds,
  // which also covers a quick log-in).
  let tries = 0;
  const timer = setInterval(() => {
    const input = findInput();
    if (!input) {
      if (++tries > 150) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    // Give the page a moment to finish setting up its own search box before typing.
    setTimeout(() => {
      typeValue(input, vin);
      setTimeout(() => {
        pressEnter(input);
        cleanAddress();
      }, 150);
    }, 400);
  }, 200);
})();
