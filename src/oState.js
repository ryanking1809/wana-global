import { stringify, parse } from "deserializable";
import cuid from "cuid";
import { o, globals, no, $O } from "wana";
import { oStores } from "./oStores/decorators/oStore";
import { $path } from "./symbols"

const normalChangeContext = { type: "normal" };
let changeContext = normalChangeContext;
const setChangeContext = (context = normalChangeContext) => {
		changeContext = context;
	};

const defaultStoresState = () => {
	const storesState = {};
	storesState[$path] = ["stores"];
	return storesState;
}

export const oState = {
	latestChange: null,
	base: o({
			_session: {
				id: cuid(),
				ts: Date.now(),
				log: [],
			},
			stores: o(defaultStoresState()),
	}),
	get latestLog() {
		return oState.base._session.log[oState.base._session.log.length - 1];
	},
	snapshot: serialize => {
		const serialized = stringify(cleanStateValue(oState.base));
		return serialize ? serialized : parse(serialized, false);
	},
	apply: (snapshot, replaySpeed, callback) => {
		typeof snapshot === "string" && (snapshot = parse(snapshot, false));
		oState.reset();
		if (!replaySpeed) {
			snapshot._session.log.forEach((l) => oState.applyChange(l));
			callback && callback()
		} else {
			snapshot._session.log.forEach((l, i) => {
			setTimeout(() => {
				oState.applyChange(l);
				i === snapshot._session.log.length - 1 && callback && callback();
			}, (l.ts - snapshot._session.ts) / replaySpeed);
			});
		}
	},
	applyChange: ({id, type, op, path, prop, nextValue, prevValue}, inverse) => {
		// changeContext is used by history components to know what to update
		setChangeContext({ type, ref: id });
		let target;
		let observable = true;
		if (path[0] === "stores" && path.length === 1) {
			target = oState.base.stores;
			op += "Store"
		} else if(path[0] === "stores" && path.length === 2) {
			target = oStores[path[1]];
			op += "Instance";
			observable = false;
		} else {
			target = oState.base;
			path.forEach((p) => {
				target = target[p];
			});
		}
		applyOp[inverse ? inverseOp[op] : op](
			target,
			prop,
			parseStateValue(inverse ? prevValue : nextValue, observable),
			parseStateValue(inverse ? nextValue : prevValue, observable)
		);
		setChangeContext();
	},
	reset: () => {
		// remove observables
		oState.base[$O].forEach((obs) => {
			obs.forEach((ob) => ob.dispose());
		});
		Object.values(oStores).forEach((store) => {
			Object.values(store.instances).forEach((inst) => inst.dispose());
			delete oState.base.stores[store._name];
			oState.base.stores[store._name] = o({});
		});
		oState.base = o({
			...oState.base,
			_session: {
				id: cuid(),
				ts: Date.now(),
				log: [],
			},
		});
	}
};

globals.onChange = (change) => {
	oState.latestChange = change;
	if (change.target[$path] && typeof change.key !== "symbol") {
      	// need to clone the values so they're not borked up after mutation
		let nextValue = cleanStateValue(change.value);
      	let prevValue = cleanStateValue(change.oldValue);
		const log = {
			id: changeContext.ref || cuid(),
			op: change.op,
			prop: change.key,
			path: change.target[$path],
			nextValue,
			prevValue,
			ts: Date.now(),
			type: changeContext.type,
		};
		oState.base._session.log.push(log);
	}
};

const cleanStateValue = (val) => {
	if (!val) return val;
	// we store references to objects rather than the object itself
	if (val._oClass) return { oRef: val[$path] };
	if (val && typeof val === "object") {
		if (Array.isArray(val)) {
			val = no([...val].map((v) => cleanStateValue(v)));
		} else {
			const v = {};
			Object.keys(val).forEach(
				(prop) => (v[prop] = cleanStateValue(val[prop]))
			);
			val = v;
		}
	}
	return val;
};

const parseStateValue = (val, observable = true) => {
	if (!val) return val;
	// we store references to objects rather than the object itself
	if (val.oRef && val.oRef[0] === "stores")
		return val.oRef[2]
			? oStores[val.oRef[1]].get(val.oRef[2])
			: oStores[val.oRef[1]];
	if (val && typeof val === "object") {
		if (Array.isArray(val)) {
			val = [...val].map((v) => parseStateValue(v, observable));
		} else {
			const v = {};
			Object.keys(val).forEach(
				(prop) => (v[prop] = parseStateValue(val[prop], observable))
			);
			val = v;
		}
	}
	return observable ? o(val) : val;
};

const inverseOp = {
	add: "remove",
	replace: "replace",
	splice: "splice",
	remove: "add",
	addStore: "removeStore",
	addInstance: "removeInstance",
	removeStore: "addStore",
	removeInstance: "addInstance",
};

const applyOp = {
	add: (target, prop, val) => {
		target[prop] = val;
	},
	replace: (target, prop, val) => {
		target[prop] = val;
	},
	splice: (target, prop, val, prevVal) => {
		target.splice(prop, prevVal.length, ...val);
	},
	remove: (target, prop, val) => {
		delete target[prop];
	},
	addStore: (target, prop, val) => {
		target[prop] = val;
	},
	addInstance: (target, prop, val) => {
		new target({id: prop, ...val});
	},
	removeStore: (target, prop, val) => {
		target[prop] = val;
	},
	removeInstance: (target, prop, val) => {
		target.get(prop).dispose();
	},
};
