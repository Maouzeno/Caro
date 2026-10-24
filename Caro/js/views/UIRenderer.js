/**
 * =============================================================================
 * MODULE 4: UIRenderer (View)
 * =============================================================================
 * TRÁCH NHIỆM:
 * - Khởi tạo và kết xuất (render) giao diện bàn cờ 15x15, các ô cờ, điểm sao (Hoshi).
 * - Hiệu ứng hiển thị cực rõ nước đi của AI:
 *   + Hiệu ứng sóng radar (Sonar Ripple) 3 tầng tỏa ra từ quân cờ vừa đánh.
 *   + Mũi tên định vị (Marker Pin) chỉ thẳng vào quân cờ mới.
 *   + Trục tọa độ phát sáng (Highlight hàng & cột trên các mép bàn cờ A-O, 1-15).
 *   + Thẻ thông tin nước đi gần nhất hiển thị trực quan (VD: [H8] - Nước #12).
 * - Hiển thị huy hiệu lượt chơi, đồng hồ đếm ngược linh hoạt (hỗ trợ 10s, 15s, 30s, 60s, vô hạn ∞).
 * - Bắt toàn bộ sự kiện click và thay đổi cấu hình, gửi tín hiệu về GameController.
 * - NGUYÊN TẮC: Chỉ thuần túy render và bắt sự kiện, tuyệt đối không tự xử lý logic thắng thua.
 * =============================================================================
 */
class UIRenderer {
  constructor() {
    // DOM Elements cache
    this.boardEl = document.getElementById('board');
    this.turnBadge = document.getElementById('turn-badge');
    this.turnIcon = document.getElementById('turn-stone-icon');
    this.turnPlayerName = document.getElementById('turn-player-name');
    
    // Timer & Status elements
    this.timerRing = document.getElementById('timer-ring-box');
    this.timerProgress = document.getElementById('timer-progress');
    this.timerVal = document.getElementById('timer-val');
    this.statusHeadline = document.getElementById('status-headline');
    this.statusSubline = document.getElementById('status-subline');
    this.selectTimeLimit = document.getElementById('select-time-limit');
    
    // Last Move Display Box
    this.lastMoveBox = document.getElementById('last-move-box');
    this.lastMovePlayer = document.getElementById('last-move-player');
    this.lastMoveCoord = document.getElementById('last-move-coord');
    this.lastMoveNum = document.getElementById('last-move-num');

    // Scoreboard elements
    this.scoreP1Label = document.getElementById('score-p1-label');
    this.scoreP2Label = document.getElementById('score-p2-label');
    this.scoreP1Val = document.getElementById('score-p1-val');
    this.scoreP2Val = document.getElementById('score-p2-val');
    this.scoreDrawVal = document.getElementById('score-draw-val');
    
    // Control Buttons
    this.btnModePvp = document.getElementById('btn-mode-pvp');
    this.btnModePve = document.getElementById('btn-mode-pve');
    this.btnNewGame = document.getElementById('btn-new-game');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnSave = document.getElementById('btn-save');
    this.btnLoad = document.getElementById('btn-load');
    this.btnResetScore = document.getElementById('btn-reset-score');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundText = document.getElementById('sound-text');
    
    // Modal Overlay
    this.modalOverlay = document.getElementById('game-over-modal');
    this.modalBadge = document.getElementById('modal-badge');
    this.modalTitle = document.getElementById('modal-title');
    this.modalMessage = document.getElementById('modal-message');
    this.btnModalNewGame = document.getElementById('btn-modal-new-game');
    this.btnModalClose = document.getElementById('btn-modal-close');
    
    // Notification & Visual FX
    this.toastContainer = document.getElementById('toast-container');
    this.confettiCanvas = document.getElementById('confetti-canvas');

    // Coordinate Label Elements Cache (A-O, 1-15)
    this.colLabelsTop = document.querySelectorAll('.coord-top span');
    this.colLabelsBottom = document.querySelectorAll('.coord-bottom span');
    this.rowLabelsLeft = document.querySelectorAll('.coord-left span');
    this.rowLabelsRight = document.querySelectorAll('.coord-right span');

    // Matrix references
    this.cellElements = [];
    this.size = 15;

    // Callback hooks đăng ký bởi GameController
    this.onCellClick = null;
    this.onModeChange = null;
    this.onNewGame = null;
    this.onUndo = null;
    this.onSave = null;
    this.onLoad = null;
    this.onResetScore = null;
    this.onToggleSound = null;
    this.onTimeLimitChange = null;

    this.initDOMGrid();
    this.bindEvents();
  }

  /**
   * Khởi tạo lưới 15x15 vào DOM một lần duy nhất
   */
  initDOMGrid() {
    this.boardEl.innerHTML = '';
    this.cellElements = Array.from({ length: this.size }, () => Array(this.size).fill(null));

    // Điểm sao Hoshi tiêu chuẩn Gomoku (3, 7, 11)
    const starPoints = new Set(['3,3', '3,11', '7,7', '11,3', '11,11']);
    const fragment = document.createDocumentFragment();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Điểm sao Hoshi
        if (starPoints.has(`${r},${c}`)) {
          cell.classList.add('star-point');
          const hoshi = document.createElement('div');
          hoshi.className = 'hoshi-dot';
          cell.appendChild(hoshi);
        }

        // Lớp hiển thị trước quân cờ khi hover
        const ghost = document.createElement('div');
        ghost.className = 'ghost-preview';
        cell.appendChild(ghost);

        fragment.appendChild(cell);
        this.cellElements[r][c] = cell;
      }
    }

    this.boardEl.appendChild(fragment);
  }

  /**
   * Gắn các bộ lắng nghe sự kiện
   */
  bindEvents() {
    // Event delegation cho 225 ô cờ
    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.board-cell');
      if (!cell || !this.onCellClick) return;
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      this.onCellClick(r, c);
    });

    // Chế độ chơi
    this.btnModePvp.addEventListener('click', () => this.onModeChange && this.onModeChange('pvp'));
    this.btnModePve.addEventListener('click', () => this.onModeChange && this.onModeChange('pve'));

    // Tùy chọn thời gian mỗi lượt
    this.selectTimeLimit.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.onTimeLimitChange) {
        this.onTimeLimitChange(val);
      }
    });

    // Các nút thao tác
    this.btnNewGame.addEventListener('click', () => this.onNewGame && this.onNewGame());
    this.btnUndo.addEventListener('click', () => this.onUndo && this.onUndo());
    this.btnSave.addEventListener('click', () => this.onSave && this.onSave());
    this.btnLoad.addEventListener('click', () => this.onLoad && this.onLoad());
    this.btnResetScore.addEventListener('click', () => this.onResetScore && this.onResetScore());
    this.btnToggleSound.addEventListener('click', () => this.onToggleSound && this.onToggleSound());

    // Modal actions
    this.btnModalNewGame.addEventListener('click', () => {
      this.closeModal();
      this.onNewGame && this.onNewGame();
    });
    this.btnModalClose.addEventListener('click', () => this.closeModal());
  }

  /**
   * Vẽ lại toàn bộ quân cờ trên bàn cờ
   * @param {Array<Array<number>>} board 
   * @param {Object|null} lastMove - { row, col, player, moveNumber }
   * @param {Array<{r, c}>|null} winningLine 
   * @param {string} mode - 'pvp' | 'pve'
   */
  renderBoard(board, lastMove = null, winningLine = null, mode = 'pvp') {
    const winningSet = new Set();
    if (winningLine && Array.isArray(winningLine)) {
      winningLine.forEach(p => winningSet.add(`${p.r},${p.c}`));
    }

    // Xóa hiệu ứng highlight tọa độ mép bàn cờ cũ
    this.clearCoordinateHighlights();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.cellElements[r][c];
        const state = board[r][c];

        // Dọn quân cờ cũ
        const oldStone = cell.querySelector('.stone');
        if (oldStone) oldStone.remove();

        if (state === 0) {
          cell.removeAttribute('data-occupied');
        } else {
          cell.setAttribute('data-occupied', 'true');
          const stone = document.createElement('div');
          stone.className = `stone ${state === 1 ? 'stone-x' : 'stone-o'}`;

          // Kiểm tra xem có phải nước cờ vừa đánh không
          if (lastMove && lastMove.row === r && lastMove.col === c) {
            stone.classList.add('last-move');
            const isAiMove = (mode === 'pve' && lastMove.player === 2);

            if (isAiMove) {
              stone.classList.add('last-move-ai');
            }

            // Thêm các vòng sóng Sonar Ripple lan tỏa ra xung quanh
            const ripple1 = document.createElement('div');
            ripple1.className = `sonar-ripple ripple-1 ${isAiMove ? 'ai-ripple' : ''}`;
            const ripple2 = document.createElement('div');
            ripple2.className = `sonar-ripple ripple-2 ${isAiMove ? 'ai-ripple' : ''}`;
            const pinMarker = document.createElement('div');
            pinMarker.className = `move-pin-marker ${isAiMove ? 'pin-ai' : ''}`;
            pinMarker.innerHTML = isAiMove ? '🤖' : '●';

            stone.appendChild(ripple1);
            stone.appendChild(ripple2);
            stone.appendChild(pinMarker);

            // Bật highlight trên 2 trục tọa độ mép bàn cờ
            this.highlightCoordinates(r, c);
          }

          // Kiểm tra 5 quân cờ chiến thắng
          if (winningSet.has(`${r},${c}`)) {
            stone.classList.add('winning-stone');
          }

          cell.appendChild(stone);
        }
      }
    }

    // Cập nhật thông tin nước đi gần nhất trên Sidebar
    this.updateLastMoveInfo(lastMove, mode);
  }

  /**
   * Làm nổi bật hàng và cột trên mép bàn cờ tương ứng với nước cờ vừa đánh
   */
  highlightCoordinates(row, col) {
    if (this.rowLabelsLeft[row]) this.rowLabelsLeft[row].classList.add('coord-active');
    if (this.rowLabelsRight[row]) this.rowLabelsRight[row].classList.add('coord-active');
    if (this.colLabelsTop[col]) this.colLabelsTop[col].classList.add('coord-active');
    if (this.colLabelsBottom[col]) this.colLabelsBottom[col].classList.add('coord-active');
  }

  /**
   * Xóa toàn bộ hiệu ứng highlight trên mép bàn cờ
   */
  clearCoordinateHighlights() {
    const activeLabels = document.querySelectorAll('.coord-active');
    activeLabels.forEach(el => el.classList.remove('coord-active'));
  }

  /**
   * Cập nhật thông tin nước đi gần nhất vào Sidebar
   */
  updateLastMoveInfo(lastMove, mode) {
    if (!lastMove) {
      this.lastMoveBox.style.display = 'none';
      return;
    }

    this.lastMoveBox.style.display = 'flex';
    const chessCoord = CoreLogic.toChessCoordinate(lastMove.row, lastMove.col);
    this.lastMoveCoord.textContent = chessCoord;
    this.lastMoveNum.textContent = `Nước #${lastMove.moveNumber || '?'}`;

    if (mode === 'pve') {
      if (lastMove.player === 2) {
        this.lastMovePlayer.textContent = 'Máy AI (O)';
        this.lastMovePlayer.className = 'last-move-player val-o';
        this.lastMoveCoord.className = 'last-move-coord coord-ai';
      } else {
        this.lastMovePlayer.textContent = 'Bạn (X)';
        this.lastMovePlayer.className = 'last-move-player val-x';
        this.lastMoveCoord.className = 'last-move-coord coord-human';
      }
    } else {
      if (lastMove.player === 1) {
        this.lastMovePlayer.textContent = 'Người chơi 1 (X)';
        this.lastMovePlayer.className = 'last-move-player val-x';
        this.lastMoveCoord.className = 'last-move-coord coord-human';
      } else {
        this.lastMovePlayer.textContent = 'Người chơi 2 (O)';
        this.lastMovePlayer.className = 'last-move-player val-o';
        this.lastMoveCoord.className = 'last-move-coord coord-human';
      }
    }
  }

  /**
   * Cập nhật hiển thị lượt chơi và người chơi tiếp theo
   */
  updateTurnStatus(currentPlayer, mode, isAiThinking = false, lastCoordStr = '') {
    this.boardEl.setAttribute('data-current-player', currentPlayer);

    if (currentPlayer === 1) {
      this.turnBadge.className = 'turn-badge turn-x';
      this.turnIcon.textContent = '✕';
      this.turnPlayerName.textContent = mode === 'pve' ? 'Lượt của bạn (X)' : 'Người chơi 1 (X)';
      
      if (lastCoordStr) {
        this.statusHeadline.innerHTML = `AI vừa đánh ô <span class="badge-coord-alert">${lastCoordStr}</span>. Đến lượt bạn!`;
      } else {
        this.statusHeadline.textContent = mode === 'pve' ? 'Đến lượt bạn đi' : 'Lượt của Người chơi 1';
      }
      this.statusSubline.textContent = 'Nhấp vào ô trống trên bàn cờ';
    } else {
      this.turnBadge.className = 'turn-badge turn-o';
      this.turnIcon.textContent = '○';
      if (mode === 'pve') {
        this.turnPlayerName.textContent = 'Máy AI (O)';
        this.statusHeadline.textContent = isAiThinking ? 'Máy đang phân tích ma trận cờ...' : 'Lượt của Máy AI';
        this.statusSubline.textContent = isAiThinking ? 'Đang tính toán nước đi phòng thủ & tấn công' : 'Chuẩn bị nước đi';
      } else {
        this.turnPlayerName.textContent = 'Người chơi 2 (O)';
        this.statusHeadline.textContent = 'Lượt của Người chơi 2';
        this.statusSubline.textContent = 'Nhấp vào ô trống trên bàn cờ';
      }
    }

    this.boardEl.setAttribute('data-interactive', !isAiThinking);
  }

  /**
   * Cập nhật đồng hồ đếm ngược với tùy chọn thời gian linh hoạt
   * @param {number} secondsRemaining 
   * @param {number} total - Nếu total === 0 nghĩa là vô hạn thời gian
   */
  updateTimer(secondsRemaining, total = 15) {
    if (total === 0) {
      // Chế độ không giới hạn thời gian (Vô hạn)
      this.timerVal.innerHTML = '∞';
      this.timerVal.style.color = 'var(--color-win)';
      this.timerProgress.style.strokeDashoffset = 0;
      this.timerProgress.style.stroke = 'var(--color-win)';
      return;
    }

    const sec = Math.max(0, Math.ceil(secondsRemaining));
    this.timerVal.textContent = sec;

    // Tính toán vòng tròn SVG dashoffset: 100 -> 0
    const fraction = Math.max(0, secondsRemaining / total);
    const dashOffset = (1 - fraction) * 100;
    this.timerProgress.style.strokeDashoffset = dashOffset;

    // Đổi màu cảnh báo
    if (sec <= 4) {
      this.timerProgress.style.stroke = 'var(--color-o)';
      this.timerVal.style.color = 'var(--color-o)';
    } else if (sec <= Math.max(5, Math.floor(total * 0.4))) {
      this.timerProgress.style.stroke = 'var(--color-accent)';
      this.timerVal.style.color = 'var(--color-accent)';
    } else {
      this.timerProgress.style.stroke = 'var(--color-x)';
      this.timerVal.style.color = 'var(--color-text)';
    }
  }

  /**
   * Cập nhật giá trị hiển thị trên Dropdown thời gian
   */
  setTimeLimitSelectValue(val) {
    this.selectTimeLimit.value = String(val);
  }

  /**
   * Cập nhật bảng điểm
   */
  updateScoreboard(scoreboard, mode) {
    if (mode === 'pve') {
      this.scoreP1Label.textContent = 'Bạn (X)';
      this.scoreP2Label.textContent = 'Máy (O)';
      this.scoreP1Val.textContent = scoreboard.pve.playerWins;
      this.scoreP2Val.textContent = scoreboard.pve.aiWins;
      this.scoreDrawVal.textContent = scoreboard.pve.draws;
    } else {
      this.scoreP1Label.textContent = 'Người chơi 1 (X)';
      this.scoreP2Label.textContent = 'Người chơi 2 (O)';
      this.scoreP1Val.textContent = scoreboard.pvp.p1Wins;
      this.scoreP2Val.textContent = scoreboard.pvp.p2Wins;
      this.scoreDrawVal.textContent = scoreboard.pvp.draws;
    }
  }

  /**
   * Cập nhật trạng thái nút chọn chế độ
   */
  updateModeButtons(mode) {
    if (mode === 'pvp') {
      this.btnModePvp.classList.add('active');
      this.btnModePve.classList.remove('active');
    } else {
      this.btnModePve.classList.add('active');
      this.btnModePvp.classList.remove('active');
    }
  }

  /**
   * Thông báo Toast nổi góc màn hình
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'danger') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * Hiển thị Modal Game Over khi kết thúc ván
   */
  showGameOverModal(winner, mode, reason = 'normal') {
    if (winner === 'draw') {
      this.modalBadge.textContent = '🤝';
      this.modalTitle.textContent = 'Ván Đấu Hòa!';
      this.modalMessage.textContent = 'Bàn cờ đã được phủ kín toàn bộ 225 nước đi mà không bên nào đạt 5 quân liên tiếp.';
    } else {
      const isPlayerX = winner === 1;
      this.modalBadge.textContent = isPlayerX ? '🏆' : (mode === 'pve' ? '🤖' : '🎉');
      
      let name = '';
      if (mode === 'pve') {
        name = isPlayerX ? 'Bạn (X)' : 'Máy AI (O)';
      } else {
        name = isPlayerX ? 'Người chơi 1 (X)' : 'Người chơi 2 (O)';
      }

      if (reason === 'timeout') {
        this.modalTitle.textContent = `${name} Chiến Thắng!`;
        this.modalMessage.textContent = `Đối thủ đã hết thời gian suy nghĩ! ${name} được xử thắng theo luật ván đấu.`;
      } else {
        this.modalTitle.textContent = `${name} Chiến Thắng!`;
        this.modalMessage.textContent = `Chúc mừng ${name} đã hoàn thành 5 quân liên tiếp xuất sắc!`;
      }

      // Kích hoạt pháo hoa hoa giấy nếu con người thắng
      if (mode === 'pvp' || (mode === 'pve' && isPlayerX)) {
        this.triggerConfetti();
      }
    }

    this.modalOverlay.classList.add('active');
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
  }

  updateSoundUI(enabled) {
    this.soundIcon.textContent = enabled ? '🔊' : '🔇';
    this.soundText.textContent = `Âm thanh: ${enabled ? 'Bật' : 'Tắt'}`;
  }

  setControlsEnabled(enabled) {
    this.btnUndo.disabled = !enabled;
    this.btnSave.disabled = !enabled;
    this.btnLoad.disabled = !enabled;
  }

  triggerConfetti() {
    const canvas = this.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#00d2ff', '#ff4d6d', '#ffd166', '#06d6a0', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animId);
      }
    };

    render();
  }
}

if (typeof window !== 'undefined') {
  window.UIRenderer = UIRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIRenderer;
}
