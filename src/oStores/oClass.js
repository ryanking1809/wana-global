import cuid from "cuid";
import { oState } from "../oState";
import { o, noto, $O, no } from "wana";
import { observeChange } from "../observeChange";
import { $path } from "../symbols";

export class oClass {
	constructor(props = {}) {
		this._oClass = true;
		this._oClassInstance = true;
		this._observers = [];
		this.id = props.id || cuid();
		this[$path] = [...this._store[$path], this.id];
		this._store.instances[this.id] = this;
		this._initializeState(props);
		this._initDerivatives();
		this._initObservers();
	}
        
	get _store() {
		return this.__proto__.constructor;
	}
	_initializeState(props) {
		// all @state vals are recorded globally
		const stateInitializers = this.__proto__.stateInitializers;
		if (!stateInitializers || this.state) return;
		let storeState = {};
		storeState[$path] = this[$path];
		Object.keys(stateInitializers).forEach(
			(prop) => {
				let stateVal = props[prop] || stateInitializers[prop]();
				storeState[prop] = parseStateVal(prop, stateVal, this[$path]);
			}
		);
		oState.base.stores[this._store._name][this.id] = o(storeState);
	}
	_initDerivatives() {
		const stateDerivatives = this.__proto__.stateDerivatives;
		if (!stateDerivatives) return;
		Object.keys(stateDerivatives).forEach((prop) => {
			if (!stateDerivatives[prop].observer) {
				const getter = o(
					stateDerivatives[prop].getter.bind(this)
				);
				Object.defineProperty(this, prop, {
					get: getter,
				});
				this._observers.push(getter);
			} else {
				// @derivative that listens to specific changes
				const getter = o(() => {
					stateDerivatives[prop].observer(this);
					return noto(() =>
						stateDerivatives[prop].getter.bind(this)()
					);
				});
				Object.defineProperty(this, prop, {
					get: getter,
				});
				this._observers.push(getter);
			}
		});
	}
	_initObservers() {
		const stateObservers = this.__proto__.stateObservers;
		if (!stateObservers) return;
		Object.keys(stateObservers).forEach((prop) => {
			const obs = observeChange(
				() => stateObservers[prop].observer(this),
				this[prop].bind(this)
			);
			this._observers.push(obs);
		});
	}
	get state() {
		if(this.staticState) return this.staticState;
		let source = oState.base;
		this[$path].forEach((path) => {
			source && (source = source[path]);
		});
		return source;
	}
	set state(val) {
		this.staticState = val;
	}
	dispose() {
		// try to remove observers and replace temporary state
		// in case instance is still referenced somewhere
		this._observers.forEach(obs => obs.dispose())
		const tempState = no({...this.state});
		this.state = tempState;
		delete this._store.instances[this.id];
		delete oState.base.stores[this._store._name][this.id];
		this.state &&
			this.state[$O] &&
			this.state[$O].forEach((obs) => {
				obs.forEach((ob) => ob.dispose());
			});
	}
}

const parseStateVal = (prop, val, parentPath) => {
	// make @state vals deep observable
	if (!val) return val;
	if (val._oClass) return val;
	if (prop === $path) return val
	if (val && typeof val === "object") {
		if (val instanceof Set) {
			const path = [...parentPath, prop];
			val = new Set([...val].map((v) => parseStateVal(v, v, path)));
			val[$path] = path;
		} else if(val instanceof Map) {
			const path = [...parentPath, prop];
			val = new Map(val.entries().map(([k, v]) => parseStateVal(k, v, path)));
			val[$path] = path;
		} else if (Array.isArray(val)) {
			const path = [...parentPath, prop];
			val = [...val].map((v, i) => parseStateVal(i, v, path));
			val[$path] = path;
		} else {
			const v = {};
			v[$path] = [...parentPath, prop];
			Object.keys(val).forEach(
				(prop) => (v[prop] = parseStateVal(prop, val[prop], v[$path]))
			);
			val = v;
		}
	}
	return o(val);
}