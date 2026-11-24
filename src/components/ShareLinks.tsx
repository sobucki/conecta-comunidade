'use client'
import { useState } from 'react'

export function ShareLinks({
  path,
  title,
  origin,
}: {
  path: string
  title: string
  origin: string
}) {
  const [message, setMessage] = useState('')
  const url = new URL(path, origin).toString()
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copiado!')
    } catch {
      setMessage(`Copie este link: ${url}`)
    }
  }
  return (
    <div className="share-links">
      <button className="button button-secondary" type="button" onClick={copy}>
        Copiar link
      </button>
      <a
        className="button button-whatsapp"
        href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Compartilhar no WhatsApp
      </a>
      <span role="status" className="share-status">
        {message}
      </span>
    </div>
  )
}
