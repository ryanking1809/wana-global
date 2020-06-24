export function derivative(...args) {
    if (args.length === 3) {
        return decorator(...args);
    }
    return (target, prop, descriptor) => decorator(target, prop, descriptor, args[0]);
}


function decorator(target, prop, descriptor, observer) {
	!target.stateDerivatives && (target.stateDerivatives = {});
	target.stateDerivatives[prop] = {
		getter: descriptor.get,
		observer: observer,
	};
	return {};
};