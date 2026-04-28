(function (global) {
  "use strict";

  const { EMPTY, BLACK, WHITE, SIZE, ALL_BITS } = global.Reversi.constants;

  class Board {
    constructor() {
      this.reset();
    }

    reset() {
      this.blackBits = 0n;
      this.whiteBits = 0n;
      this.set(3, 3, WHITE);
      this.set(3, 4, BLACK);
      this.set(4, 3, BLACK);
      this.set(4, 4, WHITE);
    }

    cloneCells() {
      return Array.from({ length: SIZE }, (_, row) =>
        Array.from({ length: SIZE }, (_, col) => this.get(row, col))
      );
    }

    loadCells(cells) {
      this.blackBits = 0n;
      this.whiteBits = 0n;
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) {
          this.set(row, col, cells[row][col]);
        }
      }
    }

    cloneBits() {
      return {
        blackBits: this.blackBits,
        whiteBits: this.whiteBits,
      };
    }

    loadBits(bits) {
      this.blackBits = bits.blackBits;
      this.whiteBits = bits.whiteBits;
    }

    bit(row, col) {
      return 1n << BigInt(row * SIZE + col);
    }

    get(row, col) {
      const bit = this.bit(row, col);
      if ((this.blackBits & bit) !== 0n) return BLACK;
      if ((this.whiteBits & bit) !== 0n) return WHITE;
      return EMPTY;
    }

    set(row, col, value) {
      const bit = this.bit(row, col);
      this.blackBits &= ALL_BITS ^ bit;
      this.whiteBits &= ALL_BITS ^ bit;

      if (value === BLACK) {
        this.blackBits |= bit;
      } else if (value === WHITE) {
        this.whiteBits |= bit;
      }
    }

    count() {
      const black = Board.popCount(this.blackBits);
      const white = Board.popCount(this.whiteBits);
      return { [BLACK]: black, [WHITE]: white, empty: SIZE * SIZE - black - white };
    }

    static popCount(bits) {
      let count = 0;
      let value = bits;
      while (value !== 0n) {
        value &= value - 1n;
        count += 1;
      }
      return count;
    }
  }

  global.Reversi.Board = Board;
})(window);
