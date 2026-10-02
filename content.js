(() => {
  'use strict';

  const VERSION = '1.0.4-test4';
  const GRID = '#tib_conv_main_grid';
  const ROW = '.tib-listviewSingle[id^="conv_"]';
  const PREVIEW_STORAGE_KEY = 'teamInboxMailViewPreviewWidth';

  const DEFAULT_PREVIEW_WIDTH = 560;
  const MIN_PREVIEW = 550;
  const MIN_LIST = 280;
  const NATIVE_RHS_WIDTH = 320;
  const RESIZER_SPACE = 7;

  let initializedGrid = null;
  let previewWidth = DEFAULT_PREVIEW_WIDTH;
  let userOpenedPreview = false;
  let startupHandled = false;

  const getGrid = () => document.querySelector(GRID);
  const getList = grid => grid?.querySelector(':scope > .tib-grid__lister');
  const getPreview = grid => grid?.querySelector(':scope > .tib-grid__preview[aria-label="Email preview"]');
  const getRhs = grid => grid?.querySelector(':scope > #tib_rhs_conv_rhs_widget.tib-grid__rhs');
  const getNativePreviewResizer = preview => preview?.querySelector(':scope > .tib-resizeline[data-resizebar="PREVIEW_VERTICAL"]');

  const isRhsOpen = grid => {
    const rhs = getRhs(grid);
    if (!rhs || rhs.classList.contains('tib-displaynone')) return false;
    const style = getComputedStyle(rhs);
    const rect = rhs.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };

  const reservedRhsWidth = grid => {
    if (!isRhsOpen(grid)) return 0;
    const rhs = getRhs(grid);
    return rhs ? Math.max(NATIVE_RHS_WIDTH, rhs.getBoundingClientRect().width) : NATIVE_RHS_WIDTH;
  };

  const clampPreviewWidth = (grid, width) => {
    const gridWidth = grid.getBoundingClientRect().width;
    const rhsReserve = reservedRhsWidth(grid);
    const max = Math.max(MIN_PREVIEW, gridWidth - MIN_LIST - rhsReserve - RESIZER_SPACE);
    return Math.max(MIN_PREVIEW, Math.min(Number(width) || DEFAULT_PREVIEW_WIDTH, max));
  };

  const setPreviewWidth = (grid, width, persist = false) => {
    previewWidth = clampPreviewWidth(grid, width);
    grid.style.setProperty('--tmv-preview-width', `${previewWidth}px`);
    document.body.style.setProperty('--tib-preview-vertical', `${previewWidth}px`);
    if (persist) chrome.storage.local.set({ [PREVIEW_STORAGE_KEY]: Math.round(previewWidth) });
  };

  const syncResponsiveLayout = grid => {
    if (userOpenedPreview) setPreviewWidth(grid, previewWidth);
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
    syncResponsiveLayout(grid);
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

  const makePreviewResizer = grid => {
    let resizer = grid.querySelector(':scope > #tmv-resizer');
    if (resizer) return resizer;

    resizer = document.createElement('div');
    resizer.id = 'tmv-resizer';
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    resizer.setAttribute('aria-label', 'Resize email preview');
    resizer.title = 'Drag to resize preview. Double-click to reset.';

    const list = getList(grid);
    list.insertAdjacentElement('afterend', resizer);

    resizer.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.add('tmv-resizing');

      const onMove = moveEvent => {
        const rect = grid.getBoundingClientRect();
        const requested = rect.right - moveEvent.clientX - reservedRhsWidth(grid) - RESIZER_SPACE;
        setPreviewWidth(grid, requested);
      };
      const onUp = () => {
        document.body.classList.remove('tmv-resizing');
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        setPreviewWidth(grid, previewWidth, true);
      };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
    });

    resizer.addEventListener('dblclick', event => {
      event.preventDefault();
      setPreviewWidth(grid, DEFAULT_PREVIEW_WIDTH, true);
    });
    return resizer;
  };

  const enhanceRhsCloseControl = grid => {
    const rhs = getRhs(grid);
    const closeControl = document.getElementById('tib-extCmtId');
    if (!rhs || !closeControl) return;

    const open = isRhsOpen(grid);
    closeControl.classList.toggle('tmv-rhs-close', open);
    rhs.classList.toggle('tmv-rhs-open', open);
    if (!open) return;

    // Anchor the native Zoho control to the actual RHS bounds. This keeps it visually
    // attached to Comments / Extensions without moving the element or replacing its handler.
    const rect = rhs.getBoundingClientRect();
    closeControl.style.setProperty('--tmv-rhs-close-left', `${Math.round(rect.left)}px`);
    closeControl.style.setProperty('--tmv-rhs-close-top', `${Math.round(rect.top)}px`);
    closeControl.style.setProperty('--tmv-rhs-close-width', `${Math.round(rect.width)}px`);

    closeControl.setAttribute('aria-label', 'Close Comments & Extensions');
    closeControl.removeAttribute('title');
    closeControl.setAttribute('data-tmv-close-label', 'Close panel');
  };

  const normalizePreview = grid => {
    const preview = getPreview(grid);
    if (preview) {
      const nativeResizer = getNativePreviewResizer(preview);
      if (nativeResizer) nativeResizer.classList.add('tmv-native-resizer-hidden');
    }

    const shell = grid.closest('.tib-grid');
    if (shell) shell.classList.toggle('tib-grid--preview', userOpenedPreview);
    syncResponsiveLayout(grid);
    enhanceRhsCloseControl(grid);
  };

  const bindGrid = grid => {
    if (!getList(grid)) return false;

    if (initializedGrid !== grid) {
      initializedGrid = grid;
      grid.classList.add('tmv-enabled');
      closePreview(grid);
      makePreviewResizer(grid);
      chrome.storage.local.get({
        [PREVIEW_STORAGE_KEY]: DEFAULT_PREVIEW_WIDTH
      }, result => {
        previewWidth = Number(result[PREVIEW_STORAGE_KEY]) || DEFAULT_PREVIEW_WIDTH;
        syncResponsiveLayout(grid);
      });
    } else {
      grid.classList.add('tmv-enabled');
      makePreviewResizer(grid);
      userOpenedPreview ? openPreview(grid) : closePreview(grid);
    }

    normalizePreview(grid);
    return true;
  };

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
    if (grid) syncResponsiveLayout(grid);
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

  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  scheduleRefresh();
  console.info(`[TeamInbox MailView] v${VERSION} by RedPandaOne loaded`);
})();
