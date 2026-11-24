'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { communityLinks } from '@/accounts/registration-options'
import type { User } from '@/payload-types'

export async function requestJSON(url: string, body: unknown, method = 'POST') {
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      'Não foi possível conectar. Verifique sua conexão e tente novamente.',
    )
  }
  const result = await response.json().catch(() => {
    throw new Error('Não foi possível concluir o pedido. Tente novamente.')
  })
  if (!response.ok) {
    const validation = result.errors?.[0]?.data?.errors
      ?.map((error: { message: string }) => error.message)
      .join(' ')
    throw new Error(
      validation ||
        result.errors?.[0]?.message ||
        'Não foi possível salvar. Confira os dados e tente novamente.',
    )
  }
  return result
}

function CommunityField({ value }: { value?: string | null }) {
  return (
    <>
      <label htmlFor="communityLink">Vínculo com a comunidade</label>
      <select
        id="communityLink"
        name="communityLink"
        required
        defaultValue={value || ''}
      >
        <option value="" disabled>
          Selecione seu vínculo
        </option>
        {communityLinks.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <p className="field-help">
        Vínculo autodeclarado. Não informe nomes de alunos ou documentos.
      </p>
    </>
  )
}

export function AccessForm({
  register = false,
  returnPath,
}: {
  register?: boolean
  returnPath: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim().toLowerCase()
    const password = String(form.get('password'))
    if (register && password !== form.get('confirmation')) {
      setMessage('As senhas precisam ser iguais.')
      return
    }
    setPending(true)
    setMessage('')
    try {
      if (register)
        await requestJSON('/api/users/register', {
          name: form.get('name'),
          email,
          password,
          phone: form.get('phone'),
          communityLink: form.get('communityLink'),
          adultConfirmed: form.get('adultConfirmed') === 'on',
          termsAccepted: form.get('termsAccepted') === 'on',
        })
      try {
        await requestJSON('/api/users/login', { email, password })
      } catch {
        throw new Error(
          register
            ? 'Conta criada. Entre com seu e-mail e senha para continuar.'
            : 'Não foi possível entrar. Confira e-mail e senha; se necessário, recupere o acesso ou procure a administração.',
        )
      }
      // Payload mantém a sessão em cookie HttpOnly; nenhum token vai para armazenamento local.
      router.push(returnPath)
      router.refresh()
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
  const next = encodeURIComponent(returnPath)
  return (
    <>
      <form onSubmit={submit}>
        {register && (
          <>
            <label htmlFor="name">Nome completo</label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={120}
              required
            />
          </>
        )}
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          minLength={register ? 12 : undefined}
          required
        />
        {register && (
          <>
            <p className="field-help">
              Use pelo menos 12 caracteres. Guarde sua senha para acompanhar o
              resultado.
            </p>
            <label htmlFor="confirmation">Confirme a senha</label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <label htmlFor="phone">Telefone de contato</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              required
            />
            <CommunityField />
            <label className="check-label">
              <input name="adultConfirmed" type="checkbox" required />
              <span>Confirmo que tenho 18 anos ou mais.</span>
            </label>
            <label className="check-label">
              <input name="termsAccepted" type="checkbox" required />
              <span>
                Aceito os{' '}
                <Link href="/termos" target="_blank">
                  termos de participação
                </Link>{' '}
                e declaro ciência do{' '}
                <Link href="/privacidade" target="_blank">
                  aviso de privacidade
                </Link>
                .
              </span>
            </label>
          </>
        )}
        <button disabled={pending}>
          {pending
            ? 'Aguarde…'
            : register
              ? 'Criar conta e continuar'
              : 'Entrar e continuar'}
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <p>
        {register ? (
          <>
            Já tem conta? <Link href={`/entrar?next=${next}`}>Entrar</Link>
          </>
        ) : (
          <>
            Primeira vez aqui?{' '}
            <Link href={`/cadastro?next=${next}`}>Criar conta</Link>
          </>
        )}
      </p>
      {!register && (
        <p>
          <Link href="/recuperar-acesso">Esqueci minha senha</Link>
        </p>
      )}
    </>
  )
}

export function ProfileForm({
  user,
  categories,
}: {
  user: Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'phone'
    | 'communityLink'
    | 'skills'
    | 'professionalSummary'
  >
  categories: { id: number; name: string }[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setMessage('')
    try {
      await requestJSON(
        `/api/users/${user.id}`,
        {
          name: String(form.get('name')).trim(),
          phone: String(form.get('phone')).trim(),
          communityLink: form.get('communityLink'),
          skills: form.getAll('skills').map(Number),
          professionalSummary: form.get('professionalSummary'),
        },
        'PATCH',
      )
      setMessage(
        'Perfil atualizado. As candidaturas anteriores guardam os dados informados no envio ou na última edição.',
      )
      router.refresh()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível conectar.',
      )
    } finally {
      setPending(false)
    }
  }
  const skills = (user.skills || []).map((skill) =>
    typeof skill === 'object' ? skill.id : skill,
  )
  return (
    <form onSubmit={save}>
      <p>
        E-mail de acesso: <strong>{user.email}</strong>
      </p>
      <label htmlFor="name">Nome completo</label>
      <input
        id="name"
        name="name"
        defaultValue={user.name}
        autoComplete="name"
        maxLength={120}
        required
      />
      <label htmlFor="phone">Telefone de contato</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        defaultValue={user.phone || ''}
        autoComplete="tel"
        maxLength={40}
        required
      />
      <CommunityField value={user.communityLink} />
      <fieldset>
        <legend>Habilidades (opcional)</legend>
        {categories.map((category) => (
          <label className="check-label" key={category.id}>
            <input
              type="checkbox"
              name="skills"
              value={category.id}
              defaultChecked={skills.includes(category.id)}
            />
            <span>{category.name}</span>
          </label>
        ))}
      </fieldset>
      <label htmlFor="professionalSummary">
        Apresentação profissional (opcional)
      </label>
      <textarea
        id="professionalSummary"
        name="professionalSummary"
        maxLength={3000}
        rows={5}
        defaultValue={user.professionalSummary || ''}
      />
      <button disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar perfil'}
      </button>
      <p role="status">{message}</p>
    </form>
  )
}

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <button
        className="text-button"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          try {
            await requestJSON('/api/users/logout', {})
            router.push('/entrar')
            router.refresh()
          } catch {
            setError('Não foi possível sair. Tente novamente.')
          } finally {
            setPending(false)
          }
        }}
      >
        Sair da conta
      </button>
      <span role="status">{error}</span>
    </>
  )
}
