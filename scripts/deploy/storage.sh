#!/bin/sh
# Operador Linux com acesso ao Docker. Não instala Node no host.
set -eu
umask 077
root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
action=${1:?Use backup ou restore CAMINHO}
envfile=${DEPLOY_ENV_FILE:-$root/.env.production}
case "$envfile" in /*) ;; *) echo 'DEPLOY_ENV_FILE deve ser absoluto.' >&2; exit 1 ;; esac
case "$action" in
  backup)
    destination=${BACKUP_DIR:?Defina BACKUP_DIR absoluto fora da instalação}
    ;;
  restore)
    source=${2:?Informe diretório absoluto do backup}
    case "$source" in /*) ;; *) echo 'Informe backup absoluto.' >&2; exit 1 ;; esac
    destination=$(dirname -- "$source")
    ;;
  *) echo 'Use backup ou restore CAMINHO.' >&2; exit 1 ;;
esac
case "$destination" in /*) ;; *) echo 'BACKUP_DIR deve ser absoluto.' >&2; exit 1 ;; esac
mkdir -p -- "$destination"
# Mesmos caminhos dentro e fora do container: Compose resolve bind mounts no host.
exec docker run --rm \
  --user "$(id -u):$(id -g)" --group-add "$(stat -c '%g' /var/run/docker.sock)" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$root:$root" -v "$envfile:$envfile:ro" -v "$destination:$destination" \
  -w "$root" -e "DEPLOY_ENV_FILE=$envfile" \
  -e "DEPLOY_PROJECT=${DEPLOY_PROJECT:-conecta-pilot}" -e "BACKUP_DIR=$destination" \
  "${OPS_IMAGE:-conecta-operations:m6}" "$root/scripts/deploy/storage.mjs" "$@"
