import {
  clearStoredSession,
  computeSha256,
  DEFAULT_SERVER_URL,
  getSignedUploadUrl,
  getStoredSession,
  saveStoredSession,
  submitCapturedQuestion,
  uploadBlobToSignedUrl,
  validateSession,
  type CaptureSessionConfig,
} from './api';
import { calculateSourceCoordinates, type CropRect } from './crop';

interface PendingCrop {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly dataUrl: string;
}

// Elements
const statusBanner = document.getElementById('statusBanner') as HTMLDivElement;
const disconnectedSection = document.getElementById('disconnectedSection') as HTMLDivElement;
const connectedSection = document.getElementById('connectedSection') as HTMLDivElement;
const tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
const serverUrlInput = document.getElementById('serverUrlInput') as HTMLInputElement;
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;
const connectedTestTitle = document.getElementById('connectedTestTitle') as HTMLHeadingElement;
const capturedCounterText = document.getElementById('capturedCounterText') as HTMLParagraphElement;
const triggerSnipBtn = document.getElementById('triggerSnipBtn') as HTMLButtonElement;
const reviewCard = document.getElementById('reviewCard') as HTMLDivElement;
const previewImg = document.getElementById('previewImg') as HTMLImageElement;
const previewMeta = document.getElementById('previewMeta') as HTMLSpanElement;
const submitQuestionBtn = document.getElementById('submitQuestionBtn') as HTMLButtonElement;
const discardBtn = document.getElementById('discardBtn') as HTMLButtonElement;
const optBtns = document.querySelectorAll<HTMLButtonElement>('.opt-btn');

let activeSession: CaptureSessionConfig | null = null;
let currentPendingCrop: PendingCrop | null = null;
let selectedAnswer: 'A' | 'B' | 'C' | 'D' | 'E' | null = null;

function showBanner(message: string, type: 'ok' | 'error'): void {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  setTimeout(() => {
    if (statusBanner.textContent === message) {
      statusBanner.className = 'status-banner';
    }
  }, 4000);
}

function updateUiState(): void {
  if (activeSession) {
    disconnectedSection.classList.add('hidden');
    connectedSection.classList.remove('hidden');
    connectedTestTitle.textContent = activeSession.testTitle || 'Aktif test';
    capturedCounterText.textContent = `Bu oturumda eklenen: ${activeSession.capturedCount} soru`;
  } else {
    connectedSection.classList.add('hidden');
    disconnectedSection.classList.remove('hidden');
    reviewCard.classList.add('hidden');
  }
}

// Option selector
optBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const opt = btn.getAttribute('data-opt') as 'A' | 'B' | 'C' | 'D' | 'E';
    if (selectedAnswer === opt) {
      selectedAnswer = null;
      btn.classList.remove('active');
    } else {
      selectedAnswer = opt;
      optBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });
});

// Initialise
async function init(): Promise<void> {
  const stored = await getStoredSession();
  if (stored) {
    const validation = await validateSession(stored.serverUrl, stored.token);
    if (validation.ok && validation.session) {
      activeSession = {
        ...stored,
        testTitle: validation.session.testTitle,
      };
      await saveStoredSession(activeSession);
    } else {
      await clearStoredSession();
      activeSession = null;
    }
  }
  updateUiState();
}

// Connect action
async function handleConnect(): Promise<void> {
  const token = tokenInput.value.trim();
  const serverUrl = serverUrlInput.value.trim() || DEFAULT_SERVER_URL;

  if (!token) {
    showBanner('Lütfen geçerli bir yakalama jetonu giriniz.', 'error');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Bağlanıyor...';

  try {
    const res = await validateSession(serverUrl, token);
    if (!res.ok || !res.session) {
      showBanner('Jeton doğrulanamadı veya süresi dolmuş.', 'error');
      return;
    }

    activeSession = {
      serverUrl,
      token,
      sessionId: res.session.sessionId,
      workspaceId: res.session.workspaceId,
      testId: res.session.testId,
      testTitle: res.session.testTitle,
      deviceType: 'extension',
      capturedCount: 0,
    };

    await saveStoredSession(activeSession);
    updateUiState();
    showBanner('Teste başarıyla bağlanıldı.', 'ok');
  } catch (err) {
    showBanner(err instanceof Error ? err.message : 'Bağlantı hatası.', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Oturuma bağlan';
  }
}

connectBtn.addEventListener('click', () => {
  void handleConnect();
});

// Disconnect action
async function handleDisconnect(): Promise<void> {
  await clearStoredSession();
  activeSession = null;
  currentPendingCrop = null;
  updateUiState();
}

disconnectBtn.addEventListener('click', () => {
  void handleDisconnect();
});

// Trigger Snip action
triggerSnipBtn.addEventListener('click', () => {
  triggerSnipBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'REQUEST_SNIP' }, (res?: { ok?: boolean; reason?: string }) => {
    if (chrome.runtime.lastError || (res && !res.ok)) {
      triggerSnipBtn.disabled = false;
      showBanner('Kırpma başlatılamadı. Sayfayı yenileyip tekrar deneyiniz.', 'error');
    }
  });
});

// Discard pending crop
discardBtn.addEventListener('click', () => {
  currentPendingCrop = null;
  reviewCard.classList.add('hidden');
  previewImg.src = '';
  selectedAnswer = null;
  optBtns.forEach((b) => b.classList.remove('active'));
});

// Message listener from background
chrome.runtime.onMessage.addListener((message: { action?: string; dataUrl?: string; rect?: CropRect; viewport?: { width: number; height: number }; reason?: string }) => {
  if (message.action === 'SNIP_CANCELLED_FORWARD') {
    triggerSnipBtn.disabled = false;
    return;
  }

  if (message.action === 'PROCESS_SNIP' && message.dataUrl && message.rect && message.viewport) {
    triggerSnipBtn.disabled = false;
    void processCapturedScreenshot(message.dataUrl, message.rect, message.viewport);
    return;
  }

  if (message.action === 'SNIP_ERROR') {
    triggerSnipBtn.disabled = false;
    showBanner('Ekran görüntüsü alınamadı.', 'error');
  }
});

async function processCapturedScreenshot(
  dataUrl: string,
  rect: CropRect,
  viewport: { width: number; height: number },
): Promise<void> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  const { sx, sy, sWidth, sHeight } = calculateSourceCoordinates(
    rect,
    img.naturalWidth,
    img.naturalHeight,
    viewport.width,
    viewport.height,
  );

  const canvas = document.createElement('canvas');
  canvas.width = sWidth;
  canvas.height = sHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

  canvas.toBlob((blob) => {
    if (!blob) return;

    const croppedDataUrl = canvas.toDataURL('image/png');
    currentPendingCrop = {
      blob,
      width: sWidth,
      height: sHeight,
      dataUrl: croppedDataUrl,
    };

    previewImg.src = croppedDataUrl;
    previewMeta.textContent = `${sWidth} × ${sHeight} px · ${Math.round(blob.size / 1024)} KB`;
    reviewCard.classList.remove('hidden');
  }, 'image/png');
}

// Submit Question
async function handleSubmit(): Promise<void> {
  if (!activeSession || !currentPendingCrop) return;

  submitQuestionBtn.disabled = true;
  discardBtn.disabled = true;
  submitQuestionBtn.textContent = 'Ekleniyor...';

  try {
    const { serverUrl, token } = activeSession;
    const { blob, width, height } = currentPendingCrop;

    const uploadRes = await getSignedUploadUrl(serverUrl, token, 'png');
    if (!uploadRes.ok || !uploadRes.signedUrl || !uploadRes.path) {
      throw new Error(uploadRes.reason || 'Yükleme adresi alınamadı.');
    }

    const uploadSuccess = await uploadBlobToSignedUrl(uploadRes.signedUrl, blob, 'image/png');
    if (!uploadSuccess) {
      throw new Error('Görsel depolamaya yüklenemedi.');
    }

    const sha256 = await computeSha256(blob);
    const itemId = crypto.randomUUID();
    const position = 'a0'; // Appends to bottom

    const submitRes = await submitCapturedQuestion(serverUrl, {
      token,
      itemId,
      position,
      path: uploadRes.path,
      mime: 'image/png',
      bytes: blob.size,
      width,
      height,
      sha256,
      phash: '0000000000000000', // Extension fast-capture stub
      answer: selectedAnswer ?? null,
    });

    if (!submitRes.ok) {
      throw new Error(submitRes.reason || 'Soru teste eklenemedi.');
    }

    // Success! Update counter
    activeSession = {
      ...activeSession,
      capturedCount: activeSession.capturedCount + 1,
    };
    await saveStoredSession(activeSession);
    updateUiState();

    // Reset review card
    currentPendingCrop = null;
    reviewCard.classList.add('hidden');
    previewImg.src = '';
    selectedAnswer = null;
    optBtns.forEach((b) => b.classList.remove('active'));

    showBanner('Soru başarıyla teste eklendi.', 'ok');
  } catch (err) {
    showBanner(err instanceof Error ? err.message : 'Gönderim sırasında hata oluştu.', 'error');
  } finally {
    submitQuestionBtn.disabled = false;
    discardBtn.disabled = false;
    submitQuestionBtn.textContent = 'Teste ekle';
  }
}

submitQuestionBtn.addEventListener('click', () => {
  void handleSubmit();
});

void init();
