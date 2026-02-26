import React, { useState, useMemo } from 'react'
import './styles.css'

const initialAuthors = [
  { id: 'a1', name: 'Jim Castillo', gpa: 3.8 },
  { id: 'a2', name: 'Ana Lopez', gpa: 3.5 }
]

const initialPosts = [
  { id: 'p1', title: 'Intro to Physics', subject: 'Physics', authorId: 'a1', likes: 5, dislikes: 1 },
  { id: 'p2', title: 'Kinematics Basics', subject: 'Physics', authorId: 'a1', likes: 3, dislikes: 0 },
  { id: 'p3', title: 'React Hooks Overview', subject: 'Web', authorId: 'a2', likes: 4, dislikes: 2 }
]

function AuthorModal({ author, posts, onClose }) {
  if (!author) return null
  const authored = posts.filter(p => p.authorId === author.id)
  const total = authored.reduce((s, p) => s + p.likes + p.dislikes, 0) || 1
  const effectiveness = Math.round((authored.reduce((s, p) => s + p.likes, 0) / total) * 100)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>{author.name}</h3>
        <p><strong>GPA:</strong> {author.gpa.toFixed(2)}</p>
        <p><strong>Effectiveness:</strong> {effectiveness}%</p>
        <h4>Posted Lessons</h4>
        <ul>
          {authored.map(p => (
            <li key={p.id}>{p.subject} — {p.title} ({p.likes} 👍 {p.dislikes} 👎)</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [authors] = useState(initialAuthors)
  const [posts, setPosts] = useState(initialPosts)
  const [selectedAuthorId, setSelectedAuthorId] = useState(null)

  const authorById = useMemo(() => Object.fromEntries(authors.map(a => [a.id, a])), [authors])

  function toggleVote(postId, kind) {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, likes: kind === 'like' ? p.likes + 1 : p.likes, dislikes: kind === 'dislike' ? p.dislikes + 1 : p.dislikes }
    }))
  }

  function openAuthor(id) {
    setSelectedAuthorId(id)
  }

  function closeAuthor() {
    setSelectedAuthorId(null)
  }

  const selectedAuthor = authors.find(a => a.id === selectedAuthorId) || null

  return (
    <div className="app-root">
      <header className="app-header">Lessons & Posts</header>
      <main className="app-main">
        <section className="posts">
          {posts.map(post => (
            <article key={post.id} className="post">
              <div className="post-title">{post.subject} — {post.title}</div>
              <div className="post-meta">by <button className="author-link" onClick={() => openAuthor(post.authorId)}>{authorById[post.authorId].name}</button></div>
              <div className="post-actions">
                <button className="like-btn" onClick={() => toggleVote(post.id, 'like')}>👍 {post.likes}</button>
                <button className="dislike-btn" onClick={() => toggleVote(post.id, 'dislike')}>👎 {post.dislikes}</button>
              </div>
            </article>
          ))}
        </section>
        <AuthorModal author={selectedAuthor} posts={posts} onClose={closeAuthor} />
      </main>
    </div>
  )
}
