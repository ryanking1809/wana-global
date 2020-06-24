import { oState } from "./oState"
import cuid from "cuid";
import { observeChange } from "./observeChange";

export const oHistories = {};

export class oHistory {
  constructor(observables, tolerance = 500) {
    this.id = cuid();
    oHistory.instances[this.id] = this;
    this.changes = new Map();
    this.undone = new Map();
    this.tolerance = tolerance;
    this.observer = observeChange(observables, (change) => {
      if (change.type === "normal") {
        this.addChange(change);
      } else if (change.type === "undo") {
        this.undoChange(this.changes.get(change.id));
      } else if (change.type === "redo") {
        this.redoChange(this.undone.get(change.id));
      }
    }, {sync: true, useLog: true});
  }
  addChange(change) {
    this.changes.set(change.id, change)
  }
  undoChange(change) {
    if (!change) return;
    this.changes.delete(change.id)
    this.undone.set(change.id, change)
  }
  redoChange(change) {
    if (!change) return;
    this.undone.delete(change.id);
    this.changes.set(change.id, change);
  }
  getLatestChanges(changeLog = this.changes) {
    let changes = []
    let firstTs = null;
    for (let change of Array.from(changeLog.values()).reverse()) {
      if (!firstTs) {
        firstTs = change.ts;
        changes.push(change)
      } else if(Math.abs(firstTs - change.ts) < this.tolerance) {
        changes.push(change)
      } else {
        break;
      }
    }
    return changes
  }
  undo() {
    const changes = this.getLatestChanges(this.changes);
    if (!changes.length) return;
    changes.forEach(change => {
      oState.applyChange({ ...change, type: "undo" }, true);
    })
  }
  redo() {
    const changes = this.getLatestChanges(this.undone);
    if (!changes.length) return;
    changes.forEach((change) => {
      oState.applyChange({ ...change, type: "redo" }, true);
    });
  }
}

oHistory.instances = {};