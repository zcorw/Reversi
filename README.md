# 黑白棋 Reversi

这是一个使用 HTML、CSS 和 JavaScript 实现的浏览器版黑白棋。项目目标是把原始设计说明中的“棋盘、棋子、规则、落子管理、空间计算”等概念落地为一个可直接运行、可交互、可继续扩展的小游戏。

## 项目意图

黑白棋的核心不在绘制棋盘，而在于稳定地计算“当前玩家能在哪里落子”和“落子后哪些棋子需要翻转”。本项目保留原 README 中提出的模块化思路，但为了适合浏览器端开发，采用清晰的 JavaScript 类和函数组织：

* `Board`：维护 8x8 棋盘数据、读取和写入棋子、统计比分。
* `Rules`：计算合法落点、翻转路径、换手、跳过回合和终局。
* `GameHistory`：记录每一步棋局快照，支持悔棋和重做。
* `ReversiGame`：连接规则、棋盘状态和页面渲染，处理用户操作。

棋盘底层使用两个 64 位 BigInt 位棋盘保存：

* `blackBits`：黑棋所在位置。
* `whiteBits`：白棋所在位置。
* 空格通过 `ALL_BITS ^ (blackBits | whiteBits)` 计算得到。

棋盘坐标仍然按 `(row, col)` 暴露给 UI，内部位序号为 `row * 8 + col`。例如左上角是第 0 位，右下角是第 63 位。这样页面渲染和测试仍能用直观坐标，规则层则可以使用位移和按位运算批量计算合法落点。

## 位棋盘记录方式

8x8 棋盘一共有 64 个格子，正好可以用一个 64 位二进制数表示。每个 bit 对应一个棋盘格：

```text
row\col  0   1   2   3   4   5   6   7
0        0   1   2   3   4   5   6   7
1        8   9  10  11  12  13  14  15
2       16  17  18  19  20  21  22  23
3       24  25  26  27  28  29  30  31
4       32  33  34  35  36  37  38  39
5       40  41  42  43  44  45  46  47
6       48  49  50  51  52  53  54  55
7       56  57  58  59  60  61  62  63
```

坐标 `(row, col)` 对应的 bit 位置为：

```js
const index = row * 8 + col;
const bit = 1n << BigInt(index);
```

项目用两个位棋盘分别记录双方棋子：

```js
blackBits // 所有黑棋所在格，对应 bit 为 1
whiteBits // 所有白棋所在格，对应 bit 为 1
```

如果某一格有黑棋，则该格在 `blackBits` 中为 `1`，在 `whiteBits` 中为 `0`。如果某一格有白棋，则该格在 `whiteBits` 中为 `1`，在 `blackBits` 中为 `0`。如果两者都是 `0`，说明该格为空。

例如初始棋局：

```text
黑棋：(3,4)、(4,3)
白棋：(3,3)、(4,4)
```

对应 bit：

```text
(3,4) => 3 * 8 + 4 = 28
(4,3) => 4 * 8 + 3 = 35
(3,3) => 3 * 8 + 3 = 27
(4,4) => 4 * 8 + 4 = 36
```

因此初始值可以理解为：

```js
blackBits = (1n << 28n) | (1n << 35n);
whiteBits = (1n << 27n) | (1n << 36n);
```

读取某一格时，通过按位与判断：

```js
const bit = 1n << BigInt(row * 8 + col);

if ((blackBits & bit) !== 0n) {
  return BLACK;
}

if ((whiteBits & bit) !== 0n) {
  return WHITE;
}

return EMPTY;
```

写入某一格时，先从双方位棋盘中清掉该 bit，再按棋子颜色写入：

```js
blackBits &= ALL_BITS ^ bit;
whiteBits &= ALL_BITS ^ bit;

if (value === BLACK) {
  blackBits |= bit;
} else if (value === WHITE) {
  whiteBits |= bit;
}
```

空格也不需要单独保存，可以随时由双方棋子位棋盘反推：

```js
const emptyBits = ALL_BITS ^ (blackBits | whiteBits);
```

## 功能范围

当前实现包含：

* 标准 8x8 黑白棋棋盘。
* 黑棋先手，初始四子布局。
* 当前玩家提示。
* 点击“规则说明”按钮，用弹窗展示黑白棋规则。
* 合法落子位置提示。
* 点击合法位置落子并翻转被夹住的棋子。
* 人机对战模式，玩家默认执黑，AI 默认执白。
* AI 会优先占角，其次占边，再考虑中间位置。
* AI 会避免落子后让对手获得角或边的合法落点。
* 在位置安全性相近时，AI 会选择让对手下一回合合法落点更少的位置。
* 页面保留本局中 AI 每次落子的推理过程，包括候选落点和评分明细。
* 自动跳过无棋可下的一方。
* 双方均无棋可下或棋盘已满时结束游戏。
* 黑白棋子数量统计和胜负提示。
* 悔棋、重做和重新开始。
* 最近落子高亮。
* 键盘可聚焦的棋盘格按钮，方便基本无障碍操作。

## 规则说明

一次合法落子必须满足以下条件：

1. 目标格为空。
2. 从目标格向横、竖、斜八个方向之一出发，第一颗相邻棋子必须是对方棋子。
3. 沿该方向继续前进，若中间全是对方棋子，并最终遇到己方棋子，则该方向成立。
4. 至少有一个方向成立，落子才合法。

落子后，所有成立方向上被夹住的对方棋子都会翻转为当前玩家颜色。

换手规则：

* 正常落子后切换到对手。
* 如果对手没有合法落点，但当前玩家仍有合法落点，则跳过对手回合。
* 如果双方都没有合法落点，游戏结束。

人机对战规则：

* 玩家执黑先手，AI 执白后手。
* 玩家只能在自己的回合点击棋盘。
* 进入 AI 回合后，页面短暂停顿并显示 AI 正在思考。
* AI 从所有合法落点中选择一个位置，优先级为角、大于边、大于中间。
* AI 会模拟落子后的棋盘，如果玩家下一回合可以下角或边，该候选落点会被降权。
* 在位置价值和安全性接近时，AI 会继续压缩玩家下一回合的合法落点数量。
* AI 每次落子前都会生成一段推理文本，追加到“AI 推理过程”区域；重新开始棋局时清空。

## 落子逻辑规则

落子逻辑分为三层：用位棋盘批量计算全部合法落点、判断单个位置会翻转哪些棋子、执行落子并换手。

### 1. 位棋盘方向和边界

位棋盘通过八个方向的位移表示相邻格。横向和斜向移动时需要用 A 列、H 列掩码避免跨行串位：

```js
const ALL_BITS = (1n << 64n) - 1n;
const A_FILE = buildFileMask(0);
const H_FILE = buildFileMask(SIZE - 1);
const NOT_A_FILE = ALL_BITS ^ A_FILE;
const NOT_H_FILE = ALL_BITS ^ H_FILE;
const BIT_DIRECTIONS = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

static shift(bits, direction) {
  switch (direction) {
    case "N":
      return bits >> 8n;
    case "S":
      return (bits << 8n) & ALL_BITS;
    case "E":
      return ((bits & NOT_H_FILE) << 1n) & ALL_BITS;
    case "W":
      return (bits & NOT_A_FILE) >> 1n;
    case "NE":
      return (bits & NOT_H_FILE) >> 7n;
    case "NW":
      return (bits & NOT_A_FILE) >> 9n;
    case "SE":
      return ((bits & NOT_H_FILE) << 9n) & ALL_BITS;
    case "SW":
      return ((bits & NOT_A_FILE) << 7n) & ALL_BITS;
    default:
      return 0n;
  }
}
```

### 2. 批量计算当前玩家全部合法落点

合法落点不再逐格遍历整张棋盘。当前实现以己方棋子为起点，沿八个方向批量推进：

1. 从己方棋子向某方向移动一步，筛出相邻的对方棋子。
2. 继续沿该方向扩展对方棋子链。
3. 链条尽头如果是空格，该空格就是这个方向上的合法落点。
4. 八个方向的结果用按位或合并。

当前实现代码在 `app.js` 的 `Rules.legalMoveBits`：

```js
static legalMoveBits(board, player) {
  const self = Rules.playerBits(board, player);
  const other = Rules.opponentBits(board, player);
  const empty = Rules.emptyBits(board);
  let moves = 0n;

  for (const direction of BIT_DIRECTIONS) {
    let candidates = Rules.shift(self, direction) & other;
    for (let i = 0; i < SIZE - 3; i += 1) {
      candidates |= Rules.shift(candidates, direction) & other;
    }
    moves |= Rules.shift(candidates, direction) & empty;
  }

  return moves;
}
```

当前实现代码在 `app.js` 的 `Rules.legalMoves`：

```js
static legalMoves(board, player) {
  const moves = new Map();
  for (const { row, col } of Rules.bitsToCoordinates(Rules.legalMoveBits(board, player))) {
    const flips = Rules.flipsForMove(board, row, col, player);
    moves.set(`${row},${col}`, { row, col, flips });
  }
  return moves;
}
```

这里使用 `Map` 保存合法落点，键为 `"row,col"`，值中同时保存该位置会翻转的棋子列表。这样点击棋盘时可以直接查表，不需要重复计算当前点击位置。

### 3. 判断单个位置的翻转棋子

合法落点已经由位棋盘批量得到，但执行落子时仍需要知道具体翻转坐标。`flipsForMove` 会从落子位开始沿八个方向位移，收集连续的对方棋子，直到遇到己方棋子时确认该方向成立。

当前实现代码在 `app.js` 的 `Rules.flipsForMove`：

```js
static flipsForMove(board, row, col, player) {
  if (!Rules.inside(row, col)) {
    return [];
  }

  const moveBit = Rules.bit(row, col);
  if ((Rules.emptyBits(board) & moveBit) === 0n) {
    return [];
  }

  const self = Rules.playerBits(board, player);
  const other = Rules.opponentBits(board, player);
  const flips = [];

  for (const direction of BIT_DIRECTIONS) {
    let captured = 0n;
    let cursor = Rules.shift(moveBit, direction);

    while (cursor !== 0n && (cursor & other) !== 0n) {
      captured |= cursor;
      cursor = Rules.shift(cursor, direction);
    }

    if (captured !== 0n && (cursor & self) !== 0n) {
      for (const coordinate of Rules.bitsToCoordinates(captured)) {
        flips.push([coordinate.row, coordinate.col]);
      }
    }
  }

  return flips;
}
```

### 4. 执行落子

用户点击棋盘后，游戏先检查该坐标是否存在于合法落点表中。如果不存在，直接忽略；如果存在，则执行以下步骤：

1. 保存当前快照，用于悔棋。
2. 在点击位置放入当前玩家棋子。
3. 将 `flips` 中记录的所有对方棋子改为当前玩家棋子。
4. 记录最近落子位置。
5. 根据双方可落点计算是否换手、跳过或结束。
6. 重新渲染页面。

当前实现代码在 `app.js` 的 `ReversiGame.play`：

```js
play(row, col) {
  if (this.finished || this.isAiTurn()) return;

  const legalMoves = Rules.legalMoves(this.board, this.currentPlayer);
  const move = legalMoves.get(`${row},${col}`);
  if (!move) return;

  this.commitMove(move);
}
```

实际写入棋盘由 `Rules.applyMove` 完成：

```js
static applyMove(board, move, player) {
  board.set(move.row, move.col, player);
  for (const [flipRow, flipCol] of move.flips) {
    board.set(flipRow, flipCol, player);
  }
}
```

```js
commitMove(move) {
  this.history.remember(this.snapshot());
  Rules.applyMove(this.board, move, this.currentPlayer);
  this.lastMove = { row: move.row, col: move.col };
  this.advanceTurn();
  this.render();
  this.scheduleAiMove();
}
```

### 5. 换手、跳过和终局

落子后并不是无条件切换玩家，而是先判断对方是否有合法落点：

* 对方有合法落点：切换到对方。
* 对方没有合法落点，当前玩家仍有合法落点：对方跳过，当前玩家继续。
* 双方都没有合法落点，或棋盘已满：游戏结束。

当前实现代码在 `app.js` 的 `ReversiGame.advanceTurn`：

```js
advanceTurn() {
  const opponent = Rules.opponent(this.currentPlayer);
  const opponentMoves = Rules.legalMoves(this.board, opponent);
  const currentMoves = Rules.legalMoves(this.board, this.currentPlayer);
  const score = this.board.count();

  if (score.empty === 0 || (opponentMoves.size === 0 && currentMoves.size === 0)) {
    this.finished = true;
    this.message = this.resultMessage(score);
    return;
  }

  if (opponentMoves.size === 0) {
    this.message = `${colorName[opponent]}无棋可下，${colorName[this.currentPlayer]}继续。`;
    return;
  }

  this.currentPlayer = opponent;
  this.message = "";
}
```

### 6. AI 落子策略

AI 使用一层模拟评分。目标不是当前一步翻最多棋子，而是优先获得稳定位置，并尽量避免把角或边交给对手。计算方式如下：

1. 取出 AI 当前所有合法落点。
2. 对候选落点按位置加分：角最高，边次之，中间最低。
3. 对每个候选落点复制一份棋盘。
4. 在复制棋盘上模拟 AI 落子和翻转。
5. 计算对手在模拟棋盘上的合法落点。
6. 如果对手可以下角或边，则对该候选落点扣分，角的扣分高于边。
7. 继续按对手合法落点数量扣分，保留“让对手选择更少”的策略。
8. 若仍接近，则翻转棋子更多的位置略微占优。

当前实现将策略拆成两个入口：

* `ReversiAI.analyzeMoves`：返回最终落点和所有候选落点评分明细，用于 UI 展示推理过程。
* `ReversiAI.chooseMove`：只返回最终落点，便于测试和复用。

核心实现代码在 `app.js`：

```js
class ReversiAI {
  static isCorner(row, col) {
    return (
      (row === 0 || row === SIZE - 1) &&
      (col === 0 || col === SIZE - 1)
    );
  }

  static isEdge(row, col) {
    return row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1;
  }

  static positionScore(move) {
    if (ReversiAI.isCorner(move.row, move.col)) return 1200;
    if (ReversiAI.isEdge(move.row, move.col)) return 260;
    return 0;
  }

  static opponentAccessDetails(moves) {
    let penalty = 0;
    let cornerCount = 0;
    let edgeCount = 0;
    for (const move of moves.values()) {
      if (ReversiAI.isCorner(move.row, move.col)) {
        penalty += 1000;
        cornerCount += 1;
      } else if (ReversiAI.isEdge(move.row, move.col)) {
        penalty += 140;
        edgeCount += 1;
      }
    }
    return { penalty, cornerCount, edgeCount };
  }

  static analyzeMoves(board, player) {
    const moves = Array.from(Rules.legalMoves(board, player).values());
    if (moves.length === 0) {
      return { move: null, candidates: [] };
    }

    const opponent = Rules.opponent(player);
    let bestCandidate = null;
    const candidates = [];

    for (const move of moves) {
      const simulatedBoard = new Board();
      simulatedBoard.loadBits(board.cloneBits());
      Rules.applyMove(simulatedBoard, move, player);

      const opponentMoves = Rules.legalMoves(simulatedBoard, opponent);
      const positionScore = ReversiAI.positionScore(move);
      const opponentAccess = ReversiAI.opponentAccessDetails(opponentMoves);
      const mobilityPenalty = opponentMoves.size * 18;
      const flipScore = move.flips.length;
      const score = positionScore - opponentAccess.penalty - mobilityPenalty + flipScore;
      const candidate = {
        move,
        score,
        positionScore,
        opponentCornerMoves: opponentAccess.cornerCount,
        opponentEdgeMoves: opponentAccess.edgeCount,
        opponentMoveCount: opponentMoves.size,
        opponentAccessPenalty: opponentAccess.penalty,
        mobilityPenalty,
        flipScore,
      };

      candidates.push(candidate);
      if (!bestCandidate || candidate.score > bestCandidate.score) {
        bestCandidate = candidate;
      }
    }

    return { move: bestCandidate.move, candidates, bestCandidate };
  }

  static chooseMove(board, player) {
    return ReversiAI.analyzeMoves(board, player).move;
  }
}
```

实际落子仍然复用普通落子的规则执行函数，避免 AI 和玩家拥有两套不一致的翻转逻辑。

AI 推理过程由 `ReversiAI.analyzeMoves` 返回完整候选信息，再由页面格式化展示。每个候选落点会展示位置分、对手边角机会、对手机动性、翻子数量和总分。

页面展示格式示例：

```text
第 1 次 AI 推理
当前执棋：白棋
候选落点：3 个
最终选择：3行3列，总分 -54
评分规则：角 +1200，边 +260；给对手角 -1000/个，给对手边 -140/个；对手每个合法落点 -18；每翻 1 子 +1。
候选明细：
3行3列 => 总分 -54 (位置 +0, 对手角 0, 对手边 0, 对手可落 3, 边角扣 0, 机动扣 54, 翻子 +0)
```

## 文件结构

```text
.
├── README.md
├── index.html
├── style.css
├── app.js
├── src
│   ├── constants.js
│   ├── board.js
│   ├── rules.js
│   ├── ai.js
│   ├── history.js
│   └── game.js
└── tests
    └── reversi.spec.js
```

文件职责：

* `src/constants.js`：棋子常量、位棋盘掩码、方向、规则弹窗文本。
* `src/board.js`：`Board` 位棋盘数据结构和读写统计。
* `src/rules.js`：黑白棋合法落点、翻转、落子规则。
* `src/ai.js`：AI 策略评分和候选落点分析。
* `src/history.js`：悔棋和重做历史栈。
* `src/game.js`：页面事件、渲染、回合流转和 AI 推理日志。
* `app.js`：页面入口，暴露测试调试对象并启动游戏。

## 运行方式

直接在浏览器中打开 `index.html` 即可运行。项目不依赖 npm、构建工具或后端服务。

也可以在项目目录中启动任意静态服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 测试

项目使用 Playwright 做端到端测试，测试文件位于 `tests/reversi.spec.js`。

测试覆盖：

* 页面初始化、标题、初始比分和合法落点。
* 人人对战模式下的落子和翻转。
* 人机对战模式下玩家落子后 AI 自动行动。
* 规则说明按钮会弹出规则文本。
* AI 落子后会展示并保留推理过程文本。
* AI 策略优先选择角，并通过模拟验证策略入口。

运行测试：

```bash
yarn test
```

查看 HTML 报告：

```bash
yarn test:report
```

## 后续扩展方向

* 增加玩家执白或 AI 先手选项。
* 增加 AI 难度选择，例如随机、贪心、角点优先、Minimax。
* 增加棋局性能基准测试，对比不同 AI 策略的搜索耗时。
* 增加棋谱导出和导入。
* 增加移动端触控细节优化和动画设置。
