(function (global) {
  "use strict";

  const { SIZE, AI_DIFFICULTY } = global.Reversi.constants;
  const { Board, Rules } = global.Reversi;

  class ReversiAI {
    static isCorner(row, col) {
      return (row === 0 || row === SIZE - 1) && (col === 0 || col === SIZE - 1);
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

    static opponentAccessPenalty(moves) {
      return ReversiAI.opponentAccessDetails(moves).penalty;
    }

    static analyzeSimpleMoves(board, player) {
      const moves = Array.from(Rules.legalMoves(board, player).values());
      if (moves.length === 0) {
        return { move: null, candidates: [], difficulty: AI_DIFFICULTY.SIMPLE };
      }

      const opponent = Rules.opponent(player);
      let bestCandidate = null;
      const candidates = [];

      for (const move of moves) {
        const simulatedBoard = new Board();
        simulatedBoard.loadBits(board.cloneBits());
        Rules.applyMove(simulatedBoard, move, player);

        const opponentMoves = Rules.legalMoves(simulatedBoard, opponent);
        const score = -opponentMoves.size;
        const candidate = {
          move,
          score,
          positionScore: 0,
          opponentCornerMoves: 0,
          opponentEdgeMoves: 0,
          opponentMoveCount: opponentMoves.size,
          opponentAccessPenalty: 0,
          mobilityPenalty: opponentMoves.size,
          flipScore: move.flips.length,
        };

        candidates.push(candidate);
        if (
          !bestCandidate ||
          candidate.opponentMoveCount < bestCandidate.opponentMoveCount ||
          (candidate.opponentMoveCount === bestCandidate.opponentMoveCount &&
            candidate.flipScore > bestCandidate.flipScore)
        ) {
          bestCandidate = candidate;
        }
      }

      return {
        move: bestCandidate.move,
        candidates,
        bestCandidate,
        difficulty: AI_DIFFICULTY.SIMPLE,
      };
    }

    static analyzeNormalMoves(board, player) {
      const moves = Array.from(Rules.legalMoves(board, player).values());
      if (moves.length === 0) {
        return { move: null, candidates: [], difficulty: AI_DIFFICULTY.NORMAL };
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

      return {
        move: bestCandidate.move,
        candidates,
        bestCandidate,
        difficulty: AI_DIFFICULTY.NORMAL,
      };
    }

    static analyzeMoves(board, player, difficulty = AI_DIFFICULTY.NORMAL) {
      if (difficulty === AI_DIFFICULTY.SIMPLE) {
        return ReversiAI.analyzeSimpleMoves(board, player);
      }
      return ReversiAI.analyzeNormalMoves(board, player);
    }

    static chooseMove(board, player, difficulty = AI_DIFFICULTY.NORMAL) {
      return ReversiAI.analyzeMoves(board, player, difficulty).move;
    }
  }

  global.Reversi.ReversiAI = ReversiAI;
})(window);
