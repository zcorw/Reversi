(function (global) {
  "use strict";

  const { Board, Rules, ReversiAI, ReversiGame } = global.Reversi;
  const { EMPTY, BLACK, WHITE, SIZE } = global.Reversi.constants;

  global.ReversiDebug = Object.freeze({
    Board,
    Rules,
    ReversiAI,
    constants: Object.freeze({ EMPTY, BLACK, WHITE, SIZE }),
  });

  global.addEventListener("DOMContentLoaded", () => {
    new ReversiGame();
  });
})(window);
