import { MortalActorSheet } from "./mortal-actor-sheet.js";
import ActionHelper from "../scripts/action-helpers.js";
import { Rote } from "../dialogs/dialog-aretecasting.js";
import { DialogAreteCasting } from "../dialogs/dialog-aretecasting.js";

export class MageActorSheet extends MortalActorSheet {
	
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["mage"],
			template: "systems/worldofdarkness/templates/actor/mage-sheet.html",
			tabs: [{
				navSelector: ".sheet-tabs",
				contentSelector: ".sheet-body",
				initial: "core",
			},
			{
				navSelector: ".sheet-spec-tabs",
				contentSelector: ".sheet-spec-body",
				initial: "normal",
			},
			{
				navSelector: ".sheet-setting-tabs",
				contentSelector: ".sheet-setting-body",
				initial: "attributes",
			}]
		});
	}
  
	constructor(actor, options) {
		super(actor, options);

		this.locked = true;
		this.isCharacter = true;	
		this.isGM = game.user.isGM;	
		
		console.log("WoD | Mage Sheet constructor");
	}

	/** @override */
	getData() {
		const actorData = duplicate(this.actor);

		if (!actorData.data.settings.created) {
			if (actorData.type == "Mage") {
				ActionHelper._setMageAbilities(actorData);
				ActionHelper._setMortalAttributes(actorData);
				actorData.data.settings.created = true;
				this.actor.update(actorData);
			}	 	
		}

		const data = super.getData();

		console.log("WoD | Mage Sheet getData");

		const rotes = [];

		for (const i of data.items) {
			if (i.type == "Rote") {
				rotes.push(i);
			}
		}

		data.actor.rotes = rotes;

		if (actorData.type == "Mage") {
			console.log("Mage");
			console.log(data.actor);
		}

		return data;
	}

	/** @override */
	get template() {
		console.log("WoD | Mage Sheet get template");
		
		return "systems/worldofdarkness/templates/actor/mage-sheet.html";
	}
	
	/** @override */
	activateListeners(html) {
		super.activateListeners(html);		

		// Rollable stuff
		html
			.find(".vrollable")
			.click(this._onRollMageDialog.bind(this));

		html
			.find(".macroBtn")
			.click(this._onRollMageDialog.bind(this));

		html
			.find(".resource-value > .resource-value-step")
			.click(this._onDotCounterMageChange.bind(this));
		html
			.find(".resource-value > .resource-value-empty")
			.click(this._onDotCounterMageEmpty.bind(this));

		// quintessence
		html
			.find(".quintessence > .resource-counter > .resource-value-step")
			.click(this._onQuintessenceChange.bind(this));
		html
			.find(".quintessence > .resource-counter > .resource-value-step")
			.on('contextmenu', this._onParadoxChange.bind(this));

		console.log("WoD | Mage Sheet activateListeners");
	}

	_onRollMageDialog(event) {		
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		if (dataset.type != "Mage") {
			return;
		}

		if (dataset.rollarete == "true") {
			let rote = new Rote(undefined);

			let areteCasting = new DialogAreteCasting(this.actor, rote);
			areteCasting.render(true);

			return;
		}	
		if (dataset.rollparadox == "true") {
			ActionHelper.RollParadox(event, this.actor);

			return;
		}	
		
		ActionHelper.RollDialog(event, this.actor);
	}

	_onDotCounterMageEmpty(event) {
		console.log("WoD | Mage Sheet _onDotCounterEmpty");
		
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;
		const type = dataset.type;

		if (type != "Mage") {
			return;
		}

		const parent = $(element.parentNode);
		const fieldStrings = parent[0].dataset.name;
		const fields = fieldStrings.split(".");
		const steps = parent.find(".resource-value-empty");
		
		if (this.locked) {
			return;
		}

		steps.removeClass("active");
		
		steps.each(function (i) {
			if (i <= 0) {
				$(this).addClass("active");
			}
		});	

		this._assignToMage(fields, 0);
	}
	
	_onDotCounterMageChange(event) {
		console.log("WoD | Mage Sheet _onDotCounterMageChange");
		
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;
		const type = dataset.type;

		if (type != "Mage") {
			return;
		}

		if (this.locked) {
			ui.notifications.warn(game.i18n.localize("wod.system.sheetlocked"));
			return;
		}

		const parent = $(element.parentNode);
		const index = Number(dataset.index);
		const fieldStrings = parent[0].dataset.name;
		const fields = fieldStrings.split(".");		
		const steps = parent.find(".resource-value-step");

		if (index < 0 || index > steps.length) {
			return;
		}

		steps.removeClass("active");

		steps.each(function (i) {
			if (i <= index) {
				$(this).addClass("active");
			}
		});

		this._assignToMage(fields, index + 1);
	}

	_onQuintessenceChange(event) {
		console.log("WoD | Update Quintessence");

		event.preventDefault();

		const element = event.currentTarget;
		const oldState = element.dataset.state || "";
		const states = parseCounterStates("Ψ:quintessence,x:paradox,*:permanent_paradox");

		const allStates = ["", ...Object.keys(states)];
		const currentState = allStates.indexOf(oldState);
		
		if (currentState < 0) {
			return;
		}
		
		const actorData = duplicate(this.actor);

		if (oldState == "") {
			actorData.data.quintessence.temporary = parseInt(actorData.data.quintessence.temporary) + 1;
		}
		// else if (oldState == "x") {
		// 	actorData.data.paradox.temporary = parseInt(actorData.data.paradox.temporary) - 1;
		// }
		else if (oldState == "Ψ") { 
			actorData.data.quintessence.temporary = parseInt(actorData.data.quintessence.temporary) - 1;			
		}
		else {
			return;
		}

		ActionHelper._handleCalculations(actorData);
		ActionHelper.handleMageCalculations(actorData);

		this.actor.update(actorData);
	}

	_onParadoxChange(event) {
		console.log("WoD | Update Paradox");

		event.preventDefault();

		const element = event.currentTarget;
		const oldState = element.dataset.state || "";
		const states = parseCounterStates("Ψ:quintessence,x:paradox,*:permanent_paradox");

		const allStates = ["", ...Object.keys(states)];
		const currentState = allStates.indexOf(oldState);
		
		if (currentState < 0) {
			return;
		}
		
		const actorData = duplicate(this.actor);

		if (oldState == "") {
			actorData.data.paradox.temporary = parseInt(actorData.data.paradox.temporary) + 1;
		}
		else if (oldState == "x") {
			actorData.data.paradox.temporary = parseInt(actorData.data.paradox.temporary) - 1;
		}
		else if (oldState == "*") {
			return;
		}
		else if ((oldState == "Ψ") && (parseInt(actorData.data.quintessence.temporary) + parseInt(actorData.data.paradox.temporary) + parseInt(actorData.data.paradox.permanent) + 1 > 20)) { 
			actorData.data.quintessence.temporary = parseInt(actorData.data.quintessence.temporary) - 1;	
			actorData.data.paradox.temporary = parseInt(actorData.data.paradox.temporary) + 1;		
		}
		else if (oldState == "Ψ") {
			actorData.data.quintessence.temporary = parseInt(actorData.data.quintessence.temporary) - 1;
		}
		else {
			return;
		}

		ActionHelper._handleCalculations(actorData);
		ActionHelper.handleMageCalculations(actorData);

		this.actor.update(actorData);
	}	

	_assignToMage(fields, value) {
		console.log("WoD | Mage Sheet _assignToMage");
		
		const actorData = duplicate(this.actor);

		if (fields[2] === "arete") {
			actorData.data.arete.permanent = value;
		}
		if (fields[1] === "spheres") {
			actorData.data.spheres[fields[2]].value = value;
		}

		ActionHelper._handleCalculations(actorData);
		ActionHelper.handleMageCalculations(actorData);
		
		console.log("WoD | Mage Sheet updated");
		this.actor.update(actorData);
	}
}

function parseCounterStates(states) {
	return states.split(",").reduce((obj, state) => {
	  const [k, v] = state.split(":");
	  obj[k] = v;
	  return obj;
	}, {});
  }