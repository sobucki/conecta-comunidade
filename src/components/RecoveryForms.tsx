'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = new FormData(event.currentTarget).get('email')
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setMessage(
        response.ok
          ? 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.'
          : 'Não foi possível enviar o pedido. Tente novamente.',
      )
    } catch {
      setMessage(
        'Não foi possível conectar. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor="email">E-mail da sua conta</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <button disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar instruções'}
      </button>
      <p role="status">{message}</p>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password'))
    if (password !== form.get('confirmation')) {
      setMessage('As senhas precisam ser iguais.')
      return
    }
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (response.ok) {
        setComplete(true)
        window.history.replaceState(null, '', '/redefinir-senha')
      } else
        setMessage(
          'O link é inválido ou expirou. Solicite novas instruções de recuperação.',
        )
    } catch {
      setMessage(
        'Não foi possível conectar. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setPending(false)
    }
  }
  if (complete)
    return (
      <p role="status">
        Sua senha foi atualizada. <Link href="/">Voltar ao início</Link>
      </p>
    )
  if (!token)
    return (
      <p>
        Solicite um novo link em{' '}
        <Link href="/recuperar-acesso">recuperar acesso</Link>.
      </p>
    )
  return (
    <form onSubmit={submit}>
      <label htmlFor="password">Nova senha</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
      />
      <label htmlFor="confirmation">Confirme a nova senha</label>
      <input
        id="confirmation"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
      />
      <button disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      <p role="status">{message}</p>
    </form>
  )
}
