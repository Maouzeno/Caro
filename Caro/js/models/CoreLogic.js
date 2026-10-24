/**
 * =============================================================================
 * MODULE 1: CoreLogic (Model)
 * =============================================================================
 * TRÁCH NHIỆM:
 * - Quản lý ma trận bàn cờ 15x15 (0: Trống, 1: X, 2: O).
 * - Kiểm tra tính hợp lệ của nước đi và cập nhật trạng thái ô cờ.
 * - Thuật toán kiểm tra Thắng/Hòa tối ưu: Quét 4 hướng xung quanh nước đi
 *   vừa đánh để tìm 5 quân liên tiếp và trả về tọa độ 5 quân thắng.
 * - Quản lý ngăn xếp (Stack) lịch sử nước đi hỗ trợ tính năng Undo.
 * - Độc lập hoàn toàn, tuyệt đối không chứa bất kỳ lệnh thao tác DOM hay UI nào.
 * =============================================================================
 */
class CoreLogic {
  constructor(size = 15) {
    this.size = size;
    this.board = [];
    this.moveHistory = []; // Stack lưu lịch sử: { row, col, player, moveNumber }
    this.currentPlayer = 1; // 1: X (đi trước), 2: O
    this.isGameOver = false;
    this.winner = null; // null | 1 | 2 | 'draw'
    this.winningLine = null; // Array of { r, c }
    this.reset();
  }

  /**
   * Khởi tạo / đặt lại toàn bộ dữ liệu bàn cờ
   */
  reset() {
    this.board = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.moveHistory = [];
    this.currentPlayer = 1;
    this.isGameOver = false;
    this.winner = null;
    this.winningLine = null;
  }

  /**
   * Kiểm tra nước đi có hợp lệ không
   * @param {number} row - Tọa độ hàng (0 - 14)
   * @param {number} col - Tọa độ cột (0 - 14)
   * @returns {boolean}
   */
  isValidMove(row, col) {
    if (this.isGameOver) return false;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
    return this.board[row][col] === 0;
  }

  /**
   * Thực hiện nước đi và cập nhật trạng thái ván đấu
   * @param {number} row 
   * @param {number} col 
   * @returns {Object} Kết quả lượt đi
   */
  makeMove(row, col) {
    if (!this.isValidMove(row, col)) {
      return { success: false, reason: 'Nước đi không hợp lệ' };
    }

    const player = this.currentPlayer;
    this.board[row][col] = player;
    const moveNumber = this.moveHistory.length + 1;
    this.moveHistory.push({ row, col, player, moveNumber });

    // Kiểm tra Thắng
    const winCheck = this.checkWin(row, col, player);
    if (winCheck.won) {
      this.isGameOver = true;
      this.winner = player;
      this.winningLine = winCheck.winningLine;

      return {
        success: true,
        row,
        col,
        player,
        moveNumber,
        isGameOver: true,
        winner: this.winner,
        winningLine: this.winningLine,
        isDraw: false
      };
    }

    // Kiểm tra Hòa (Bàn cờ 15x15 đã kín 225 nước đi)
    if (this.moveHistory.length === this.size * this.size) {
      this.isGameOver = true;
      this.winner = 'draw';
      this.winningLine = null;

      return {
        success: true,
        row,
        col,
        player,
        moveNumber,
        isGameOver: true,
        winner: 'draw',
        winningLine: null,
        isDraw: true
      };
    }

    // Đổi lượt người chơi
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

    return {
      success: true,
      row,
      col,
      player,
      moveNumber,
      isGameOver: false,
      winner: null,
      winningLine: null,
      isDraw: false,
      nextPlayer: this.currentPlayer
    };
  }

  /**
   * Hoàn tác 1 nước đi từ đỉnh Stack
   * @returns {Object|null} Nước cờ vừa hoàn tác
   */
  undoMove() {
    if (this.moveHistory.length === 0) return null;

    const lastMove = this.moveHistory.pop();
    this.board[lastMove.row][lastMove.col] = 0;

    // Phục hồi lại trạng thái chưa kết thúc
    this.isGameOver = false;
    this.winner = null;
    this.winningLine = null;
    this.currentPlayer = lastMove.player;

    return lastMove;
  }

  /**
   * Thuật toán kiểm tra Thắng tối ưu: Quét 4 hướng xung quanh nước đi vừa đánh
   * @param {number} row 
   * @param {number} col 
   * @param {number} player 
   * @returns {Object} { won: boolean, winningLine: Array<{r, c}>|null }
   */
  checkWin(row, col, player) {
    // 4 hướng: [Ngang, Dọc, Chéo chính, Chéo phụ]
    const directions = [
      [0, 1],   // Ngang (Horizontal)
      [1, 0],   // Dọc (Vertical)
      [1, 1],   // Chéo chính (Main diagonal: \ )
      [1, -1]   // Chéo phụ (Anti-diagonal: / )
    ];

    for (const [dr, dc] of directions) {
      const line = [{ r: row, c: col }];

      // Quét theo chiều dương (+dr, +dc)
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === player) {
        line.push({ r, c });
        r += dr;
        c += dc;
      }

      // Quét theo chiều âm (-dr, -dc)
      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === player) {
        line.unshift({ r, c });
        r -= dr;
        c -= dc;
      }

      // Gomoku chuẩn: 5 quân liên tiếp là chiến thắng
      if (line.length >= 5) {
        return {
          won: true,
          winningLine: line // Trả về toàn bộ đường thắng để highlight
        };
      }
    }

    return { won: false, winningLine: null };
  }

  /**
   * Lấy thông tin nước đi cuối cùng
   */
  getLastMove() {
    return this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
  }

  /**
   * Chuyển đổi tọa độ (row, col) thành chuỗi cờ tiêu chuẩn Gomoku (VD: row=7, col=7 -> H8)
   */
  static toChessCoordinate(row, col) {
    const colLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
    const colLetter = colLetters[col] || '?';
    const rowNum = row + 1; // 1-15
    return `${colLetter}${rowNum}`;
  }

  /**
   * Xuất toàn bộ dữ liệu trạng thái để lưu trữ
   */
  serialize() {
    return {
      size: this.size,
      board: this.board.map(row => [...row]),
      moveHistory: [...this.moveHistory],
      currentPlayer: this.currentPlayer,
      isGameOver: this.isGameOver,
      winner: this.winner,
      winningLine: this.winningLine ? [...this.winningLine] : null
    };
  }

  /**
   * Nạp lại dữ liệu trạng thái đã lưu
   */
  deserialize(data) {
    if (!data || !data.board) return false;
    this.size = data.size || 15;
    this.board = data.board.map(row => [...row]);
    this.moveHistory = Array.isArray(data.moveHistory) ? [...data.moveHistory] : [];
    this.currentPlayer = data.currentPlayer || 1;
    this.isGameOver = !!data.isGameOver;
    this.winner = data.winner || null;
    this.winningLine = Array.isArray(data.winningLine) ? [...data.winningLine] : null;
    return true;
  }
}

// Gắn vào window để đảm bảo tương thích mọi môi trường trình duyệt
if (typeof window !== 'undefined') {
  window.CoreLogic = CoreLogic;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CoreLogic;
}
