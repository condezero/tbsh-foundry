// Import document classes.
import { tbshActor } from "./documents/actor.mjs";
import { tbshItem } from "./documents/item.mjs";
// Import sheet classes.
import { tbshActorSheet } from "./sheets/actor-sheet.mjs";
import { tbshItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { TBSH } from "./helpers/config.mjs";
import { tbshState } from "./tbsh_state.js";
import {toggleAttributeTestDisplay}from "./shared.js"
import {logDamageRoll } from "./chat_messages.mjs";
/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  let state = new tbshState();
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.tbsh = {
    tbshActor,
    tbshItem
  };

  // Add custom constants for configuration.
  CONFIG.TBSH = TBSH;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };
  // window.tbsh = { state: state };
  // Define custom Document classes
  CONFIG.Actor.documentClass = tbshActor;
  CONFIG.Item.documentClass = tbshItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("tbsh", tbshActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("tbsh", tbshItemSheet, { makeDefault: true });

  Handlebars.registerHelper("attackKind", function (key) {
    return (game.i18n.localize(`TBSH.weapons.kinds.${key}`));
  });
  Handlebars.registerHelper("longAttributeName", function (key) {
    return (game.i18n.localize(`TBSH.fields.labels.attributes.${key}.long`));
  });
  Handlebars.registerHelper("effectName", function (key) {
    return (game.i18n.localize(`TBSH.weapons.effects.${key}`));
  });

  Handlebars.registerHelper("magicType", function (key) {
    return (game.i18n.localize(`TBSH.magic.kinds.${key}`));
  });

  Handlebars.registerHelper("rangeName", function (name) {
    return (game.i18n.localize(`TBSH.ranges.${name}`));
  });
  Handlebars.registerHelper("shortAttributeName", function (key) {
    return (game.i18n.localize(`TBSH.fields.labels.attributes.${key}.short`));
  });
  
  Hooks.on("renderChatMessage", (message, speaker) => {
    setTimeout(() => {
      let element = document.querySelector(`[data-message-id="${message.id}"]`);
      let node = element.querySelector(".tbsh-roll-title");

      if (node) {
        node.addEventListener("click", toggleAttributeTestDisplay);
      }

      node = element.querySelector(".tbsh-damage-button");
      if (node) {
        node.addEventListener("click", logDamageRoll);
      }
    }, 250);
  });
  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function () {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});



/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
});