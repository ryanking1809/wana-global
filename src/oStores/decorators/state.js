export function state(target, prop, descriptor) {
	!target.stateInitializers && (target.stateInitializers = {});
	target.stateInitializers[prop] = descriptor.initializer;
	return {
		get() {
			return this.state && this.state[prop];
		},
		set(val) {
			this.state && (this.state[prop] = val);
		}
	};
}