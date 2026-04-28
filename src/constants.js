(function (global) {
  "use strict";

  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const SIZE = 8;

  const colorName = {
    [BLACK]: "黑棋",
    [WHITE]: "白棋",
  };

  const RULES_TEXT = [
    "黑白棋规则说明",
    "",
    "1. 黑棋先手，双方轮流落子。",
    "2. 只能落在合法位置：落子后至少有一个方向能夹住对方棋子。",
    "3. 夹住的判断方向包括横、竖、斜共八个方向。",
    "4. 某个方向成立时，落子与己方棋子之间连续的对方棋子全部翻转。",
    "5. 如果当前玩家无棋可下，则自动跳过该回合。",
    "6. 双方都无棋可下，或棋盘已满，游戏结束。",
    "7. 结束时棋子更多的一方获胜，数量相同则平局。",
    "",
    "本项目中人机模式默认玩家执黑，AI 执白。",
  ].join("\n");

  const ALL_BITS = (1n << 64n) - 1n;

  function buildFileMask(col) {
    let mask = 0n;
    for (let row = 0; row < SIZE; row += 1) {
      mask |= 1n << BigInt(row * SIZE + col);
    }
    return mask;
  }

  const A_FILE = buildFileMask(0);
  const H_FILE = buildFileMask(SIZE - 1);
  const NOT_A_FILE = ALL_BITS ^ A_FILE;
  const NOT_H_FILE = ALL_BITS ^ H_FILE;
  const BIT_DIRECTIONS = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

  global.Reversi = {
    ...(global.Reversi || {}),
    constants: Object.freeze({
      EMPTY,
      BLACK,
      WHITE,
      SIZE,
      colorName,
      RULES_TEXT,
      ALL_BITS,
      NOT_A_FILE,
      NOT_H_FILE,
      BIT_DIRECTIONS,
    }),
  };
})(window);
