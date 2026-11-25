#!/usr/bin/env python3
"""Recebe a senha SMTP no terminal e grava um env_file raw do Docker Compose."""
from getpass import getpass
from pathlib import Path
import os
import tempfile

root = Path(__file__).resolve().parents[2]
try:
    password = getpass('Senha da caixa acesso@redeconectacomunidade.com.br (entrada oculta): ')
    confirmation = getpass('Repita a mesma senha: ')
    if not password or password != confirmation or any(c in password for c in '\r\n\x00'):
        raise SystemExit('Senhas vazias, diferentes ou inválidas. Nenhum arquivo foi alterado.')
    content = '\n'.join([
        'SMTP_HOST=smtp.hostinger.com',
        'SMTP_PORT=465',
        'SMTP_SECURE=true',
        'SMTP_USER=acesso@redeconectacomunidade.com.br',
        'SMTP_FROM=acesso@redeconectacomunidade.com.br',
        'SMTP_PASSWORD=' + password,
        '',
    ])
    descriptor, temporary = tempfile.mkstemp(prefix='.env.smtp-', dir=root)
    try:
        with os.fdopen(descriptor, 'w') as stream:
            stream.write(content)
        os.chmod(temporary, 0o600)
        os.replace(temporary, root / '.env.smtp')
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink()
    print('Credencial SMTP salva em .env.smtp com permissão 0600, sem exibir a senha.')
    print('Avise que concluiu para validar o SMTP e aplicar a configuração à aplicação.')
except (KeyboardInterrupt, EOFError):
    raise SystemExit('\nOperação interrompida. A configuração anterior foi preservada.')
