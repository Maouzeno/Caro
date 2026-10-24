/**
 * =============================================================================
 * APPLICATION ENTRY POINT
 * =============================================================================
 * Khởi tạo GameController khi tài liệu DOM sẵn sàng.
 * =============================================================================
 */
window.addEventListener('DOMContentLoaded', () => {
  const caroGame = new GameController();
  caroGame.init();
});

