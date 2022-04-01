/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([

    // Actor partials.
    "systems/tbsh/templates/actor/parts/actor-features.html",
    "systems/tbsh/templates/actor/parts/actor-items.html",
    "systems/tbsh/templates/actor/parts/actor-effects.html",
    "systems/tbsh/templates/actor/parts/actor-background.html",
    "systems/tbsh/templates/actor/parts/actor-usage-die-details.html",
    "systems/tbsh/templates/actor/parts/actor-magic.html",
    "systems/tbsh/templates/actor/parts/actor-fight.html",
    "systems/tbsh/templates/item/item-weapon-sheet.html",
    "systems/tbsh/templates/item/item-magic-sheet.html",
    "systems/tbsh/templates/partials/equipment-entry.html",
    "systems/tbsh/templates/partials/spell-entry.html",
    "systems/tbsh/templates/actor/parts/actor-attributes-details.html",
    "systems/tbsh/templates/partials/weapon-entry.html",    
    "systems/tbsh/templates/messages/attack-roll.hbs",
    "systems/tbsh/templates/messages/attribute-test.hbs",
    "systems/tbsh/templates/messages/cast-magic.hbs",
    "systems/tbsh/templates/messages/damage.hbs",
    "systems/tbsh/templates/messages/damage-roll.hbs",
    "systems/tbsh/templates/messages/roll.hbs",
    "systems/tbsh/templates/partials/ability-details.hbs",
    "systems/tbsh/templates/partials/ability-entry.hbs",
    "systems/tbsh/templates/partials/armour-details.html",
    "systems/tbsh/templates/partials/armour-entry.html",
    "systems/tbsh/templates/partials/background-tab.hbs",
    // "systems/tbsh/templates/partials/basics-tab.hbs",
    "systems/tbsh/templates/partials/creature-ability-entry.hbs",
    "systems/tbsh/templates/partials/creature-attack-entry.hbs",
    "systems/tbsh/templates/partials/toggle-collapse-widget.hbs",

  ]);
};
