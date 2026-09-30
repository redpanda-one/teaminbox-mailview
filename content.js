(() => {
  'use strict';

  const VERSION = '1.0.1';
  const GRID = '#tib_conv_main_grid';
  const ROW = '.tib-listviewSingle[id^="conv_"]';
  const STORAGE_KEY = 'teamInboxMailViewPreviewWidth';
  const DEFAULT_WIDTH = 560;
  const MIN_PREVIEW = 320;
  const MIN_LIST = 360;

  let initializedGrid = null;
  let previewWidth = DEFAULT_WIDTH;
  let userOpenedPreview = false;
  let startupHandled = false;

  const getGrid = () => document.querySelector(GRID);
  const getList = grid => grid?.querySelector(':scope > .tib-grid__lister');
  const getPreview = grid => grid?.querySelector(':scope > .tib-grid__preview[aria-label="Email preview"]');
  const getNativePreviewResizer = preview => preview?.querySelector(':scope > .tib-resizeline[data-resizebar="PREVIEW_VERTICAL"]');

  const clampWidth = (grid, width) => {
    const max = Math.max(MIN_PREVIEW, grid.getBoundingClientRect().width - MIN_LIST);
    return Math.max(MIN_PREVIEW, Math.min(Number(width) || DEFAULT_WIDTH, max));
  };

  const setWidth = (grid, width, persist = false) => {
    previewWidth = clampWidth(grid, width);
    grid.style.setProperty('--tmv-preview-width', `${previewWidth}px`);
    // TeamInbox itself uses this variable for its native vertical preview layout.
    document.body.style.setProperty('--tib-preview-vertical', `${previewWidth}px`);
    if (persist) chrome.storage.local.set({ [STORAGE_KEY]: Math.round(previewWidth) });
  };

  const closePreview = grid => {
    userOpenedPreview = false;
    grid.classList.remove('tmv-preview-open');
    grid.classList.add('tmv-preview-closed');
  };

  const openPreview = grid => {
    userOpenedPreview = true;
    grid.classList.remove('tmv-preview-closed');
    grid.classList.add('tmv-preview-open');
    setWidth(grid, previewWidth);
  };

  const dismissStartupFocusPopup = () => {
    if (startupHandled) return;
    const popup = document.querySelector('#focusView_popup[role="dialog"]');
    if (!popup) return;
    const close = popup.querySelector('button[aria-label="close"], button.tib-popup__closeicon');
    if (!close) return;
    startupHandled = true;
    close.click();
  };

  const makeResizer = (grid) => {
    let resizer = grid.querySelector(':scope > #tmv-resizer');
    if (resizer) return resizer;

    resizer = document.createElement('div');
    resizer.id = 'tmv-resizer';
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    resizer.setAttribute('aria-label', 'Resize email preview');
    resizer.title = 'Drag to resize preview. Double-click to reset.';

    // Insert immediately after the list. This is the actual list/preview boundary.
    const list = getList(grid);
    list.insertAdjacentElement('afterend', resizer);

    resizer.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.add('tmv-resizing');

      const onMove = moveEvent => {
        const rect = grid.getBoundingClientRect();
        setWidth(grid, rect.right - moveEvent.clientX);
      };
      const onUp = () => {
        document.body.classList.remove('tmv-resizing');
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        setWidth(grid, previewWidth, true);
      };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
    });

    resizer.addEventListener('dblclick', event => {
      event.preventDefault();
      setWidth(grid, DEFAULT_WIDTH, true);
    });
    return resizer;
  };

  const normalizePreview = grid => {
    const preview = getPreview(grid);
    if (!preview) return;

    // The extension owns the divider; hide TeamInbox's internal divider so there is only one drag target.
    const nativeResizer = getNativePreviewResizer(preview);
    if (nativeResizer) nativeResizer.classList.add('tmv-native-resizer-hidden');

    // TeamInbox toggles this parent class when its preview is active. Keep it aligned with MailView.
    const shell = grid.closest('.tib-grid');
    if (shell) shell.classList.toggle('tib-grid--preview', userOpenedPreview);
  };

  const bindGrid = grid => {
    if (!getList(grid)) return false;

    if (initializedGrid !== grid) {
      initializedGrid = grid;
      grid.classList.add('tmv-enabled');
      closePreview(grid);
      makeResizer(grid);
      chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_WIDTH }, result => {
        setWidth(grid, result[STORAGE_KEY]);
      });
    } else {
      grid.classList.add('tmv-enabled');
      makeResizer(grid);
      userOpenedPreview ? openPreview(grid) : closePreview(grid);
    }

    normalizePreview(grid);
    return true;
  };

  // Do not cancel TeamInbox's native row click. We only switch our layout state.
  document.addEventListener('click', event => {
    const grid = getGrid();
    if (!grid) return;

    const closeButton = event.target.closest('[aria-label="Close preview"]');
    if (closeButton && grid.contains(closeButton)) {
      queueMicrotask(() => closePreview(grid));
      return;
    }

    const row = event.target.closest(ROW);
    if (!row || !grid.contains(row)) return;
    if (event.target.closest('button, input, [role="button"], a')) return;

    openPreview(grid);
    // Zoho may replace the preview node after the click; normalize again after render.
    requestAnimationFrame(() => normalizePreview(grid));
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const grid = getGrid();
    if (!grid?.classList.contains('tmv-preview-open')) return;
    const nativeClose = getPreview(grid)?.querySelector('button[aria-label="Close preview"]');
    if (nativeClose) nativeClose.click();
    else closePreview(grid);
  }, true);

  window.addEventListener('resize', () => {
    const grid = getGrid();
    if (grid?.classList.contains('tmv-preview-open')) setWidth(grid, previewWidth);
  });

  let scheduled = false;
  const refresh = () => {
    scheduled = false;
    dismissStartupFocusPopup();
    const grid = getGrid();
    if (grid) bindGrid(grid);
  };
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };

  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList: true, subtree: true });
  scheduleRefresh();
  console.info(`[TeamInbox MailView] v${VERSION} by RedPandaOne loaded`);
})();
