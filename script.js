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

// 色変更処理
document.querySelectorAll('.color-btn').forEach(btn => {
    // マウスを押した時にテキストの選択状態が外れるのを防ぐ
    btn.addEventListener('mousedown', (e) => e.preventDefault());

    btn.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        lyricsEditor.focus();
        document.execCommand('foreColor', false, color);
    });
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