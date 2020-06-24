import { oState } from "../../oState";
import { o } from "wana";
import { $path } from "../../symbols";

export let oStores = {}

export function oStore(name) {
	return function decorator(Class) {
		return extendClass(name, Class);
	};
}

const extendClass = (name, Class) => {
    Class._name = name;
    Class[$path] = ["stores", name];
    Class.instances = o({});
    Class.get = (instanceId) => Class.instances[instanceId];
    const state = {}
    state[$path] = ["stores", name];
    oState.base.stores[name] = o(state);
    Class.state = oState.base.stores[name];
    Class._oClass = true;
    oStores[name] = Class;
	return Class;
};