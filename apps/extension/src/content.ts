import { normalizeCropRect, validateCropRect, type CropRect } from './crop';

let activeOverlay: HTMLDivElement | null = null;

function removeOverlay(): void {
  if (activeOverlay && activeOverlay.parentElement) {
    activeOverlay.remove();
  }
  activeOverlay = null;
}

export function startSnip(): void {
  removeOverlay();

  const overlay = document.createElement('div');
  overlay.className = 'testcim-snip-overlay';

  const badge = document.createElement('div');
  badge.className = 'testcim-snip-badge';
  badge.innerHTML = `<span>Soruyu seçmek için fareyi sürükleyin</span><span class="testcim-snip-badge-key">Esc İptal</span>`;
  overlay.appendChild(badge);

  const selectionBox = document.createElement('div');
  selectionBox.className = 'testcim-snip-box';
  selectionBox.style.display = 'none';
  overlay.appendChild(selectionBox);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentRect: CropRect | null = null;

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    currentRect = normalizeCropRect({
      startX,
      startY,
      endX: e.clientX,
      endY: e.clientY,
      dpr: window.devicePixelRatio || 1,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    selectionBox.style.left = `${currentRect.x}px`;
    selectionBox.style.top = `${currentRect.y}px`;
    selectionBox.style.width = `${currentRect.width}px`;
    selectionBox.style.height = `${currentRect.height}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    removeOverlay();

    if (currentRect && validateCropRect(currentRect, 12).valid) {
      void chrome.runtime.sendMessage({
        action: 'SNIP_CAPTURED',
        rect: currentRect,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    } else {
      void chrome.runtime.sendMessage({
        action: 'SNIP_CANCELLED',
        reason: 'too_small',
      });
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      removeOverlay();
      void chrome.runtime.sendMessage({ action: 'SNIP_CANCELLED', reason: 'escape' });
    }
  };

  overlay.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp, { once: true });
  window.addEventListener('keydown', onKeyDown, { once: true });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
}

// Listen for messages from background or sidepanel
chrome.runtime.onMessage.addListener((message: { action?: string }, _sender, sendResponse) => {
  if (message.action === 'START_SNIP') {
    startSnip();
    sendResponse({ ok: true });
  }
  return true;
});

// Shortcut Alt+Shift+C
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.altKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    startSnip();
  }
});
