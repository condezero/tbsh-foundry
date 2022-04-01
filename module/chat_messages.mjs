import { findActorFromItemId, generateDieRollFormula, interpolate } from './shared.js';

export function logAttackRoll(actorId, weaponId, shiftKey = false, ctrlKey = false) {
    let actor = game.actors.find((a) => a.id === actorId);

    if (actor) {

        let weapon = actor.items.find((i) => i.id === weaponId);

        if (weapon) {
            let roll = null;
            let extraDie = "";
            let critical = false;
            let data = {
                actor: actor.name,
                actorId: actorId,
                weapon: weapon.name,
                weaponId: weapon.id
            };
            let settings = {};

            // if(weapon.data.data.size === "large") {
            //     extraDie = "+1d4";
            // }

            if (shiftKey) {
                settings.kind = "advantage";
            } else if (ctrlKey) {
                settings.kind = "disadvantage";
            }
            roll = new Roll(`${generateDieRollFormula(settings)}${extraDie}`);
            roll.evaluate()
                .then(() => {
                    critical = (roll.terms[0].results[0].result === 1);
                    data.roll = {
                        formula: roll.formula,
                        labels: { title: interpolate("TBSH.messages.titles.attackRoll") },
                        result: roll.total,
                        tested: true
                    };

                    data.roll.success = (actor.data.data.attributes[weapon.data.data.attribute] > data.roll.result);

                    if (!critical) {
                        data.roll.labels.result = interpolate(data.roll.success ? "TBSH.messages.labels.hit" : "TBSH.messages.labels.miss");
                    } else {
                        data.roll.labels.result = interpolate("TBSH.messages.labels.critical");
                    }

                    if (data.roll.success) {
                        let damageDie = null;

                        if (weapon.data.data.kind != "unarmed") {
                            damageDie = actor.data.data.damageDice.armed;
                        } else {
                            damageDie = actor.data.data.damageDice.unarmed;
                        }

                        if (damageDie !== "special") {
                            data.damage = {
                                actorId: actor.id,
                                critical: critical,
                                formula: `${generateDieRollFormula({ dieType: damageDie })}${extraDie}`,
                                weapon: weapon.name,
                                weaponId: weapon.id
                            };
                        }
                    }

                    showMessage(actor, "systems/tbsh/templates/messages/attack-roll.hbs", data);
                });
        } else {
            console.error(`Unable to locate weapon id '${weaponId} on actor '${actor.name}'.`);
        }
    } else {
        console.error(`Unable to locate an actor with the id '${actorId}'.`);
    }
}

export function logAttributeTest(actorId, attribute, shiftKey = false, ctrlKey = false) {
    let actor = game.actors.find((a) => a.id === actorId);

    if (actor) {
        let roll = null;
        let data = {
            actor: actor.name,
            actorId: actorId,
            attribute: interpolate(`TBSH.fields.labels.attributes.${attribute}.long`)
        };

        if (shiftKey) {
            roll = new Roll(generateDieRollFormula({ kind: "advantage" }));
        } else if (ctrlKey) {
            roll = new Roll(generateDieRollFormula({ kind: "disadvantage" }));
        } else {
            roll = new Roll(generateDieRollFormula());
        }
        roll.evaluate()
            .then(() => {
                
                var rollResult = `${roll.result}`;
                if(shiftKey || ctrlKey) {
                    rollResult += ` (${roll.dice[0].results[0].result} , ${roll.dice[0].results[1].result})`;
                }
                data.roll = {
                    formula: roll.formula,
                    labels: { title: interpolate("TBSH.messages.titles.attributeTest", { attribute: data.attribute }) },
                    result:roll.result,
                    tested: true
                };
                data.roll.success = (actor.data.data.attributes[attribute] > data.roll.result);
                data.roll.labels.result = `${interpolate(data.roll.success ? "TBSH.messages.labels.success" : "TBSH.messages.labels.failure")} ${rollResult}`;

                showMessage(actor, "systems/tbsh/templates/messages/attribute-test.hbs", data);
            });
    } else {
        console.error(`Unable to locate an actor with the id '${actorId}'.`);
    }
}

export function logDamageRoll(event) {
    let element = event.currentTarget;
    let rollData = element.dataset;
    
    if (rollData.formula && rollData.actor) {
        let actor = game.actors.find((a) => a.id === rollData.actor);
        let weapon = actor.items.find((i) => i.id === rollData.id);
        let data = {
            roll: {
                labels: { title: interpolate("TBSH.messages.titles.damageRoll") },
                tested: false
            }
        };
        let formula = rollData.formula;
        let roll = null;
        if (weapon && weapon.data.data.twoHanded) {
            var die = transformDie(formula);
            formula = generateDieRollFormula({ kind: "advantage", dieType: die });
        }
        if (rollData.critical === "true") {
            formula = `(${formula})*2`;
        }
        data.roll.formula = formula;
        roll = new Roll(formula)
        roll.evaluate()
            .then(() => {
                data.roll.result = roll.total;
                showMessage(actor, "systems/tbsh/templates/messages/damage-roll.hbs", data)
            });
    } else {
        console.error("Damage roll requested but requesting element did not have a damage formula attribute.");
    }

    return (false);
}
export function transformDie(die) {
    return die.substring(1, die.length);
}
export function logUsageDieRoll(itemId) {
    let actor = findActorFromItemId(itemId);

    if (actor) {
        let item = actor.items.find(i => i.id === itemId);

        if (item) {
            let usageDie = item.data.data.usageDie;
            let message = {
                actor: actor.name,
                actorId: actor.id,
                item: item.name,
                itemId: itemId,
                roll: {
                    labels: {
                        result: "",
                        title: interpolate("TBSH.messages.titles.usageDie")
                    },
                    tested: true
                }
            }

            if (usageDie.current !== "exhausted") {
                let die = (usageDie.current === "none" ? usageDie.maximum : usageDie.current)
                let roll = new Roll(generateDieRollFormula({ dieType: die }));

                roll.evaluate()
                    .then(() => {
                        message.roll.formula = roll.formula;
                        message.roll.result = roll.total;

                        if (roll.total < 3) {
                            let data = {
                                id: item.id,
                                data: {
                                    usageDie: {
                                        current: ""
                                    }
                                }
                            };
                            let oldDie = (usageDie.current === "none" ? usageDie.maximum : usageDie.current);

                            message.roll.success = false;
                            message.roll.labels.result = interpolate("TBSH.messages.labels.failure");

                            if (oldDie === "d4") {
                                message.exhausted = true;
                                data.data.usageDie.current = "exhausted";
                                data.data.quantity = item.data.data.quantity - 1;
                                if (data.data.quantity < 0) {
                                    data.data.quantity = 0;
                                }
                            } else {
                                switch (oldDie) {
                                    case "d6":
                                        data.data.usageDie.current = "d4";
                                        break;
                                    case "d8":
                                        data.data.usageDie.current = "d6";
                                        break;
                                    case "d10":
                                        data.data.usageDie.current = "d8";
                                        break;
                                    case "d12":
                                        data.data.usageDie.current = "d10";
                                        break;
                                    case "d20":
                                        data.data.usageDie.current = "d12";
                                        break;
                                }
                                message.die = data.data.usageDie.current;
                            }
                            if (data.data.usageDie.current === "exhausted") {
                                message.exhausted = true;
                            } else {
                                message.downgraded = true;
                            }
                            item.update(data, { diff: true });
                        } else {
                            message.roll.success = true;
                            message.die = die;
                            message.roll.labels.result = interpolate("TBSH.messages.labels.success");
                        }

                        showMessage(actor, "systems/tbsh/templates/messages/usage-die.hbs", message);
                    });
            } else {
                console.error(`The usage die for the '${item.name}' item is already exhausted.`);
                ui.notifications.error(interpolate("tbsh.messages.errors.usageDieExhausted", { item: item.name }));
            }
        } else {
            console.error(`Failed to locate the equipment for the id ${itemId} on actor id ${actor.id}.`)
        }
    } else {
        console.error(`Failed to find the actor that owns equipment id ${itemId}.`);
    }
}
export function logUsageDoomDieRoll(itemId) {
    let actor = findActorFromItemId(itemId);

    if (actor) {
        let item = actor.items.find(i => i.id === itemId);
     
        if (item) {
            let usageDie = actor.data.data.doomDice;
            let message = {
                actor: actor.name,
                actorId: actor.id,
                item: item.name,
                itemId: itemId,
                roll: {
                    labels: {
                        result: "",
                        title: interpolate("TBSH.messages.titles.usageDie")
                    },
                    tested: true
                }
            }

            if (usageDie.current !== "exhausted") {
                let die = (usageDie.current === "none" ? usageDie.maximum : usageDie.current)
                let roll = new Roll(generateDieRollFormula({ dieType: die }));

                roll.evaluate()
                    .then(() => {
                        message.roll.formula = roll.formula;
                        message.roll.result = roll.total;

                        if (roll.total < 3) {
                            let data = {
                                id: item.id,
                                data: {
                                    usageDie: {
                                        current: ""
                                    }
                                }
                            };
                            let oldDie = (usageDie.current === "none" ? usageDie.maximum : usageDie.current);

                            message.roll.success = false;
                            message.roll.labels.result = interpolate("TBSH.messages.labels.failure");

                            if (oldDie === "d4") {
                                message.exhausted = true;
                                actor.data.data.doomDice = "exhausted";
                               
                            } else {
                                switch (oldDie) {
                                    case "d6":
                                        actor.data.data.doomDice.current = "d4";
                                        break;
                                    case "d8":
                                        actor.data.data.doomDice.current = "d6";
                                        break;
                                    case "d10":
                                        actor.data.data.doomDice.current = "d8";
                                        break;
                                    case "d12":
                                        actor.data.data.doomDice.current = "d10";
                                        break;
                                    case "d20":
                                        actor.data.data.doomDice.current = "d12";
                                        break;
                                }
                                message.die =actor.data.data.doomDice.current;
                            }
                            if (actor.data.data.doomDice.current === "exhausted") {
                                message.exhausted = true;
                            } else {
                                message.downgraded = true;
                            }
                            item.update(data, { diff: true });
                        } else {
                            message.roll.success = true;
                            message.die = die;
                            message.roll.labels.result = interpolate("TBSH.messages.labels.success");
                        }

                        showMessage(actor, "systems/tbsh/templates/messages/usage-die.hbs", message);
                    });
            } else {
                console.error(`The usage die for the '${item.name}' item is already exhausted.`);
                ui.notifications.error(interpolate("tbsh.messages.errors.usageDieExhausted", { item: item.name }));
            }
        } else {
            console.error(`Failed to locate the equipment for the id ${itemId} on actor id ${actor.id}.`)
        }
    } else {
        console.error(`Failed to find the actor that owns equipment id ${itemId}.`);
    }
}

export function showMessage(actor, templateKey, data) {
    getTemplate(templateKey)
        .then((template) => {
            let message = {
                speaker: ChatMessage.getSpeaker(),
                user: game.user
            };

            console.log("Template Data:", data);
            message.content = template(data);
            ChatMessage.create(message);
        });
}
