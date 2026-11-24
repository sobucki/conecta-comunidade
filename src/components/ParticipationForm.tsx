'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { requestJSON } from './AccountForms'

export function ParticipationForm({
  opportunityID,
  conditionsToken,
  application,
}: {
  opportunityID: number
  conditionsToken: string
  application?: {
    id: number
    revision: number
    status: string
    availability: string
    experience?: string | null
  }
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const action = application
    ? application.status === 'WITHDRAWN'
      ? 'resubmit'
      : 'edit'
    : 'submit'
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await change(action, {
      availability: form.get('availability'),
      experience: form.get('experience'),
      accepted: form.get('accepted') === 'on',
    })
  }
  async function change(operation: string, values: Record<string, unknown>) {
    if (
      operation === 'withdraw' &&
      !window.confirm(
        'Retirar sua candidatura? Você poderá reenviá-la enquanto as inscrições estiverem abertas.',
      )
    )
      return
    setPending(true)
    setMessage('')
    try {
      const url =
        operation === 'submit'
          ? `/api/opportunities/${opportunityID}/apply`
          : `/api/applications/${application!.id}/${operation}`
      const result = await requestJSON(url, {
        ...values,
        conditionsToken,
        expectedRevision: application?.revision,
      })
      router.push(`/minhas-candidaturas/${result.doc.id}`)
      router.refresh()
      setMessage(
        operation === 'withdraw'
          ? 'Candidatura retirada.'
          : operation === 'edit'
            ? 'Candidatura atualizada.'
            : 'Candidatura enviada. Acompanhe o resultado por aqui.',
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível conectar. Tente novamente.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <form onSubmit={send}>
        <label htmlFor="availability">Sua disponibilidade</label>
        <textarea
          id="availability"
          name="availability"
          rows={4}
          maxLength={3000}
          required
          defaultValue={application?.availability || ''}
          placeholder="Informe os dias e horários em que pode realizar o serviço no período previsto."
        />
        <label htmlFor="experience">
          Apresentação e experiência relevante (opcional)
        </label>
        <textarea
          id="experience"
          name="experience"
          rows={4}
          maxLength={3000}
          defaultValue={application?.experience || ''}
        />
        <label className="check-label">
          <input name="accepted" type="checkbox" required />
          <span>
            Concordo com o valor total e todas as condições publicadas nesta
            oportunidade, incluindo materiais, ferramentas e prazos.
          </span>
        </label>
        <button disabled={pending}>
          {pending
            ? 'Aguarde…'
            : action === 'edit'
              ? 'Salvar candidatura'
              : action === 'resubmit'
                ? 'Reenviar candidatura'
                : 'Enviar candidatura'}
        </button>
        <p role="status">{message}</p>
      </form>
      {application?.status === 'SUBMITTED' && (
        <button
          className="button button-secondary withdraw-button"
          type="button"
          disabled={pending}
          onClick={() => change('withdraw', {})}
        >
          Retirar candidatura
        </button>
      )}
    </>
  )
}
