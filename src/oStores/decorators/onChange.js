export function onChange(observer) {
			return function decorator(target, prop, descriptor) {
				!target.stateObservers && (target.stateObservers = {});
				target.stateObservers[prop] = {
					action: descriptor.value,
					observer: observer,
				};
				return descriptor;
			};
		}

