(function (global) {
  "use strict";

  const {
    BLACK,
    WHITE,
    SIZE,
    ALL_BITS,
    NOT_A_FILE,
    NOT_H_FILE,
    BIT_DIRECTIONS,
  } = global.Reversi.constants;

  class Rules {
    static opponent(player) {
      return player === BLACK ? WHITE : BLACK;
    }

    static inside(row, col) {
      return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
    }

    static bit(row, col) {
      return 1n << BigInt(row * SIZE + col);
    }

    static bitToCoordinate(bit) {
      let index = 0;
      let value = bit;
      while (value > 1n) {
        value >>= 1n;
        index += 1;
      }
      return {
        row: Math.floor(index / SIZE),
        col: index % SIZE,
      };
    }

    static playerBits(board, player) {
      return player === BLACK ? board.blackBits : board.whiteBits;
    }

    static opponentBits(board, player) {
      return player === BLACK ? board.whiteBits : board.blackBits;
    }

    static emptyBits(board) {
      return ALL_BITS ^ (board.blackBits | board.whiteBits);
    }

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

    static bitsToCoordinates(bits) {
      const coordinates = [];
      let remaining = bits;
      while (remaining !== 0n) {
        const bit = remaining & -remaining;
        coordinates.push(Rules.bitToCoordinate(bit));
        remaining &= remaining - 1n;
      }
      return coordinates;
    }

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

    static legalMoves(board, player) {
      const moves = new Map();
      for (const { row, col } of Rules.bitsToCoordinates(Rules.legalMoveBits(board, player))) {
        const flips = Rules.flipsForMove(board, row, col, player);
        moves.set(`${row},${col}`, { row, col, flips });
      }
      return moves;
    }

    static applyMove(board, move, player) {
      board.set(move.row, move.col, player);
      for (const [flipRow, flipCol] of move.flips) {
        board.set(flipRow, flipCol, player);
      }
    }
  }

  global.Reversi.Rules = Rules;
})(window);
