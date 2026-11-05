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