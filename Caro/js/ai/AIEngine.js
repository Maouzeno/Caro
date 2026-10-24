/**
 * =============================================================================
 * MODULE 2: AIEngine (Heuristic Evaluator)
 * =============================================================================
 * TRÁCH NHIỆM:
 * - Nhận đầu vào là ma trận bàn cờ hiện tại từ GameController.
 * - Chỉ lọc và đánh giá các ô ứng viên trong phạm vi ảnh hưởng (bán kính 2 ô quanh quân cờ đã đánh).
 * - Sử dụng hàm lượng giá Heuristic đa tầng (Tấn công kết hợp Phòng thủ) để tính điểm.
 * - Tự động nhận diện nước thắng ngay, chặn nước thắng của đối thủ, chặn chuỗi 4 mở,
 *   tạo bẫy 2 đầu (Fork 3-3, 4-3) và ưu tiên vị trí trung tâm.
 * - Trả về tọa độ { row, col } tối ưu nhất cho máy.
 * =============================================================================
 */
class AIEngine {
  constructor() {
    // Trọng số lượng giá Heuristic
    this.WEIGHTS = {
      WIN: 100000000,       // 5 quân: Thắng ngay
      FOUR_OPEN: 10000000,  // 4 quân mở 2 đầu: Chắc chắn thắng ở lượt sau
      FOUR_BLOCKED: 250000, // 4 quân bị chặn 1 đầu: Uy hiếp tạo 5
      THREE_OPEN: 80000,    // 3 quân mở 2 đầu: Rất nguy hiểm
      THREE_BLOCKED: 3500,  // 3 quân bị chặn 1 đầu
      TWO_OPEN: 1200,       // 2 quân mở 2 đầu
      TWO_BLOCKED: 120,     // 2 quân bị chặn 1 đầu
      ONE_OPEN: 15          // 1 quân mở
    };

    this.DIRECTIONS = [
      [0, 1],   // Ngang
      [1, 0],   // Dọc
      [1, 1],   // Chéo chính
      [1, -1]   // Chéo phụ
    ];
  }

  /**
   * Tìm nước đi tốt nhất cho máy dựa trên ma trận bàn cờ
   * @param {Array<Array<number>>} board - Ma trận 15x15
   * @param {number} aiPlayer - Quân cờ của AI (mặc định 2: O)
   * @param {number} humanPlayer - Quân cờ của người (mặc định 1: X)
   * @returns {{ row: number, col: number }}
   */
  findBestMove(board, aiPlayer = 2, humanPlayer = 1) {
    const size = board.length;
    const candidates = this.getCandidateCells(board);

    // Trường hợp bàn cờ hoàn toàn trống: Đi ngay trung tâm (7, 7)
    if (candidates.length === 0) {
      const mid = Math.floor(size / 2);
      return { row: mid, col: mid };
    }

    // Nếu chỉ có 1 ứng viên duy nhất
    if (candidates.length === 1) {
      return { row: candidates[0].r, col: candidates[0].c };
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    // Duyệt và chấm điểm từng ô ứng viên
    for (const cell of candidates) {
      const score = this.evaluateCell(board, cell.r, cell.c, aiPlayer, humanPlayer);

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [cell];
      } else if (score === bestScore) {
        bestMoves.push(cell);
      }
    }

    // Chọn ngẫu nhiên trong danh sách các nước có cùng điểm cao nhất để lối chơi đa dạng
    const choice = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return { row: choice.r, col: choice.c };
  }

  /**
   * Tối ưu hóa: Chỉ sinh các ô trống nằm gần quân cờ đã đánh (Bán kính Chebyshev <= 2)
   */
  getCandidateCells(board) {
    const size = board.length;
    const candidates = [];
    const visited = new Set();
    let hasPieces = false;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== 0) {
          hasPieces = true;
          // Quét các ô xung quanh trong bán kính 2
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 0) {
                const key = nr * size + nc;
                if (!visited.has(key)) {
                  visited.add(key);
                  candidates.push({ r: nr, c: nc });
                }
              }
            }
          }
        }
      }
    }

    if (!hasPieces) {
      const mid = Math.floor(size / 2);
      return [{ r: mid, c: mid }];
    }

    return candidates;
  }

  /**
   * Hàm lượng giá kết hợp Tấn Công và Phòng Thủ tại ô (r, c)
   */
  evaluateCell(board, r, c, aiPlayer, humanPlayer) {
    const size = board.length;

    // 1. Giả lập AI đánh vào (r, c) -> Lượng giá Tấn Công
    board[r][c] = aiPlayer;
    const attack = this.analyzePattern(board, r, c, aiPlayer);
    board[r][c] = 0;

    // 2. Giả lập Đối thủ đánh vào (r, c) -> Lượng giá Phòng Thủ
    board[r][c] = humanPlayer;
    const defense = this.analyzePattern(board, r, c, humanPlayer);
    board[r][c] = 0;

    // Phân cấp ưu tiên chiến thuật tối thượng:
    // Cấp 1: AI Thắng ngay lập tức
    if (attack.win) return this.WEIGHTS.WIN;

    // Cấp 2: Đối thủ có thể thắng ngay lượt tới -> BẮT BUỘC CHẶN NGAY
    if (defense.win) return this.WEIGHTS.WIN * 0.95;

    // Cấp 3: AI tạo 4 mở (không thể ngăn cản)
    if (attack.open4) return this.WEIGHTS.FOUR_OPEN;

    // Cấp 4: Chặn đối thủ tạo 4 mở
    if (defense.open4) return this.WEIGHTS.FOUR_OPEN * 0.9;

    // Cấp 5: AI tạo bẫy chĩa 2 đường (Fork: 3-3, 4-3, 4-4)
    if (attack.fork) return 5500000;

    // Cấp 6: Chặn đối thủ tạo bẫy chĩa 2 đường
    if (defense.fork) return 4500000;

    // Điểm thưởng vị trí trung tâm (càng gần tâm bàn cờ (7,7) càng có lợi thế mở rộng thế cờ)
    const mid = Math.floor(size / 2);
    const distToCenter = Math.max(Math.abs(r - mid), Math.abs(c - mid));
    const centerBonus = (mid - distToCenter) * 12;

    // Tổng hợp điểm: Ưu tiên tấn công một chút, phòng ngự vững chắc
    const totalScore = (attack.score * 1.15) + (defense.score * 1.0) + centerBonus;
    return totalScore;
  }

  /**
   * Phân tích các chuỗi quân cờ trên 4 hướng đi qua tọa độ (r, c)
   */
  analyzePattern(board, r, c, player) {
    const size = board.length;
    let score = 0;
    let win = false;
    let open4 = false;
    let open3Count = 0;
    let blocked4Count = 0;

    for (const [dr, dc] of this.DIRECTIONS) {
      let count = 1;
      let openEnds = 0;

      // Quét chiều dương
      let step = 1;
      while (true) {
        const nr = r + step * dr;
        const nc = c + step * dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else {
          if (board[nr][nc] === 0) openEnds++;
          break;
        }
      }

      // Quét chiều âm
      step = 1;
      while (true) {
        const nr = r - step * dr;
        const nc = c - step * dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
        if (board[nr][nc] === player) {
          count++;
          step++;
        } else {
          if (board[nr][nc] === 0) openEnds++;
          break;
        }
      }

      // Đánh giá loại hình cờ tạo thành
      if (count >= 5) {
        win = true;
        score += this.WEIGHTS.WIN;
      } else if (count === 4) {
        if (openEnds === 2) {
          open4 = true;
          score += this.WEIGHTS.FOUR_OPEN;
        } else if (openEnds === 1) {
          blocked4Count++;
          score += this.WEIGHTS.FOUR_BLOCKED;
        }
      } else if (count === 3) {
        if (openEnds === 2) {
          open3Count++;
          score += this.WEIGHTS.THREE_OPEN;
        } else if (openEnds === 1) {
          score += this.WEIGHTS.THREE_BLOCKED;
        }
      } else if (count === 2) {
        if (openEnds === 2) {
          score += this.WEIGHTS.TWO_OPEN;
        } else if (openEnds === 1) {
          score += this.WEIGHTS.TWO_BLOCKED;
        }
      } else if (count === 1) {
        if (openEnds === 2) {
          score += this.WEIGHTS.ONE_OPEN;
        }
      }
    }

    // Nhận diện bẫy Fork (nước cờ tạo ra từ 2 mối đe dọa trở lên)
    const fork = (open3Count >= 2) || (open3Count >= 1 && blocked4Count >= 1) || (blocked4Count >= 2);

    return {
      score,
      win,
      open4,
      fork,
      open3Count,
      blocked4Count
    };
  }
}

if (typeof window !== 'undefined') {
  window.AIEngine = AIEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
}
