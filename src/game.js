(function (global) {
  "use strict";

  const {
    BLACK,
    WHITE,
    EMPTY,
    SIZE,
    colorName,
    RULES_TEXT,
    AI_DIFFICULTY,
    difficultyName,
  } = global.Reversi.constants;
  const { Board, Rules, ReversiAI, GameHistory } = global.Reversi;

  class ReversiGame {
    constructor() {
      this.board = new Board();
      this.history = new GameHistory();
      this.currentPlayer = BLACK;
      this.lastMove = null;
      this.finished = false;
      this.message = "";
      this.mode = "ai";
      this.difficulty = AI_DIFFICULTY.NORMAL;
      this.humanPlayer = BLACK;
      this.aiPlayer = WHITE;
      this.aiTimer = null;
      this.aiThinking = false;
      this.aiThoughts = [];

      this.boardElement = document.querySelector("#board");
      this.statusElement = document.querySelector("#statusText");
      this.blackScoreElement = document.querySelector("#blackScore");
      this.whiteScoreElement = document.querySelector("#whiteScore");
      this.modeSelect = document.querySelector("#modeSelect");
      this.difficultySelect = document.querySelector("#difficultySelect");
      this.undoButton = document.querySelector("#undoBtn");
      this.redoButton = document.querySelector("#redoBtn");
      this.restartButton = document.querySelector("#restartBtn");
      this.rulesButton = document.querySelector("#rulesBtn");
      this.aiLogElement = document.querySelector("#aiLog");
      this.aiLogCountElement = document.querySelector("#aiLogCount");

      this.bindEvents();
      this.render();
    }

    bindEvents() {
      this.boardElement.addEventListener("click", (event) => {
        const cell = event.target.closest(".cell");
        if (!cell) return;
        this.play(Number(cell.dataset.row), Number(cell.dataset.col));
      });

      this.undoButton.addEventListener("click", () => this.undo());
      this.redoButton.addEventListener("click", () => this.redo());
      this.restartButton.addEventListener("click", () => this.restart());
      this.rulesButton.addEventListener("click", () => window.alert(RULES_TEXT));
      this.modeSelect.addEventListener("change", () => {
        this.mode = this.modeSelect.value;
        this.restart();
      });
      this.difficultySelect.addEventListener("change", () => {
        this.difficulty = this.difficultySelect.value;
        this.restart();
      });
    }

    snapshot() {
      return {
        bits: this.board.cloneBits(),
        currentPlayer: this.currentPlayer,
        lastMove: this.lastMove ? { ...this.lastMove } : null,
        finished: this.finished,
        message: this.message,
      };
    }

    restore(snapshot) {
      this.cancelAiMove();
      if (snapshot.bits) {
        this.board.loadBits(snapshot.bits);
      } else {
        this.board.loadCells(snapshot.cells);
      }
      this.currentPlayer = snapshot.currentPlayer;
      this.lastMove = snapshot.lastMove;
      this.finished = snapshot.finished;
      this.message = snapshot.message;
      this.render();
      this.scheduleAiMove();
    }

    play(row, col) {
      if (this.finished || this.isAiTurn()) return;

      const legalMoves = Rules.legalMoves(this.board, this.currentPlayer);
      const move = legalMoves.get(`${row},${col}`);
      if (!move) return;

      this.commitMove(move);
    }

    commitMove(move) {
      this.history.remember(this.snapshot());
      Rules.applyMove(this.board, move, this.currentPlayer);
      this.lastMove = { row: move.row, col: move.col };
      this.advanceTurn();
      this.render();
      this.scheduleAiMove();
    }

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

    resultMessage(score) {
      if (score[BLACK] > score[WHITE]) {
        return "游戏结束，黑棋获胜。";
      }
      if (score[WHITE] > score[BLACK]) {
        return "游戏结束，白棋获胜。";
      }
      return "游戏结束，双方平局。";
    }

    undo() {
      this.cancelAiMove();
      let snapshot = this.history.undo(this.snapshot());
      if (this.mode === "ai" && snapshot?.currentPlayer === this.aiPlayer && this.history.past.length > 0) {
        snapshot = this.history.undo(snapshot);
      }
      if (snapshot) this.restore(snapshot);
    }

    redo() {
      const snapshot = this.history.redo(this.snapshot());
      if (snapshot) this.restore(snapshot);
    }

    restart() {
      this.cancelAiMove();
      this.board.reset();
      this.history.clear();
      this.currentPlayer = BLACK;
      this.lastMove = null;
      this.finished = false;
      this.aiThinking = false;
      this.message = "";
      this.aiThoughts = [];
      this.modeSelect.value = this.mode;
      this.difficultySelect.value = this.difficulty;
      this.render();
      this.scheduleAiMove();
    }

    isAiTurn() {
      return this.mode === "ai" && this.currentPlayer === this.aiPlayer && !this.finished;
    }

    scheduleAiMove() {
      this.cancelAiMove();
      if (!this.isAiTurn()) return;

      this.aiThinking = true;
      this.render();
      this.aiTimer = window.setTimeout(() => {
        this.aiTimer = null;
        this.aiThinking = false;
        this.playAiMove();
      }, 420);
    }

    cancelAiMove() {
      if (this.aiTimer !== null) {
        window.clearTimeout(this.aiTimer);
        this.aiTimer = null;
      }
      this.aiThinking = false;
    }

    playAiMove() {
      if (!this.isAiTurn()) {
        this.render();
        return;
      }

      const analysis = ReversiAI.analyzeMoves(this.board, this.currentPlayer, this.difficulty);
      const move = analysis.move;
      if (!move) {
        this.advanceTurn();
        this.render();
        this.scheduleAiMove();
        return;
      }

      this.aiThoughts.push(this.formatAiThought(analysis));
      this.commitMove(move);
    }

    render() {
      const score = this.board.count();
      const legalMoves = this.finished ? new Map() : Rules.legalMoves(this.board, this.currentPlayer);

      this.blackScoreElement.textContent = String(score[BLACK]);
      this.whiteScoreElement.textContent = String(score[WHITE]);
      this.statusElement.textContent = this.statusMessage(legalMoves.size);

      this.undoButton.disabled = this.history.past.length === 0 || this.aiThinking;
      this.redoButton.disabled = this.history.future.length === 0 || this.aiThinking;
      this.modeSelect.disabled = this.aiThinking;
      this.difficultySelect.disabled = this.mode !== "ai" || this.aiThinking;
      this.renderAiLog();

      this.boardElement.innerHTML = "";
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) {
          const value = this.board.get(row, col);
          const key = `${row},${col}`;
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "cell";
          cell.dataset.row = String(row);
          cell.dataset.col = String(col);
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", this.cellLabel(row, col, value, legalMoves.has(key)));
          cell.disabled = this.finished || this.isAiTurn();

          if (legalMoves.has(key)) {
            cell.classList.add("legal");
          }

          if (this.lastMove && this.lastMove.row === row && this.lastMove.col === col) {
            cell.classList.add("last");
          }

          if (value !== EMPTY) {
            const piece = document.createElement("span");
            piece.className = `piece ${value === BLACK ? "black" : "white"}`;
            cell.appendChild(piece);
          }

          this.boardElement.appendChild(cell);
        }
      }
    }

    statusMessage(legalMoveCount) {
      if (this.aiThinking) return "AI 正在思考。";
      if (this.message) return this.message;
      if (this.mode === "ai" && this.currentPlayer === this.humanPlayer) {
        return `轮到你执${colorName[this.currentPlayer]}，可落子 ${legalMoveCount} 处。`;
      }
      if (this.mode === "ai" && this.currentPlayer === this.aiPlayer) {
        return `轮到 AI 执${colorName[this.currentPlayer]}，可落子 ${legalMoveCount} 处。`;
      }
      return `轮到${colorName[this.currentPlayer]}，可落子 ${legalMoveCount} 处。`;
    }

    renderAiLog() {
      this.aiLogCountElement.textContent = `${this.aiThoughts.length} 次`;
      this.aiLogElement.textContent =
        this.aiThoughts.length > 0 ? this.aiThoughts.join("\n\n") : "暂无 AI 推理记录。";
      this.aiLogElement.scrollTop = this.aiLogElement.scrollHeight;
    }

    formatAiThought(analysis) {
      const turn = this.aiThoughts.length + 1;
      const best = analysis.bestCandidate;
      const sorted = analysis.candidates.slice().sort((a, b) => b.score - a.score);
      const lines = [
        `第 ${turn} 次 AI 推理`,
        `当前执棋：${colorName[this.currentPlayer]}`,
        `难度：${difficultyName[analysis.difficulty]}`,
        `候选落点：${analysis.candidates.length} 个`,
        `最终选择：${this.formatCoordinate(best.move)}，总分 ${best.score}`,
        this.aiScoringDescription(analysis.difficulty),
        "候选明细：",
      ];

      for (const candidate of sorted) {
        lines.push(this.formatAiCandidate(candidate, analysis.difficulty));
      }

      return lines.join("\n");
    }

    aiScoringDescription(difficulty) {
      if (difficulty === AI_DIFFICULTY.SIMPLE) {
        return "评分规则：只比较对手下一回合合法落点数量，数量越少越优；并列时选择翻子更多的落点。";
      }

      return "评分规则：角 +1200，边 +260；给对手角 -1000/个，给对手边 -140/个；对手每个合法落点 -18；每翻 1 子 +1。";
    }

    formatAiCandidate(candidate, difficulty) {
      if (difficulty === AI_DIFFICULTY.SIMPLE) {
        return (
          `${this.formatCoordinate(candidate.move)} => 对手可落 ${candidate.opponentMoveCount} ` +
          `(翻子 +${candidate.flipScore})`
        );
      }

      return (
        `${this.formatCoordinate(candidate.move)} => 总分 ${candidate.score} ` +
        `(位置 +${candidate.positionScore}, 对手角 ${candidate.opponentCornerMoves}, ` +
        `对手边 ${candidate.opponentEdgeMoves}, 对手可落 ${candidate.opponentMoveCount}, ` +
        `边角扣 ${candidate.opponentAccessPenalty}, 机动扣 ${candidate.mobilityPenalty}, ` +
        `翻子 +${candidate.flipScore})`
      );
    }

    formatCoordinate(move) {
      return `${move.row + 1}行${move.col + 1}列`;
    }

    cellLabel(row, col, value, legal) {
      const coordinate = `${row + 1}行${col + 1}列`;
      if (value === BLACK) return `${coordinate}，黑棋`;
      if (value === WHITE) return `${coordinate}，白棋`;
      if (legal) return `${coordinate}，可落子`;
      return `${coordinate}，空格`;
    }
  }

  global.Reversi.ReversiGame = ReversiGame;
})(window);
