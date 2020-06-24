import { useState, useEffect } from "react";
import { observeChange } from "../observeChange";

export function useChangeObserver(propArray) {
	const [reactState, setReactState] = useState(propArray());
	useEffect(() => {
		observeChange(propArray, () => {
			setReactState(propArray());
		});
	}, []);
	return reactState;
}
