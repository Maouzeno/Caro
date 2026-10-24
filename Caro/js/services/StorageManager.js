/**
 * =============================================================================
 * MODULE 3: StorageManager (Data Persistence)
 * =============================================================================
 * TRÁCH NHIỆM:
 * - Sử dụng localStorage để lưu/tải ván đấu đang chơi dở (Save/Load game).
 * - Lưu trữ và đồng bộ bảng điểm (Scoreboard) giữa các ván đấu cho cả PvP và PvE.
 * - Lưu trữ cấu hình người dùng (Tùy chọn thời gian mỗi lượt: 10s, 15s, 30s, 60s, vô hạn; âm thanh).
 * - Bọc try/catch chống lỗi hạn chế bộ nhớ hoặc chế độ Private Browsing.
 * =============================================================================
 */
class StorageManager {
  constructor() {
    this.GAME_KEY = 'CARO_SAVED_MATCH_DATA';
    this.SCORE_KEY = 'CARO_SCOREBOARD_DATA';
    this.SETTINGS_KEY = 'CARO_SETTINGS_DATA';
  }

  /**
   * Lưu trạng thái ván cờ hiện tại
   */
  saveGame(gameData) {
    try {
      const payload = {
        ...gameData,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.GAME_KEY, JSON.stringify(payload));
      return { success: true };
    } catch (err) {
      console.error('[StorageManager] Lưu ván cờ thất bại:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Tải trạng thái ván cờ đã lưu
   */
  loadGame() {
    try {
      const raw = localStorage.getItem(this.GAME_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[StorageManager] Đọc ván đấu thất bại:', err);
      return null;
    }
  }

  /**
   * Kiểm tra xem có ván đấu nào đang được lưu không
   */
  hasSavedGame() {
    return !!localStorage.getItem(this.GAME_KEY);
  }

  /**
   * Lấy bảng điểm cho cả 2 chế độ (PvP và PvE)
   */
  getScoreboard() {
    const defaultScores = {
      pvp: { p1Wins: 0, p2Wins: 0, draws: 0 },
      pve: { playerWins: 0, aiWins: 0, draws: 0 }
    };
    try {
      const raw = localStorage.getItem(this.SCORE_KEY);
      if (!raw) return defaultScores;
      const parsed = JSON.parse(raw);
      return {
        pvp: { ...defaultScores.pvp, ...(parsed.pvp || {}) },
        pve: { ...defaultScores.pve, ...(parsed.pve || {}) }
      };
    } catch (err) {
      return defaultScores;
    }
  }

  /**
   * Ghi nhận kết quả của một ván đấu vào bảng điểm
   */
  recordMatchResult(mode, winner) {
    const scores = this.getScoreboard();
    if (mode === 'pvp') {
      if (winner === 1) scores.pvp.p1Wins++;
      else if (winner === 2) scores.pvp.p2Wins++;
      else if (winner === 'draw') scores.pvp.draws++;
    } else if (mode === 'pve') {
      if (winner === 1) scores.pve.playerWins++;
      else if (winner === 2) scores.pve.aiWins++;
      else if (winner === 'draw') scores.pve.draws++;
    }

    try {
      localStorage.setItem(this.SCORE_KEY, JSON.stringify(scores));
    } catch (err) {
      console.error('[StorageManager] Lưu bảng điểm thất bại:', err);
    }
    return scores;
  }

  /**
   * Đặt lại bảng điểm về 0
   */
  resetScoreboard() {
    const clean = {
      pvp: { p1Wins: 0, p2Wins: 0, draws: 0 },
      pve: { playerWins: 0, aiWins: 0, draws: 0 }
    };
    try {
      localStorage.setItem(this.SCORE_KEY, JSON.stringify(clean));
    } catch (err) {
      console.error('[StorageManager] Đặt lại điểm thất bại:', err);
    }
    return clean;
  }

  /**
   * Lấy cấu hình thiết lập người dùng (thời gian mỗi lượt, âm thanh,...)
   */
  getSettings() {
    const defaultSettings = {
      timeLimit: 15, // 15 giây mặc định (0 biểu thị không giới hạn)
      soundEnabled: true
    };
    try {
      const raw = localStorage.getItem(this.SETTINGS_KEY);
      if (!raw) return defaultSettings;
      const parsed = JSON.parse(raw);
      return {
        ...defaultSettings,
        ...parsed
      };
    } catch (err) {
      return defaultSettings;
    }
  }

  /**
   * Lưu cấu hình thiết lập người dùng
   */
  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.error('[StorageManager] Lưu cấu hình thất bại:', err);
      return newSettings;
    }
  }
}

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
