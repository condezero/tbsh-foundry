import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";

import {
  logAttackRoll,
  logAttributeTest,

  logUsageDieRoll,
  logUsageDoomDieRoll, showMessage

} from '../chat_messages.mjs';
import {
  deleteOwnedItem,
  findActorFromItemId,
  generateDieRollFormula,
  initializeCharacterSheetUI,
  interpolate,
  onTabSelected
} from '../shared.js';
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class tbshActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["tbsh", "sheet", "actor"],
      template: "systems/tbsh/templates/actor/actor-sheet.html",
      width: 900,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/tbsh/templates/actor/actor-${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.data.toObject(false);
    //debugger;
    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.config = CONFIG.TBSH;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    let armour = [];
    let equipment = [];
    let magic = [];
    let weapons = [];
    context.items.forEach((item) => {
      switch (item.type) {
        case "weapon":
          weapons.push(item);
          break;
        case "magic":
          magic.push(item);
          break;
        case "armour":
          armour.push(item);
          break;
        case "equipment":
          equipment.push(item);
          break;
        default:
          console.warn("Ignoring character item", item);

      }
    });
    context.weapons = weapons;
    context.magic = magic;
    context.armour = armour;
    context.equipment = equipment;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    //debugger;
    // console.log(html);
    // initializeCharacterSheetUI(window.tbsh.state);
    html.find(".tbsh-delete-item-icon").click(this._onDeleteItemClicked.bind(this));
    html.find(".tbsh-roll-attack-icon").click(this._onRollAttackClicked.bind(this));
    // html.find(".tbsh-roll-attribute-test-icon").click(this._onRollAttributeTest.bind(this));
    html.find(".tbsh-roll-usage-die-icon").click(this._onRollUsageDieClicked.bind(this));
    //html.find(".doom-select").c = this._onDoomSelectChange.bind(this);
    // html.find(".tbsh-reset-all-usage-dice-icon").click(this._onResetUsageDiceClicked.bind(this));
    html.find(".tbsh-reset-usage-die-icon").click(this._onResetUsageDieClicked.bind(this));
    html.find(".tbsh-increase-quantity-icon").click(this._onIncreaseEquipmentQuantityClicked.bind(this));
    html.find(".tbsh-decrease-quantity-icon").click(this._onDecreaseEquipmentQuantityClicked.bind(this));
    html.find(".tbsh-cast-magic-icon").click(this._onCastMagicClicked.bind(this));
    // html.find(".tbsh-cast-magic-as-ritual-icon").click(castMagicAsRitual);
    // html.find(".tbsh-prepare-magic-icon").click(prepareMagic);
    // html.find(".tbsh-unprepare-magic-icon").click(unprepareMagic);



    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {

    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }

    }
    if (dataset.rollatt) {

      logAttributeTest(this.actor.id, dataset.rollatt, event.shiftKey, event.ctrlKey);
    }
    // Handle rolls that supply the formula directly.
    if (dataset.roll) {

      logAttackRoll(this.actor)

    }
  }
  __onDoomSelectChange(event) {

    console.log(event);
  }
  _onDeleteItemClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      deleteOwnedItem(element.dataset.id);
    } else {
      console.error("Delete item called for but item id is not present on the element.");
    }
    return (false);
  }
  _onRollAttackClicked(event) {
    let element = event.currentTarget;
    let actor = findActorFromItemId(element.dataset.id);

    event.preventDefault();
    logAttackRoll(actor.id, element.dataset.id, event.shiftKey, event.ctrlKey);

    return (false);
  }

  _onRollUsageDieClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    logUsageDieRoll(element.dataset.id);
    return (false);
  }

  _onDecreaseEquipmentQuantityClicked(evemt) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      let actor = findActorFromItemId(element.dataset.id);

      if (actor) {
        this.decrementEquipmentQuantity(actor, element.dataset.id)
      } else {
        console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
      }
    } else {
      console.error(`Element had no item id on it.`)
    }
    return (false);
  }

  _onIncreaseEquipmentQuantityClicked(evemt) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      let actor = findActorFromItemId(element.dataset.id);
      if (actor) {
        this.incrementEquipmentQuantity(actor, element.dataset.id)
      } else {
        console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
      }
    } else {
      console.error(`Element had no item id on it.`)
    }
    return (false);
  }
  _onResetUsageDieClicked(event) {
    let element = event.currentTarget;
    let itemId = element.dataset.id;

    event.preventDefault();
    if (itemId) {
      let actor = findActorFromItemId(itemId);

      if (actor) {
        this.resetUsageDie(actor, itemId);
      } else {
        console.error(`Unable to locate an owning actor for item id ${itemId}.`);
      }
    } else {
      console.error("Equipment element does not possess an item id.");
    }
    return (false);
  }
  _onCastMagicClicked(event) {
    let element = event.currentTarget;
    let actor = findActorFromItemId(element.dataset.id);

    event.preventDefault();
    event.stopPropagation();
    console.log(`The castMagic() function was invoked with an item id of ${element.dataset.id}.`);
    if (actor) {
      let magic = actor.items.get(element.dataset.id);
      if (magic.data.data.kind === "spell") {
        this.invokeMagic(element.dataset.id, actor)
          .then((result) => {
            this.castSpell(result, actor, element.dataset.id);
          });
      } else {

        let element = event.currentTarget;
        event.preventDefault();
        logUsageDoomDieRoll(element.dataset.id);
        return (false);
      }

    }
    return (false);
  }
  castUsageDice(result, actor, itemId) {

    let element = event.currentTarget;

    event.preventDefault();
    logUsageDieRoll(element.dataset.id);
    return (false)
    // let attribute = interpolate(`TBSH.fields.labels.attributes.${result.attribute}.long`);
    // let item = actor.items.find((i) => i.id === itemId);
    // let message = {
    //   lost: !result.successful,
    //   roll: {
    //     formula: result.formula,
    //     labels: {
    //       result: "",
    //       title: interpolate("TBSH.messages.titles.rollUsageDie"),
    //     },
    //     result: result.attributeRoll,
    //     tested: true,
    //     downgraded: result.successful
    //   },
    //   spellName: result.spellName
    // };
    // // if (result.successful) {
    // //     data.data.cast = true;
    // //     data.data.prepared = true;
    // //     message.roll.labels.result = interpolate("TBSH.messages.labels.success");
    // // } else {
    // //     message.roll.labels.result = interpolate("TBSH.messages.labels.failure");
    // // }
    // let data = {
    //   id: item.id,
    //   data: {
    //     cast: false,
    //     prepared: false
    //   }
    // };
    // data.data.cast = true;
    // showMessage(actor, "systems/tbsh/templates/messages/usage-die.hbs", message);
    // item.update(data, { diff: true });

  }
  castSpell(result, actor, itemId) {
    let attribute = interpolate(`TBSH.fields.labels.attributes.${result.attribute}.long`);
    let item = actor.items.find((i) => i.id === itemId);
    let message = {
      lost: !result.successful,
      miscast: false,
      ritual: false,
      roll: {
        formula: result.formula,
        labels: {
          result: "",
          title: interpolate("TBSH.messages.titles.attributeTest", { attribute: attribute })
        },
        result: result.attributeRoll,
        success: result.successful,
        tested: true
      },
      spellName: result.spellName
    };
    let data = {
      id: item.id,
      data: {
        cast: false,
        prepared: false
      }
    };
    let total = result.attributeRoll + result.spellLevel;
    console.log(`Attribute Test: Roll=${result.attributeRoll}, Level=${result.spellLevel}, Total=${result.attributeRoll + result.spellLevel}`);

    if (result.successful) {
      data.data.cast = true;
      data.data.prepared = true;
      message.roll.labels.result = interpolate("TBSH.messages.labels.success");
    } else {
      message.roll.labels.result = interpolate("TBSH.messages.labels.failure");
    }

    showMessage(actor, "systems/tbsh/templates/messages/cast-magic.hbs", message);
    item.update(data, { diff: true });

  }

  decrementEquipmentQuantity(actor, itemId) {
    let item = actor.items.find(i => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.data.data;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        if (itemData.quantity > 0) {
          let data = {
            id: item.id,
            data: {
              quantity: itemData.quantity - 1
            }
          };
          item.update(data, { diff: true });
        } else {
          console.warn(`Unable to decrease quantity for the ${item.name} item (id: ${item.id}) as it's already at zero.`);
        }
      } else {
        console.warn(`Unable to increase quantity for the ${item.name} item (id ${item.name}) (${item.id}) as it does not have a usage die.`);
      }
    } else {
      if (!item) {
        console.error(`The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`);
      }
    }
  }

  incrementEquipmentQuantity(actor, itemId) {
    let item = actor.items.find(i => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.data.data;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        let data = {
          id: item.id,
          data: {
            quantity: itemData.quantity + 1
          }
        };
        item.update(data, { diff: true });
      } else {
        console.warn(`Unable to increase quantity for item id ${item.name} (${item.id}) as it does not have a usage die.`);
      }
    } else {
      if (!item) {
        console.error(`The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`);
      }
    }
  }

  resetUsageDie(actor, itemId) {
    let item = actor.items.find(i => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.data.data;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        if (itemData.quantity > 0) {
          if (itemData.usageDie.current !== itemData.usageDie.maximum) {
            let data = {
              _id: item.id,
              data: {
                usageDie: {
                  current: itemData.usageDie.maximum
                }
              }
            };
            item.update(data, { diff: true });
          } else {
            console.warn(`Unable to reset the usage die for item ${item.name} (id ${item.id}) as it's at it's maximum usage die.`);
          }
        } else {
          console.warn(`Unable to reset the usage die for item ${item.name} (id ${item.id}) as it's supply is depleted.`);
          ui.notifications.error(interpolate("TBSH.messages.errors.supplyDepleted", { item: item.name }))
        }
      } else {
        console.warn(`Unable to reset the usage die for item id ${item.name} (${item.id}) as it does not have a usage die.`);
      }
    } else {
      if (!item) {
        console.error(`The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`);
      }
    }
  }
  invokeMagic(magicId, caster) {
    let attributeTest = null;
    let attribute = null;
    let formula = null;
    let magic = caster.items.get(magicId);
    let options = {};
    let result = {
      attribute: "",
      attributeRoll: 0,
      rollType: "standard",
      spellLevel: parseInt(magic.data.data.level),
      spellName: magic.name,
      successful: false
    }
    let total = 0;

    if (event.shiftKey) {
      if (!magic.data.data.cast) {
        options.kind = result.rollType = "advantage";
      }
    } else if (event.ctrlKey || magic.data.data.cast) {
      options.kind = result.rollType = "disadvantage";
    }
    attribute = "intelligence";
    formula = generateDieRollFormula(options);
    attributeTest = new Roll(formula);

    return (attributeTest.roll()
      .then(() => {
        result.type = "spell";
        result.attribute = attribute;
        result.attributeRoll = attributeTest.total;
        result.formula = attributeTest.formula;
        result.successful = result.attributeRoll < caster.data.data.attributes[attribute];
        return (result);
      }));

  }

}
