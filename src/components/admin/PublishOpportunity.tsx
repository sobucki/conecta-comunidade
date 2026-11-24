'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function PublishOpportunity() {
  const { id, data } = useDocumentInfo()
  const modified = useFormModified()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function publish() {
    if (
      !window.confirm(
        'Publicar esta oportunidade para a comunidade? Confira o valor, os prazos e as fotos antes de confirmar.',
      )
    )
      return
    setPending(true)
    try {
      const response = await fetch(`/api/opportunities/${id}/publish`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok)
        setMessage(
          result.errors?.[0]?.message ||
            'Não foi possível publicar. Confira os dados e tente novamente.',
        )
      else {
        setMessage('Oportunidade publicada.')
        router.refresh()
      }
    } catch {
      setMessage('Não foi possível conectar. Tente novamente.')
    } finally {
      setPending(false)
    }
  }
  if (!id) return <p>Salve o rascunho para adicionar fotos e publicar.</p>
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {data?.status === 'DRAFT' && (
        <button
          type="button"
          className="btn btn--style-primary btn--size-medium"
          onClick={publish}
          disabled={pending || modified}
        >
          {pending ? 'Publicando…' : 'Publicar oportunidade'}
        </button>
      )}
      {data?.status !== 'DRAFT' && (
        <a href={`/oportunidades/${id}`} target="_blank" rel="noreferrer">
          Ver página pública
        </a>
      )}
      <a
        href={`/admin/collections/applications?where[opportunity][equals]=${id}`}
      >
        Consultar candidatos
      </a>
      <span role="status">
        {modified ? 'Salve as alterações antes de publicar.' : message}
      </span>
    </div>
  )
}
