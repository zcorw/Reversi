(function (global) {
  "use strict";

  class GameHistory {
    constructor() {
      this.past = [];
      this.future = [];
    }

    remember(snapshot) {
      this.past.push(snapshot);
      this.future = [];
    }

    undo(currentSnapshot) {
      if (this.past.length === 0) return null;
      this.future.push(currentSnapshot);
      return this.past.pop();
    }

    redo(currentSnapshot) {
      if (this.future.length === 0) return null;
      this.past.push(currentSnapshot);
      return this.future.pop();
    }

    clear() {
      this.past = [];
      this.future = [];
    }
  }

  global.Reversi.GameHistory = GameHistory;
})(window);
