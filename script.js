let notes = JSON.parse(localStorage.getItem('lyric_notes')) || [];
let currentNoteId = null;

const notesGrid = document.getElementById('notesGrid');
const editorModal = document.getElementById('editorModal');
const openCreateModalBtn = document.getElementById('openCreateModal');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const lyricsEditor = document.getElementById('lyricsEditor');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');

// 初期表示
renderNotes();

// イベント設定
openCreateModalBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);

// モード状態の管理
let currentMode = 'pen'; // 'pen' または 'marker'

const penModeBtn = document.getElementById('penModeBtn');
const markerModeBtn = document.getElementById('markerModeBtn');
const colorPalette = document.querySelector('.color-palette');

// モード切り替え時にパレットボタンの見た目（濃い色/薄い色）を自動変更する関数
function updateColorPaletteUI() {
    document.querySelectorAll('.color-btn').forEach(btn => {
        const penColor = btn.getAttribute('data-color');
        const markerColor = btn.getAttribute('data-marker-color') || penColor;
        
        btn.style.background = (currentMode === 'marker') ? markerColor : penColor;
    });
}

// モード切り替え処理
penModeBtn.addEventListener('mousedown', (e) => e.preventDefault());
markerModeBtn.addEventListener('mousedown', (e) => e.preventDefault());

penModeBtn.addEventListener('click', () => {
    currentMode = 'pen';
    penModeBtn.classList.add('active');
    markerModeBtn.classList.remove('active');
    colorPalette.classList.remove('marker-mode'); // 丸に戻す
    updateColorPaletteUI();
});

markerModeBtn.addEventListener('click', () => {
    currentMode = 'marker';
    markerModeBtn.classList.add('active');
    penModeBtn.classList.remove('active');
    colorPalette.classList.add('marker-mode'); // 平行四辺形にする
    updateColorPaletteUI();
});

// 色変更処理（ペン用/マーカー用の色を自動で判定）
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());

    btn.addEventListener('click', (e) => {
        lyricsEditor.focus();

        if (currentMode === 'pen') {
            // 文字色（濃い色）を適用
            const color = btn.getAttribute('data-color');
            document.execCommand('foreColor', false, color);
        } else {
            // 背景色（薄いマーカー色）を適用
            const color = btn.getAttribute('data-marker-color') || btn.getAttribute('data-color');
            if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
        }
    });
});

// 消しゴムボタンの取得とイベント設定
const eraserBtn = document.getElementById('eraserBtn');

eraserBtn.addEventListener('mousedown', (e) => e.preventDefault());
eraserBtn.addEventListener('click', () => {
    lyricsEditor.focus();

    // 選択範囲または現在のカーソル位置の文字色・背景色リセット
    document.execCommand('removeFormat', false, null);
    document.execCommand('foreColor', false, '#202124'); // 基本文字色に戻す
    if (!document.execCommand('hiliteColor', false, 'transparent')) {
        document.execCommand('backColor', false, 'transparent'); // マーカー色を透明に戻す
    }
});

// 記号挿入処理
document.querySelectorAll('.symbol-btn').forEach(btn => {
    // マウスを押した時にカーソル位置が消えるのを防ぐ
    btn.addEventListener('mousedown', (e) => e.preventDefault());

    btn.addEventListener('click', (e) => {
        const symbol = e.target.getAttribute('data-symbol');
        lyricsEditor.focus();
        document.execCommand('insertText', false, symbol);
    });
});

// ==========================================
// 大/小文字・半改行モードの処理
// ==========================================
let isSmallTextMode = false;
const largeTextBtn = document.getElementById('largeTextBtn');
const smallTextBtn = document.getElementById('smallTextBtn');

largeTextBtn.addEventListener('mousedown', (e) => e.preventDefault());
smallTextBtn.addEventListener('mousedown', (e) => e.preventDefault());

function updateSizeButtons() {
    largeTextBtn.classList.toggle('active', !isSmallTextMode);
    smallTextBtn.classList.toggle('active', isSmallTextMode);
}

// 選択範囲内に「小さい文字」が含まれているか判定する関数
function selectionHasSmallText(range) {
    const startEl = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    if (startEl && (startEl.closest('.small-text') || (startEl.closest('.half-line') && !startEl.closest('.normal-text')))) {
        return true;
    }
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.textContent.replace(/\u200B/g, '') === '') return NodeFilter.FILTER_REJECT;
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    let textNode;
    while ((textNode = walker.nextNode())) {
        const parent = textNode.parentElement;
        if (parent?.closest('.small-text') || (parent?.closest('.half-line') && !parent?.closest('.normal-text'))) return true;
    }
    return false;
}

// 指定した行（DIV）の文字すべてが選択範囲に含まれているか判定する関数
function isEntireLineSelected(lineEl, range) {
    const lineText = lineEl.textContent.replace(/\u200B/g, '');
    if (lineText === '') return range.intersectsNode(lineEl);
    const lineRange = document.createRange();
    lineRange.selectNodeContents(lineEl);
    const startsAtOrBefore = range.compareBoundaryPoints(Range.START_TO_START, lineRange) <= 0;
    const endsAtOrAfter = range.compareBoundaryPoints(Range.END_TO_END, lineRange) >= 0;
    if (startsAtOrBefore && endsAtOrAfter) return true;
    if (lineEl.contains(range.startContainer) && lineEl.contains(range.endContainer)) {
        return range.cloneContents().textContent.replace(/\u200B/g, '').length >= lineText.length;
    }
    return false;
}

// 単一行内の選択範囲を「通常サイズ」または「小文字」に変換する補助関数
function applySizeToSingleLineRange(subRange, lineEl, toNormal) {
    const inHalfLine = !!lineEl?.classList.contains('half-line');
    if (lineEl && isEntireLineSelected(lineEl, subRange)) {
        if (toNormal) {
            if (inHalfLine) {
                lineEl.classList.remove('half-line');
                lineEl.classList.add('normal-line');
            }
            lineEl.querySelectorAll('.small-text, .normal-text').forEach(el => el.replaceWith(...el.childNodes));
        } else {
            lineEl.querySelectorAll('.small-text, .normal-text').forEach(el => el.replaceWith(...el.childNodes));
            if (!inHalfLine) {
                const span = document.createElement('span');
                span.className = 'small-text';
                while (lineEl.firstChild) span.appendChild(lineEl.firstChild);
                lineEl.appendChild(span);
            }
        }
        return;
    }
    const extracted = subRange.extractContents();
    extracted.querySelectorAll('.small-text, .normal-text').forEach(el => el.replaceWith(...el.childNodes));
    const span = document.createElement('span');
    span.className = toNormal ? (inHalfLine ? 'normal-text' : '') : (inHalfLine ? '' : 'small-text');
    if (span.className) {
        span.appendChild(extracted);
        subRange.insertNode(span);
    } else {
        subRange.insertNode(extracted);
    }
}

// 大・小ボタンクリック共通処理
function handleSizeChange(setToSmall) {
    lyricsEditor.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        isSmallTextMode = setToSmall;
        updateSizeButtons();
        return;
    }
    const range = selection.getRangeAt(0);

    if (!range.collapsed) {
        isSmallTextMode = setToSmall;
        updateSizeButtons();
        const toNormal = !setToSmall;

        const getTopLine = (node) => {
            let curr = node;
            while (curr && curr !== lyricsEditor && curr.parentNode !== lyricsEditor) curr = curr.parentNode;
            return (curr && curr !== lyricsEditor && curr.nodeName === 'DIV') ? curr : null;
        };

        const startLine = getTopLine(range.startContainer);
        const endLine = getTopLine(range.endContainer);

        if (startLine && endLine && startLine !== endLine) {
            const allLines = Array.from(lyricsEditor.children).filter(el => el.nodeName === 'DIV');
            const startIdx = allLines.indexOf(startLine);
            const endIdx = allLines.indexOf(endLine);
            for (let i = startIdx; i <= endIdx; i++) {
                const line = allLines[i];
                const subRange = document.createRange();
                if (i === startIdx) {
                    subRange.setStart(range.startContainer, range.startOffset);
                    subRange.setEnd(line, line.childNodes.length);
                } else if (i === endIdx) {
                    subRange.setStart(line, 0);
                    subRange.setEnd(range.endContainer, range.endOffset);
                } else {
                    subRange.selectNodeContents(line);
                }
                applySizeToSingleLineRange(subRange, line, toNormal);
            }
            selection.collapseToEnd();
        } else {
            applySizeToSingleLineRange(range, startLine, toNormal);
            selection.collapseToEnd();
        }
    } else {
        isSmallTextMode = setToSmall;
        updateSizeButtons();
        
        // 小→大にしたとき、空の半改行を通常行に戻す
        if (!isSmallTextMode) {
            const el = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
            const halfLine = el?.closest('.half-line');
            if (halfLine && halfLine.textContent.replace(/\u200B/g, '').trim() === '') {
                halfLine.classList.replace('half-line', 'normal-line');
                halfLine.innerHTML = '<br>';
                const newRange = document.createRange();
                newRange.setStart(halfLine, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
        prepareTypingStyle();
    }
}

largeTextBtn.addEventListener('click', () => handleSizeChange(false));
smallTextBtn.addEventListener('click', () => handleSizeChange(true));

lyricsEditor.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection.rangeCount && selection.getRangeAt(0).collapsed) prepareTypingStyle();
});

lyricsEditor.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete'].includes(e.key)) {
        const selection = window.getSelection();
        if (selection.rangeCount && selection.getRangeAt(0).collapsed) prepareTypingStyle();
    }
});

function prepareTypingStyle() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    // 現在のカーソル位置を失わないように、アクティブな要素を特定
    const currentContainer = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;

    // 不要な空スパンの削除（現在カーソルがいる要素とその親は削除しない）
    lyricsEditor.querySelectorAll('.small-text, .normal-text').forEach(span => {
        if (!span.contains(currentContainer) && span !== currentContainer && span.textContent.replace(/\u200B/g, '') === '') {
            span.remove();
        }
    });

    // 削除処理後にRangeを取り直す（瞬間移動バグの防止）
    if (!selection.rangeCount) return;
    const currentRange = selection.getRangeAt(0);
    const el = currentRange.startContainer.nodeType === Node.TEXT_NODE ? currentRange.startContainer.parentElement : currentRange.startContainer;

    const inHalfLine = !!el?.closest('.half-line');
    const inSmallSpan = el?.closest('.small-text');
    const inNormalSpan = el?.closest('.normal-text');

    // モードと現在の要素の状態が一致している場合は何もしない
    if (isSmallTextMode && (inSmallSpan || (inHalfLine && !inNormalSpan))) return;
    if (!isSmallTextMode && (inNormalSpan || (!inHalfLine && !inSmallSpan))) return;

    const span = document.createElement('span');
    span.className = isSmallTextMode ? 'small-text' : 'normal-text';
    span.textContent = '\u200B';
    currentRange.insertNode(span);
    currentRange.setStart(span.firstChild, 1);
    currentRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(currentRange);
}

// モーダルを開く
function openModal(note = null) {
    if (note) {
        currentNoteId = note.id;
        songTitle.value = note.title;
        songArtist.value = note.artist;
        lyricsEditor.innerHTML = note.content;
        deleteBtn.style.display = 'block';
    } else {
        currentNoteId = null;
        songTitle.value = '';
        songArtist.value = '';
        lyricsEditor.innerHTML = '';
        deleteBtn.style.display = 'none';
    }
    editorModal.classList.add('active');
}

// モーダルを閉じる
function closeModal() {
    editorModal.classList.remove('active');
}

// 歌詞を保存
function saveNote() {
    const title = songTitle.value.trim() || '無題の歌詞帳';
    const artist = songArtist.value.trim();
    const content = lyricsEditor.innerHTML;

    if (currentNoteId) {
        notes = notes.map(n => n.id === currentNoteId ? { id: currentNoteId, title, artist, content } : n);
    } else {
        notes.push({ id: Date.now(), title, artist, content });
    }

    localStorage.setItem('lyric_notes', JSON.stringify(notes));
    renderNotes();
    closeModal();
}

// 歌詞を削除
function deleteNote() {
    if (currentNoteId && confirm('この歌詞帳を削除しますか？')) {
        notes = notes.filter(n => n.id !== currentNoteId);
        localStorage.setItem('lyric_notes', JSON.stringify(notes));
        renderNotes();
        closeModal();
    }
}

// カード一覧を描画
function renderNotes() {
    notesGrid.innerHTML = '';
    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <div class="card-title">${escapeHtml(note.title)}</div>
            <div class="card-artist">${escapeHtml(note.artist)}</div>
            <div class="card-preview">${note.content}</div>
        `;
        card.addEventListener('click', () => openModal(note));
        notesGrid.appendChild(card);
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
}