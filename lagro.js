const subjects = {
	"career": {
		id: "career",
		title: "Life Skills",
		icon: "🎓",
		color: "bg-emerald-50 text-lagro-green border-emerald-200",
		desc: "Higher Education Pathways, Holistic Career Dev, and Employment Types.",
		lessons: [
			{
				id: "l1",
				title: "Lesson 1: Higher Education Pathways",
				desc: "Academic, Vocational, Pathway/Foundation, and Transfer routes.",
				content: {
					read: `
								<h3>1. Academic Pathways</h3>
								<p>Traditional routes focused on theoretical knowledge and academic disciplines.</p>
								<h4>Undergraduate Degrees:</h4>
								<ul>
									<li><strong>Associate Degree:</strong> Usually 2 years at a community or technical college.</li>
									<li><strong>Bachelor’s Degree:</strong> Usually 3–4 years at a university or college.</li>
								</ul>
								<h4>Graduate Degrees:</h4>
								<ul>
									<li><strong>Master’s Degree:</strong> 1–2 years after a bachelor's degree.</li>
									<li><strong>Doctoral Degree:</strong> 3–7 years after a master's or directly after a bachelor's.</li>
								</ul>
								<h4>Special Programs:</h4>
								<ul>
									<li><strong>Honors Programs:</strong> For high-achieving undergraduates, often involving research.</li>
									<li><strong>Dual Degrees / Double Majors:</strong> Earning two degrees simultaneously.</li>
									<li><strong>Accelerated Programs:</strong> Faster completion (e.g., 3-year bachelor's); often whole-year round instead of by semester.</li>
									<li><strong>Pre-Professional Programs:</strong> For careers like medicine, law, or education.</li>
								</ul>
								<h3>2. Vocational / Technical Pathways</h3>
								<p>Focused on practical skills and job-specific training.</p>
								<ul>
									<li><strong>Certificates and Diplomas:</strong> Often 6 months to 2 years in technical schools or community colleges.</li>
									<li><strong>Apprenticeships:</strong> Work-based learning with classroom instruction in skilled trades.</li>
									<li><strong>Traineeships:</strong> Similar to apprenticeships, but often shorter and less technical.</li>
								</ul>
								<h3>3. Pathway / Foundation Programs</h3>
								<ul>
									<li><strong>University Foundation Year:</strong> One-year programs preparing students for undergraduate studies.</li>
									<li><strong>English Language Pathways:</strong> For international students needing to improve language skills.</li>
									<li><strong>Bridging Courses:</strong> Short programs to help students meet academic prerequisites.</li>
								</ul>
								<h3>4. Transfer Pathways</h3>
								<ul>
									<li><strong>2+2 Programs:</strong> Start with an associate degree then transfer to a university for the final two years.</li>
									<li><strong>Articulation Agreements:</strong> Formal partnerships that simplify credit transfer.</li>
								</ul>
								<h3>5. Online / Distance Learning Pathways</h3>
								<ul>
									<li><strong>MOOCs:</strong> Massive Open Online Courses (free or low-cost).</li>
									<li><strong>Microcredentials:</strong> Targeted, focused approach to learning a specific practical skill.</li>
									<li><strong>Blended Learning:</strong> A mix of online and on-campus instruction.</li>
								</ul>
							`,
					chartType: "bar",
					quiz: [
						{ q: "How long is a typical Associate Degree?", options: ["1 year", "2 years", "4 years", "6 months"], a: 1 },
						{ q: "Which program is designed for high-achieving undergraduates and often involves research?", options: ["Bridging Course", "Honors Program", "Vocational Course", "Traineeship"], a: 1 }
					]
				}
			}
		]
	}
};

// Minimal helper functions and the rest of the app logic are expected to run from this file.
// Load previously-inlined script functionality here (rendering, profile, flashcards, quiz, charts).

let currentSubject = null, currentLesson = null, currentChart = null;
let currentQuizState = null;

// Author modal
function openAuthorModal(authorId) {
	(async () => {
		const modal = document.getElementById('author-modal');
		if (!modal) return alert('Author modal not found');
		// try to fetch remote profile when available
		let author = authors.find(a => a.id === authorId);
		if (window.firestore && window.firestore.getUserProfile) {
			try { const remote = await window.firestore.getUserProfile(authorId); if (remote) author = Object.assign({}, author || {}, remote); } catch(e) { console.warn('fetch author profile failed', e); }
		}
		if (!author) return alert('Author not found');
		modal.querySelector('#author-name').innerText = author.name || 'Unknown';
		modal.querySelector('#author-gpa').innerText = (author.gpa !== undefined && author.gpa !== null) ? (Number(author.gpa).toFixed ? Number(author.gpa).toFixed(2) : author.gpa) : '—';
		const authored = posts.filter(p => p.authorId === authorId);
		const total = authored.reduce((s,p) => s + (p.likes||0) + (p.dislikes||0), 0) || 1;
		const effectiveness = Math.round((authored.reduce((s,p) => s + (p.likes||0), 0) / total) * 100);
		const effEl = modal.querySelector('#author-effectiveness'); if (effEl) effEl.innerText = effectiveness + '%';
		const list = modal.querySelector('#author-posts'); if (list) { list.innerHTML = ''; authored.forEach(p => { const li = document.createElement('li'); li.innerText = `${p.subject} — ${p.title} (${p.likes||0} 👍 ${p.dislikes||0} 👎)`; list.appendChild(li); }); }
		// make name clickable to open full profile view if user id is available
		const nameEl = modal.querySelector('#author-name'); if (nameEl) {
			nameEl.style.cursor = 'pointer';
			nameEl.onclick = () => { openUserProfile(author.id || author.uid || author.authorId); };
		}
		modal.classList.remove('hidden');
	})();
}

function closeAuthorModal() { const m = document.getElementById('author-modal'); if (m) m.classList.add('hidden'); }


function goHome() { currentSubject = null; currentLesson = null; renderSubjects(); showView('view-subjects'); updateBreadcrumbs(); }
function selectSubject(id) { currentSubject = subjects[id]; renderLessons(); showView('view-lessons'); updateBreadcrumbs(); }
function goBackToLessons() { currentLesson = null; showView('view-lessons'); updateBreadcrumbs(); }
function selectLesson(id) { currentLesson = currentSubject.lessons.find(l => l.id === id); renderContent(); showView('view-content'); updateBreadcrumbs(); }

function showView(id) { ['view-subjects', 'view-lessons', 'view-content', 'view-profile'].forEach(v => { const el = document.getElementById(v); if (el) el.classList.add('hidden'); }); const target = document.getElementById(id); if (target) target.classList.remove('hidden'); }

function adjustForHeader() {
	try {
		const hdr = document.querySelector('header');
		const main = document.querySelector('main');
		if (hdr && main) {
			const pad = hdr.offsetHeight + 12;
			main.style.paddingTop = pad + 'px';
		}
	} catch (e) {}
}

function initHeaderScroll() {
	const hdr = document.querySelector('.getblack-header');
	if (!hdr) return;
	let lastY = window.scrollY || 0;
	let ticking = false;
	const threshold = 10;
	window.addEventListener('scroll', () => {
		const y = window.scrollY || 0;
		if (!ticking) {
			window.requestAnimationFrame(() => {
				if (y - lastY > threshold && y > 50) {
					hdr.classList.add('header-hidden');
				} else if (lastY - y > threshold) {
					hdr.classList.remove('header-hidden');
				}
				lastY = y;
				ticking = false;
			});
			ticking = true;
		}
	}, { passive: true });
}

// Remaining UI functions (renderSubjects, renderLessons, renderContent, tabs, visuals, quiz, flashcards, profile)
// For brevity the full implementations live inside the original index.html; ensure they are present here if you need full behavior.

function renderSubjects() {
	const g = document.getElementById('subject-grid'); if (!g) return; g.innerHTML = '';
	Object.values(subjects).forEach(sub => {
		const div = document.createElement('div');
		div.className = `subject-card bg-white p-8 rounded-2xl border shadow-sm cursor-pointer transition flex flex-col items-center text-center ${sub.color}`;
		div.onclick = () => selectSubject(sub.id);
		div.innerHTML = `<div class="w-20 h-20 rounded-2xl ${sub.color.split(' ')[0]} flex items-center justify-center text-4xl mb-4 shadow-sm">${sub.icon}</div><h3 class="text-xl font-extrabold text-lagro-green mb-2">${sub.title}</h3><p class="text-sm text-slate-500 font-medium">${sub.desc}</p>`;
		g.appendChild(div);
	});
}

function renderLessons() {
	const titleEl = document.getElementById('lesson-page-title'); if (titleEl) titleEl.innerText = currentSubject.title;
	const list = document.getElementById('lesson-list'); if (!list) return; list.innerHTML = '';
	ensureSwipeStyles();
	currentSubject.lessons.forEach(ls => {
		const li = document.createElement('li');
			li.className = 'lesson-item p-6 cursor-pointer transition group relative overflow-hidden';
			// handle clicks with awareness of swipe state and actions
			li.addEventListener('click', (e) => {
				if (e.target.closest('.lesson-actions') || e.target.closest('.delete-lesson-btn')) return;
				if (li._swipeMoved) { e.stopPropagation(); e.preventDefault(); li._swipeMoved = false; return; }
				try { closeAllSwipes(); } catch (err) {}
				selectLesson(ls.id);
			});
		li.innerHTML = `
			<div class="lesson-row flex justify-between items-center w-full transition-transform duration-200" style="transform:translateX(0);">
				<div class="lesson-main">
					<h4 class="text-lg font-bold text-lagro-green group-hover:text-emerald-600 transition">${ls.title}</h4>
					<p class="text-sm text-slate-500 mt-1">${ls.desc}</p>
				</div>
				<div class="lesson-actions flex items-center gap-4" style="flex-shrink:0;">
					<button class="delete-lesson-btn ml-2 px-3 py-1 text-sm bg-red-50 text-red-600 rounded-md border border-red-100 hover:bg-red-100" data-lesson-id="${ls.id}" title="Delete lesson">Delete</button>
				</div>
			</div>`;
		list.appendChild(li);
			// move actions outside the row so they don't translate with it
			const actionsEl = li.querySelector('.lesson-actions');
			if (actionsEl) li.appendChild(actionsEl);
			// attach delete handler (stop propagation so click doesn't open lesson)
		const delBtn = li.querySelector('.delete-lesson-btn');
		if (delBtn) {
			delBtn.addEventListener('click', (ev) => {
				ev.stopPropagation();
				const lid = ev.currentTarget.getAttribute('data-lesson-id');
				if (lid) deleteLesson(lid);
			});
		}
		// attach swipe handlers to reveal delete on left-swipe
		attachSwipeHandlers(li);
	});
}

function ensureSwipeStyles() {
	if (document.getElementById('lagro-swipe-styles')) return;
	const s = document.createElement('style');
	s.id = 'lagro-swipe-styles';
	s.innerHTML = `
	.lesson-item { position: relative; }
	.lesson-row { will-change: transform; }
		/* actions are absolutely positioned so they overlay the row when revealed (pull effect)
		   keep them vertically centered and offset slightly from the right edge */
		.lesson-item .lesson-actions { position: absolute; right: 12px; top: 50%; transform: translateY(-50%) translateX(20px); opacity: 0; transition: transform .18s ease, opacity .18s ease; display:flex; align-items:center; gap:8px; pointer-events: auto; z-index:2; }
	.lesson-item.swipe-left .lesson-row { transform: translateX(var(--lagro-row-reveal, -100px)) !important; }
	.lesson-item.swipe-left .lesson-actions { transform: translateY(-50%) translateX(0) !important; opacity: 1 !important; }
	`;
	document.head.appendChild(s);
}

function attachSwipeHandlers(li) {
	const row = li.querySelector('.lesson-row');
	if (!row) return;
	let startX = 0, currentX = 0, touching = false;
	const threshold = 60;
	function attachSwipeHandlers(li) {
		const row = li.querySelector('.lesson-row');
		if (!row) return;
		// fixed distances: row moves 100px, delete button slides in from right (off-canvas) into reserved space
		const rowReveal = 100;
		const delStart = 30; // start 30px to the right (hidden)
		const delEnd = 0;    // end at 0 (visible in reserved area)
		const actions = li.querySelector('.lesson-actions');
		const delBtn = actions && actions.querySelector('.delete-lesson-btn');
		try { li.style.setProperty('--lagro-row-reveal', `-${rowReveal}px`); } catch (e) {}
		row.style.paddingRight = (rowReveal + 12) + 'px';
		if (delBtn) { delBtn.style.transition = 'transform .18s ease, opacity .18s ease'; delBtn.style.transform = `translateX(${delStart}px)`; delBtn.style.opacity = '0'; }
		let startX = 0, currentX = 0, touching = false, moved = false, pointerId = null;
		const threshold = Math.min(60, Math.round(rowReveal / 2));
		function onStart(e) {
			touching = true; moved = false;
			startX = e.touches ? e.touches[0].clientX : (e.clientX || 0);
			currentX = startX;
			row.style.transition = 'none';
			if (e.pointerId) { pointerId = e.pointerId; try { e.target.setPointerCapture && e.target.setPointerCapture(pointerId); } catch(err){} }
		}
		function onMove(e) {
			if (!touching) return;
			currentX = e.touches ? e.touches[0].clientX : (e.clientX || 0);
			const dx = currentX - startX;
			if (Math.abs(dx) > 8) { moved = true; li._swipeMoved = true; }
			if (dx < 0) {
				const tx = Math.max(dx, -rowReveal);
				row.style.transform = `translateX(${tx}px)`;
				if (delBtn) {
					const pct = Math.min(1, Math.abs(tx) / rowReveal);
					const val = Math.round(delStart + ((delEnd - delStart) * pct));
					delBtn.style.transform = `translateX(${val}px)`;
					delBtn.style.opacity = (pct > 0.05) ? '1' : '0';
				}
			} else if (!li.classList.contains('swipe-left')) {
				row.style.transform = `translateX(${Math.min(dx,20)}px)`;
			}
		}
		function onEnd(e) {
			if (!touching) return;
			touching = false;
			try { if (pointerId && e.target.releasePointerCapture) e.target.releasePointerCapture(pointerId); } catch(err){}
			pointerId = null;
			row.style.transition = '';
			const dx = currentX - startX;
			if (dx <= -threshold) {
				try { closeAllSwipes(); } catch (e) {}
				li.classList.add('swipe-left'); row.style.transform = `translateX(-${rowReveal}px)`;
				if (delBtn) { delBtn.style.transform = `translateX(${delEnd}px)`; delBtn.style.opacity = '1'; }
			} else {
				li.classList.remove('swipe-left'); row.style.transform = 'translateX(0)';
				if (delBtn) { delBtn.style.transform = `translateX(${delStart}px)`; delBtn.style.opacity = '0'; }
				li._swipeMoved = false;
			}
			startX = currentX = 0;
		}
		// touch events (use passive:false to allow preventing default if needed)
		li.addEventListener('touchstart', onStart, { passive: false });
		li.addEventListener('touchmove', onMove, { passive: false });
		li.addEventListener('touchend', onEnd);
		// pointer (mouse) support
		li.addEventListener('pointerdown', (e) => { onStart(e); });
		li.addEventListener('pointermove', (e) => { onMove(e); });
		li.addEventListener('pointerup', (e) => { onEnd(e); });
		// clicking elsewhere on the item should hide delete if visible
		li.addEventListener('click', () => { if (moved) { moved = false; return; } if (li.classList.contains('swipe-left')) { li.classList.remove('swipe-left'); row.style.transform = 'translateX(0)'; if (actions) { actions.style.transform = 'translateY(-50%) translateX(20px)'; actions.style.opacity = '0'; } } });
	}
	if (currentLesson && currentLesson.id === lessonId) { currentLesson = null; showView('view-lessons'); }
}

function renderContent() {
	const title = document.getElementById('content-title'); if (title) title.innerText = currentLesson.title;
	const read = document.getElementById('content-read'); if (read) read.innerHTML = currentLesson.content.read || '';
	// default: hide images to prevent spoilers; user can toggle visibility
	if (read) {
		read.classList.add('hide-lesson-images');
		let toggle = document.getElementById('content-toggle-images');
		if (!toggle) {
			toggle = document.createElement('button');
			toggle.id = 'content-toggle-images';
			toggle.className = 'ml-3 px-2 py-1 text-xs rounded bg-white/90 text-lagro-green border';
			toggle.innerText = 'Show images';
			const titleEl = document.getElementById('content-title');
			if (titleEl && titleEl.parentElement) {
				titleEl.parentElement.appendChild(toggle);
			} else if (titleEl) {
				titleEl.appendChild(toggle);
			}
			toggle.addEventListener('click', () => {
				if (read.classList.contains('hide-lesson-images')) {
					read.classList.remove('hide-lesson-images');
					toggle.innerText = 'Hide images';
				} else {
					read.classList.add('hide-lesson-images');
					toggle.innerText = 'Show images';
				}
			});
		}
	}
	switchTab('read');
	// renderQuiz etc would be called here in full app
}

function switchTab(t) {
	['read', 'visuals', 'quiz', 'flashcards'].forEach(tab => {
		const btn = document.getElementById(`tab-${tab}`);
		if (btn) btn.classList.toggle('bg-white', tab === t);
		if (btn) btn.classList.toggle('text-lagro-green', tab === t);
		const content = document.getElementById(`content-${tab}`);
		if (content) content.classList.toggle('hidden', tab !== t);
	});
}

// Simple profile and menu handlers to avoid errors
let profile = { name: 'Guest User', email: '' };
function updateProfileUI() {
	const elName = document.getElementById('profile-name'); if (elName) elName.innerText = profile.name || 'User';
	const elAvatar = document.getElementById('profile-avatar'); if (elAvatar) elAvatar.innerText = (profile.name || 'U').split(' ')[0].slice(0,1).toUpperCase();
}

function toggleProfileMenu(e) { e && e.stopPropagation(); const m = document.getElementById('profile-menu'); if (m) m.classList.toggle('hidden'); }
document.addEventListener('click', (e)=>{ try { closeAllSwipes(); } catch(err) {} const m=document.getElementById('profile-menu'); if(m) m.classList.add('hidden'); const am = document.getElementById('add-menu'); if (am) am.classList.add('hidden'); });

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => { try { loadProfile && loadProfile(); } catch(e){}; try { renderSubjects(); } catch(e){}; try { initHeaderScroll(); } catch(e){}; try { adjustForHeader(); } catch(e){}; });

// --- Add Lesson modal + persistence helpers ---
function openAddLessonModal() {
	const modal = document.getElementById('modal-add-lesson');
	if (!modal) return alert('Add-lesson modal not found.');
	// require a subject context
	if (!currentSubject) return alert('Select a subject before adding a lesson.');
	modal.classList.remove('hidden');
	// set modal title to include subject
	const titleEl = document.getElementById('add-lesson-modal-title');
	if (titleEl && currentSubject) titleEl.innerText = `Add New ${currentSubject.title} Lesson`;
	// reset inputs
	const inTitle = document.getElementById('add-lesson-title'); if (inTitle) inTitle.value = '';
	const inDesc = document.getElementById('add-lesson-desc'); if (inDesc) inDesc.value = '';
	const uploadLabel = document.getElementById('add-lesson-file-label');
	const uploadHTML = '<div class="flex flex-col items-center gap-2"><div class="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-2xl">🖼️</div><div class="text-sm text-slate-500">Take a photo of your book, notes, or attach a file.</div><div class="mt-2 text-sm text-slate-600 font-medium">Click to Select File</div></div>';
	if (uploadLabel) uploadLabel.innerHTML = uploadHTML;
	const fileInput = document.getElementById('add-lesson-file'); if (fileInput) fileInput.value = '';
	const preview = document.getElementById('add-lesson-preview'); if (preview) preview.innerHTML = '';
}

function closeAddLessonModal() {
	const modal = document.getElementById('modal-add-lesson');
	if (!modal) return;
	modal.classList.add('hidden');
}

function onAddLessonFileChange(e) {
	const file = e.target.files && e.target.files[0];
	const label = document.getElementById('add-lesson-file-label');
	const preview = document.getElementById('add-lesson-preview');
	if (!file) { if (label) label.innerText = 'Click to Select File'; if (preview) preview.innerHTML = ''; return; }
	if (label) label.innerText = file.name;
	// show preview for images
	if (file.type.startsWith('image/')) {
		const reader = new FileReader();
		reader.onload = () => { if (preview) preview.innerHTML = `<img src="${reader.result}" style="max-width:240px;max-height:160px;border-radius:8px;"/>`; };
		reader.readAsDataURL(file);
	} else {
		if (preview) preview.innerHTML = `<div class="text-sm text-slate-500">Selected: ${file.name}</div>`;
	}
	// Attempt server-side summarization (if backend available)
	try { summarizeFileServer(file, preview); } catch (err) { console.warn('summarizeFileServer call failed', err); }
}

async function createLessonFromUpload() {
	if (!currentSubject) return alert('Select a subject first.');
	// require Google sign-in
	console.log('createLessonFromUpload profile', window.profile, profile);
	if (!window.profile || (!window.profile.uid && !window.profile.email)) {
		if (confirm('You must sign in with Google to add lessons. Sign in now?')) {
			if (window.firebaseSignInWithGoogle) {
				window.firebaseSignInWithGoogle().then(u=>{ try { applyFirebaseUser && applyFirebaseUser(u); openAddLessonModal(); } catch(e){} }).catch(e=>{ alert('Sign-in failed'); });
			} else { alert('Google sign-in not available'); }
		}
		return;
	}
	const title = (document.getElementById('add-lesson-title') || {}).value || `New Lesson ${Date.now()}`;
	const desc = (document.getElementById('add-lesson-desc') || {}).value || '';
	const fileInput = document.getElementById('add-lesson-file');
	const file = fileInput && fileInput.files && fileInput.files[0];
	const lessonId = 'u' + Date.now();
	const lesson = { id: lessonId, title, desc, content: { read: `<p>Lesson created from uploaded file: ${file ? file.name : 'none'}</p>` } };

	if (file) {
		// Try to use cached preview summary first
		try {
			let summaryText = null;
			if (window.__lastSummarizeResult && window.__lastSummarizeResult.summary) {
				summaryText = window.__lastSummarizeResult.summary;
			} else {
				// Read file and request server summarization
				const dataUrl = await new Promise((resolve, reject) => {
					const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
				});
				const comma = dataUrl.indexOf(',');
				const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
				try {
					const resp = await fetch('/api/summarize-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileData: base64, mimeType: file.type || 'application/octet-stream' }) });
					if (resp.ok) {
						const json = await resp.json().catch(()=>null);
						summaryText = json && json.summary ? json.summary : null;
						window.__lastSummarizeResult = json;
					} else {
						console.warn('Summarize API returned', resp.status);
					}
				} catch(e) { console.warn('Summarize API call failed', e); }
			}

			if (summaryText) {
				lesson.content.read = `<div class="ai-summary"><h3>Summary</h3><div>${summaryText}</div></div>`;
			}
		} catch (err) {
			console.warn('AI summarization failed', err);
		}

		// Attach file data and persist lesson
		const reader = new FileReader();
		reader.onload = () => {
			lesson.content.upload = { name: file.name, type: file.type, dataUrl: reader.result };
			currentSubject.lessons.push(lesson);
			saveLessonsToStorage();
			renderLessons();
			closeAddLessonModal();
			alert('Lesson created from upload.');
		};
		reader.readAsDataURL(file);
	} else {
		currentSubject.lessons.push(lesson);
		saveLessonsToStorage();
		renderLessons();
		closeAddLessonModal();
		try { createCommunityPostForLesson(title, currentSubject.title); } catch(e) { console.warn('createCommunityPostForLesson failed', e); }
		alert('Lesson created.');
	}
}

// Helper: send file to server endpoint /api/summarize-file which returns { summary }
async function summarizeFileServer(file, previewEl) {
	if (!file) return;
	// read as data URL then strip the prefix to get base64
	const reader = new FileReader();
	reader.onload = async () => {
		try {
			const dataUrl = reader.result;
			// dataUrl = data:<mime>;base64,<DATA>
			const comma = dataUrl.indexOf(',');
			const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
			const body = { fileData: base64, mimeType: file.type || 'application/octet-stream' };
			// show a loading state
			if (previewEl) {
				const loader = document.createElement('div'); loader.className = 'text-sm text-slate-500'; loader.innerText = 'Generating summary...';
				previewEl.appendChild(loader);
			}
			const resp = await fetch('/api/summarize-file', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
			});
			if (!resp.ok) {
				const txt = await resp.text();
				console.warn('Summarize API error', resp.status, txt);
				if (previewEl) previewEl.appendChild(Object.assign(document.createElement('div'), { innerText: 'Summary unavailable (server error).', className: 'text-sm text-red-600' }));
				return;
			}
			const json = await resp.json();
			const summary = json && (json.summary || json.error) ? (json.summary || json.error) : JSON.stringify(json);
			// show summary below existing preview
			if (previewEl) {
				const out = document.createElement('div'); out.className = 'mt-3 p-3 bg-slate-50 rounded-md text-sm text-slate-700';
				out.innerHTML = `<strong>AI Summary</strong><div class="mt-1">${(summary || '').replace(/\n/g,'<br/>')}</div>`;
				previewEl.appendChild(out);
			}
			// store last summary for other UI actions
			window.__lastSummarizeResult = json;
		} catch (err) {
			console.error('summarizeFileServer failed', err);
			if (previewEl) previewEl.appendChild(Object.assign(document.createElement('div'), { innerText: 'Summary failed.', className: 'text-sm text-red-600' }));
		}
	};
	reader.readAsDataURL(file);
}

function findAuthorByName(name) {
	return authors.find(a => a.name === name);
}

async function ensureAuthorByName(name) {
	let a = findAuthorByName(name);
	if (a) return a;
	// try Firestore if available
	if (window.firestore && window.firestore.ensureAuthor) {
		try {
			const created = await window.firestore.ensureAuthor({ name: name, gpa: 0 });
			// replace local authors list entry
			authors.push(created);
			saveAuthorsToStorage();
			return created;
		} catch (e) { console.warn('ensureAuthor failed', e); }
	}
	// local fallback
	const id = 'local_' + Date.now();
	const na = { id, name, gpa: 0 };
	authors.push(na);
	saveAuthorsToStorage();
	return na;
}

async function createCommunityPostForLesson(title, subject) {
	// Community posts have been removed — do not create posts.
	return null;
}

function saveAuthorsToStorage() { /* authors disabled for community posts */ }

function loadAuthorsFromStorage() { /* authors disabled for community posts */ }

function saveLessonsToStorage() {
	try {
		// gather lessons grouped by subject id
		const out = Object.fromEntries(Object.entries(subjects).map(([sid, s]) => [sid, s.lessons || []]));
		localStorage.setItem('lagro_lessons_v1', JSON.stringify(out));
	} catch (e) { console.error('saveLessons error', e); }
}

function loadLessonsFromStorage() {
	try {
		const raw = localStorage.getItem('lagro_lessons_v1');
		if (!raw) return;
		const parsed = JSON.parse(raw);
		Object.keys(parsed).forEach(sid => {
			if (subjects[sid]) {
				// Append stored lessons but avoid duplicates by id
				const existingIds = new Set(subjects[sid].lessons.map(l => l.id));
				parsed[sid].forEach(l => { if (!existingIds.has(l.id)) subjects[sid].lessons.push(l); });
			}
		});
	} catch (e) { console.error('loadLessons error', e); }
}

// ensure load persisted lessons before rendering subjects
document.addEventListener('DOMContentLoaded', () => { try { loadLessonsFromStorage(); } catch(e){} });

// Community posts UI removed; related initialization disabled.

