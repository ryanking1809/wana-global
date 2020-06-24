import { auto, noto, o, watch } from "wana"
import { oState } from "./oState";

export const observeChange = (observableFunc, reactionFunc, options = {}) => {
    let init = false;
    let observables, lastChange;
    // history components only listen to recorded changes
    // other components can listen to any change
    const reaction = (change) => {
      change = options.useLog ? oState.latestLog : oState.latestChange;
      if (change === lastChange) return;
      lastChange = change;
      reactionFunc(change);
    };
    // listen to instance state rather than instances themselves
    const getObservables = () => {
      const oVals = observableFunc();
      if (Array.isArray(oVals)) {
      return observableFunc().map((obs) => {
        return (obs && obs._oClass) ? obs.state : obs
      });
      } else {
        return (oVals && oVals._oClass) ? oVals.state : oVals
      }
    }
    const observer = auto(() => {
		  // just call the obervable func and do nothing with it
		  // so it becomes observable
		  observables = o(getObservables());
      // run reaction funct in noto to prevent an accidental side effects
      if (!init && !options.init) {
        init = true
      } else {
        noto(() => reaction());
      }
    }, options);
    // also watch observables for deep changes
    const watcher = watch(observables, reaction);
    return {auto: observer, watch: watcher, dispose: () => (observer.dispose() && watcher.dispose())};
}