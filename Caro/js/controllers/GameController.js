/**
 * =============================================================================
 * MODULE 5: GameController (Controller)
 * =============================================================================
 * TRÁCH NHIỆM:
 * - Điều phối vòng đời trò chơi (Game Loop):
 *   1. Nhận sự kiện click từ UIRenderer.
 *   2. Gọi CoreLogic để kiểm tra và cập nhật trạng thái cờ.
 *   3. Cập nhật giao diện tương ứng qua UIRenderer (kèm highlight nước đi AI và trục tọa độ).
 *   4. Quản lý bộ đếm thời gian linh hoạt (10s, 15s, 30s, 60s, hoặc Vô hạn).
 *   5. Kích hoạt AIEngine khi ở chế độ PvE và thông báo rõ ràng vị trí máy vừa đánh.
 *   6. Gọi StorageManager để lưu/tải ván đấu, bảng điểm và cấu hình người dùng.
 * =============================================================================
 */
class GameController {
  constructor() {
    // Khởi tạo các module thành phần
    this.model = new CoreLogic(15);
    this.ai = new AIEngine();
    this.storage = new StorageManager();
    this.view = new UIRenderer();
    this.sound = new SoundSynthesizer();

    // Trạng thái vận hành của Controller
    this.mode = 'pvp'; // 'pvp' | 'pve'
    this.aiPlayer = 2; // Máy luôn cầm O
    this.humanPlayer = 1; // Người luôn cầm X
    
    // Cấu hình thời gian (0: Vô hạn; >0: Số giây mỗi lượt)
    this.turnDuration = 15;
    this.timeLeft = this.turnDuration;
    this.timerInterval = null;
    this.isAiThinking = false;
    this.lastSecondTicked = -1;
  }

  /**
   * Khởi động toàn bộ trò chơi
   */
  init() {
    // 1. Đọc cấu hình người dùng từ Storage
    const settings = this.storage.getSettings();
    this.turnDuration = (typeof settings.timeLimit === 'number') ? settings.timeLimit : 15;
    this.sound.setEnabled(settings.soundEnabled !== false);

    // 2. Đăng ký các hook lắng nghe sự kiện từ View
    this.view.onCellClick = (r, c) => this.handleCellClick(r, c);
    this.view.onModeChange = (newMode) => this.handleModeChange(newMode);
    this.view.onNewGame = () => this.handleNewGame();
    this.view.onUndo = () => this.handleUndo();
    this.view.onSave = () => this.handleSaveGame();
    this.view.onLoad = () => this.handleLoadGame();
    this.view.onResetScore = () => this.handleResetScoreboard();
    this.view.onToggleSound = () => this.handleToggleSound();
    this.view.onTimeLimitChange = (seconds) => this.handleTimeLimitChange(seconds);

    // Phím tắt bàn phím tiện lợi (Ctrl+Z)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.handleUndo();
      }
    });

    // 3. Đồng bộ giao diện ban đầu
    this.view.setTimeLimitSelectValue(this.turnDuration);
    this.view.updateScoreboard(this.storage.getScoreboard(), this.mode);
    this.view.updateModeButtons(this.mode);
    this.view.updateSoundUI(this.sound.enabled);

    // 4. Bắt đầu ván đấu đầu tiên
    this.startNewMatch();
  }

  /**
   * Bắt đầu một ván đấu mới
   */
  startNewMatch() {
    this.stopTimer();
    this.isAiThinking = false;
    this.model.reset();

    this.view.renderBoard(this.model.board, null, null, this.mode);
    this.view.updateTurnStatus(this.model.currentPlayer, this.mode, false);
    this.view.setControlsEnabled(true);

    this.startTimer();
  }

  /**
   * Xử lý sự kiện người chơi nhấp vào ô cờ
   */
  handleCellClick(row, col) {
    if (this.model.isGameOver || this.isAiThinking) return;

    // Chặn click nếu đang là lượt của máy ở chế độ PvE
    if (this.mode === 'pve' && this.model.currentPlayer === this.aiPlayer) return;

    // Kiểm tra hợp lệ qua CoreLogic
    if (!this.model.isValidMove(row, col)) {
      return;
    }

    // Thực hiện nước đi qua Model
    const result = this.model.makeMove(row, col);
    this.sound.playStoneClick();

    // Cập nhật View kèm highlight
    const lastMoveObj = { row, col, player: result.player, moveNumber: result.moveNumber };
    this.view.renderBoard(this.model.board, lastMoveObj, result.winningLine, this.mode);

    // Kiểm tra kết thúc ván
    if (result.isGameOver) {
      this.handleGameOver(result.winner, result.winningLine, 'normal');
      return;
    }

    // Đổi lượt và khởi động lại đồng hồ đếm ngược
    this.view.updateTurnStatus(this.model.currentPlayer, this.mode, false);
    this.startTimer();

    // Nếu chuyển sang lượt của AI trong chế độ PvE
    if (this.mode === 'pve' && this.model.currentPlayer === this.aiPlayer) {
      this.triggerAiTurn();
    }
  }

  /**
   * Kích hoạt lượt đi của AIEngine
   */
  triggerAiTurn() {
    this.isAiThinking = true;
    this.view.updateTurnStatus(this.aiPlayer, this.mode, true);

    // Tạo độ trễ tự nhiên (360ms) để người chơi cảm nhận máy đang suy nghĩ
    setTimeout(() => {
      if (this.model.isGameOver) {
        this.isAiThinking = false;
        return;
      }

      // AIEngine tính toán nước đi tốt nhất
      const bestMove = this.ai.findBestMove(this.model.board, this.aiPlayer, this.humanPlayer);

      // Cập nhật vào Model
      const result = this.model.makeMove(bestMove.row, bestMove.col);
      this.sound.playStoneClick();
      this.isAiThinking = false;

      // Tọa độ cờ của AI (VD: H8)
      const coordStr = CoreLogic.toChessCoordinate(bestMove.row, bestMove.col);

      // Cập nhật View
      const lastMoveObj = { row: bestMove.row, col: bestMove.col, player: result.player, moveNumber: result.moveNumber };
      this.view.renderBoard(this.model.board, lastMoveObj, result.winningLine, this.mode);

      if (result.isGameOver) {
        this.handleGameOver(result.winner, result.winningLine, 'normal');
      } else {
        // Cập nhật trạng thái hiển thị rõ rệt tọa độ AI vừa đánh
        this.view.updateTurnStatus(this.model.currentPlayer, this.mode, false, coordStr);
        this.startTimer();
      }
    }, 360);
  }

  /**
   * Bắt đầu đồng hồ đếm ngược cho lượt hiện tại
   */
  startTimer() {
    this.stopTimer();

    // Nếu thời gian là 0 (Chế độ vô hạn)
    if (this.turnDuration === 0) {
      this.timeLeft = 0;
      this.view.updateTimer(0, 0);
      return;
    }

    this.timeLeft = this.turnDuration;
    this.lastSecondTicked = this.turnDuration;
    this.view.updateTimer(this.timeLeft, this.turnDuration);

    this.timerInterval = setInterval(() => {
      this.timeLeft -= 0.1;

      // Phát âm thanh tích tắc khi còn <= 4 giây
      const currentSec = Math.ceil(this.timeLeft);
      if (currentSec <= 4 && currentSec > 0 && currentSec !== this.lastSecondTicked) {
        this.lastSecondTicked = currentSec;
        this.sound.playTick();
      }

      this.view.updateTimer(this.timeLeft, this.turnDuration);

      // Hết giờ -> Xử thua người quá hạn
      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.handleTimeout();
      }
    }, 100);
  }

  /**
   * Dừng đồng hồ đếm ngược
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Xử lý trường hợp hết giờ suy nghĩ: Người chơi quá hạn bị XỬ THUA
   */
  handleTimeout() {
    if (this.model.isGameOver) return;

    const timedOutPlayer = this.model.currentPlayer;
    const winner = timedOutPlayer === 1 ? 2 : 1;

    this.model.isGameOver = true;
    this.model.winner = winner;

    this.handleGameOver(winner, null, 'timeout');
  }

  /**
   * Xử lý kết thúc ván đấu
   */
  handleGameOver(winner, winningLine, reason = 'normal') {
    this.stopTimer();
    this.isAiThinking = false;
    this.view.setControlsEnabled(false);

    // Ghi nhận bảng điểm
    const updatedScores = this.storage.recordMatchResult(this.mode, winner);
    this.view.updateScoreboard(updatedScores, this.mode);

    // Âm thanh chúc mừng
    if (winner !== 'draw') {
      this.sound.playWinChime();
    }

    // Hiển thị bàn cờ kết thúc và Modal
    this.view.renderBoard(this.model.board, this.model.getLastMove(), winningLine, this.mode);
    this.view.showGameOverModal(winner, this.mode, reason);
  }

  /**
   * Xử lý nút Đi lại (Undo)
   */
  handleUndo() {
    if (this.isAiThinking) return;

    if (this.model.moveHistory.length === 0) {
      this.view.showToast('Bàn cờ chưa có nước đi nào!', 'warning');
      return;
    }

    this.stopTimer();

    // Ở chế độ PvP: Hoàn tác 1 nước đi
    if (this.mode === 'pvp') {
      this.model.undoMove();
      this.sound.playUndo();
      this.view.showToast('Đã hoàn tác 1 nước đi', 'info');
    } 
    // Ở chế độ PvE: Hoàn tác 2 nước đi (của AI và của người) để người chơi được đi lại
    else if (this.mode === 'pve') {
      if (this.model.moveHistory.length >= 2) {
        this.model.undoMove();
        this.model.undoMove();
        this.sound.playUndo();
        this.view.showToast('Đã hoàn tác lượt đi vừa rồi', 'info');
      } else {
        this.model.undoMove();
        this.sound.playUndo();
        this.view.showToast('Đã hoàn tác về đầu ván', 'info');
      }
    }

    // Cập nhật lại giao diện và tiếp tục ván đấu
    this.view.closeModal();
    this.view.setControlsEnabled(true);
    this.view.renderBoard(this.model.board, this.model.getLastMove(), null, this.mode);
    this.view.updateTurnStatus(this.model.currentPlayer, this.mode, false);
    this.startTimer();
  }

  /**
   * Xử lý Lưu ván đấu
   */
  handleSaveGame() {
    if (this.isAiThinking) return;

    const payload = {
      ...this.model.serialize(),
      mode: this.mode,
      turnDuration: this.turnDuration,
      timeLeft: this.timeLeft
    };

    const result = this.storage.saveGame(payload);
    if (result.success) {
      this.view.showToast('Đã lưu ván đấu thành công!', 'success');
    } else {
      this.view.showToast('Lưu ván thất bại: ' + result.error, 'danger');
    }
  }

  /**
   * Xử lý Tải lại ván đấu đã lưu
   */
  handleLoadGame() {
    if (this.isAiThinking) return;

    const saved = this.storage.loadGame();
    if (!saved) {
      this.view.showToast('Không tìm thấy ván đấu nào đã lưu!', 'warning');
      return;
    }

    this.stopTimer();
    this.mode = saved.mode || 'pvp';
    this.turnDuration = (typeof saved.turnDuration === 'number') ? saved.turnDuration : 15;
    this.model.deserialize(saved);
    this.timeLeft = saved.timeLeft || this.turnDuration;

    // Cập nhật giao diện
    this.view.closeModal();
    this.view.updateModeButtons(this.mode);
    this.view.setTimeLimitSelectValue(this.turnDuration);
    this.view.updateScoreboard(this.storage.getScoreboard(), this.mode);
    this.view.renderBoard(this.model.board, this.model.getLastMove(), this.model.winningLine, this.mode);
    this.view.updateTurnStatus(this.model.currentPlayer, this.mode, false);
    this.view.setControlsEnabled(!this.model.isGameOver);

    if (!this.model.isGameOver) {
      this.startTimer();
      // Nếu ván được lưu ngay lượt của AI
      if (this.mode === 'pve' && this.model.currentPlayer === this.aiPlayer) {
        this.triggerAiTurn();
      }
    }

    this.view.showToast('Đã tải lại ván cờ từ bộ nhớ!', 'success');
  }

  /**
   * Xử lý thay đổi thời gian mỗi lượt
   */
  handleTimeLimitChange(seconds) {
    this.turnDuration = seconds;
    this.storage.saveSettings({ timeLimit: seconds });

    if (this.turnDuration === 0) {
      this.stopTimer();
      this.timeLeft = 0;
      this.view.updateTimer(0, 0);
      this.view.showToast('Thời gian mỗi lượt: Không giới hạn', 'info');
    } else {
      this.view.showToast(`Thời gian mỗi lượt: ${seconds} giây`, 'info');
      // Nếu ván đang chơi, khởi động lại timer của lượt này theo mức mới
      if (!this.model.isGameOver) {
        this.startTimer();
      }
    }
  }

  /**
   * Xử lý Đổi chế độ chơi (PvP <-> PvE)
   */
  handleModeChange(newMode) {
    if (this.mode === newMode) return;

    if (this.model.moveHistory.length > 0 && !this.model.isGameOver) {
      const confirmChange = confirm('Đổi chế độ sẽ làm mới lại ván đấu hiện tại. Bạn có muốn tiếp tục?');
      if (!confirmChange) return;
    }

    this.mode = newMode;
    this.view.updateModeButtons(newMode);
    this.view.updateScoreboard(this.storage.getScoreboard(), newMode);
    this.view.showToast(`Chuyển sang chế độ: ${newMode === 'pvp' ? '2 Người (PvP)' : 'Đấu Máy (PvE)'}`, 'info');
    this.startNewMatch();
  }

  /**
   * Xử lý nút Ván Mới
   */
  handleNewGame() {
    this.startNewMatch();
    this.view.showToast('Đã bắt đầu ván mới!', 'info');
  }

  /**
   * Xử lý Đặt lại bảng điểm
   */
  handleResetScoreboard() {
    const confirmReset = confirm('Bạn có chắc muốn đặt lại toàn bộ điểm số về 0?');
    if (!confirmReset) return;

    const cleanScores = this.storage.resetScoreboard();
    this.view.updateScoreboard(cleanScores, this.mode);
    this.view.showToast('Đã xóa bảng điểm về 0!', 'info');
  }

  /**
   * Xử lý Bật / Tắt âm thanh
   */
  handleToggleSound() {
    const isEnabled = this.sound.toggle();
    this.storage.saveSettings({ soundEnabled: isEnabled });
    this.view.updateSoundUI(isEnabled);
    this.view.showToast(`Âm thanh đã ${isEnabled ? 'Bật' : 'Tắt'}`, 'info');
  }
}

if (typeof window !== 'undefined') {
  window.GameController = GameController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameController;
}
