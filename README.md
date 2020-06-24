# wana-global

wana-global is global store backed by wana-obervables with built-in persistence and undo / redo functionality.

    npm install @ryki/wana-global

## How to use

For an example, let's build a basic sticky notes app.

```js
import { oStore, oClass, oHistory, state, derivative } from "@ryki/wana-global";
```

We will create the following class for our sticky notes. We must use the `@oStore` decorator and extend the `oClass`

All properties using the `@state` decorator will be stored in the global state, and all other state should derive from this.

```js
@oStore("Sticky")
class Sticky extends oClass {
	@state note = "This is a sticky note";
	@state firstName = "Mary"
	@state lastName = "Jane"
}
```

We can use a `@derivative` decorator to create additional values derived from the state. Whenever the state updates the derivative will know to update.

```js
@oStore("Sticky")
class Sticky extends oClass {
	@state note = "This is a sticky note";
	@state firstName = "Mary"
	@state lastName = "Jane"
	// use @derivative derived values
	@derivative
	get name {
		return `${this.firstName} ${this.lastName}`
	}
```

Adding undo / redo functionality in eve is super easy. In this case we're using the history helper to provide localised undo / redo functionality to each individual sticky note.

```js
@oStore("Sticky")
class Sticky extends oClass {
	@state note = "This is a sticky note";
	@state firstName = "Mary"
	@state lastName = "Jane"
	@derivative
	get name {
		return `${this.firstName} ${this.lastName}`
	}
	constructor() {
		super();
		// localised history
		this.history = new oHistory(() => this)
	}
```

Now you can just create some sticky notes and the collection will automically update.

### Persistance

You can serialize and replay any session.

```js
import { oState } from "@ryki/wana-global";
const snap = oState.snapshot();
// The 2nd argument is a playback speed multiplier
oState.apply(snap, 2);
```

### Undo / Redo

A history object can listen to any classes, instances, or properties with state to create undo / redo functionality.

```js
import { oHistory } from "@ryki/wana-global";
const history = new oHistory(() => Sticky);
// this will only undo Sticky class instances but no other instances
history.undo()
history.redo()
```

### React

wana-global is framework independant but a `useChangeObserver` component is available to react users.

```js
import { useChangeObserver } from "@ryki/wana-global";

function Sticky({ sticky }) {
	const [note] = useChangeObserver(() => [sticky.note]);
	const updateNote = useCallback((e) => {
		sticky.note = e.target.value
	})
	// this will automatically update whenever note changes
	return (
		<div className="sticky">
			<textarea
				value={note}
				onChange={updateNote}
			/>
		</div>
	);
}
```