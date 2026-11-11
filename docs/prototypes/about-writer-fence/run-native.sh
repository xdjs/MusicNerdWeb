#!/usr/bin/env bash
# Owned local synthetic PG17 only. Never reads application credentials.
set -euo pipefail
umask 077
[[ "${MN_APPROVED_SYNTHETIC_PG17:-}" == yes ]] || exit 1
[[ -z "${MN_1655_WEB_FENCE_SOCKET:-}" && "$(id -u)" != 0 ]] || exit 1
pg17_bin=${PG17_BIN:?Absolute preinstalled PG17_BIN required}
node24_bin=${NODE24_BIN:?Absolute preinstalled NODE24_BIN required}
[[ "$pg17_bin" == /* && "$node24_bin" == /* ]] || exit 1
for tool in postgres initdb pg_ctl psql createdb; do
  "$pg17_bin/$tool" --version | grep -Eq 'PostgreSQL\) 17([.]|$)' || exit 1
done
[[ "$("$node24_bin" -p 'process.versions.node.split(".")[0]')" == 24 ]] || exit 1
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGPASSWORD PGSERVICE PGSERVICEFILE PGOPTIONS PGSSLMODE PGREQUIRESSL
run_dir=$(mktemp -d /tmp/mn-1655-web-fence.XXXXXXXX)
[[ "$run_dir" =~ ^/tmp/mn-1655-web-fence\.[A-Za-z0-9]+$ ]] || exit 1
owned=no
cleanup() {
  result=$?
  trap - EXIT INT TERM
  if [[ "$owned" == yes && -f "$run_dir/data/postmaster.pid" ]]; then
    "$pg17_bin/pg_ctl" -D "$run_dir/data" -m immediate -w stop || exit 1
  fi
  rm -rf -- "$run_dir"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export PGPASSFILE="$run_dir/no-password-file" PGSYSCONFDIR="$run_dir"
"$pg17_bin/initdb" -D "$run_dir/data" --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8
owned=yes
"$pg17_bin/pg_ctl" -D "$run_dir/data" -l "$run_dir/server.log" -o "-c listen_addresses='' -c unix_socket_directories='$run_dir' -c unix_socket_permissions=0700 -p 55466" -w start
"$pg17_bin/createdb" -h "$run_dir" -p 55466 mn_1655_web_fence
"$pg17_bin/psql" -X --no-password -h "$run_dir" -p 55466 -d mn_1655_web_fence -v ON_ERROR_STOP=1 -c "COMMENT ON DATABASE mn_1655_web_fence IS 'mn-1655-web-fence-synthetic-only'; CREATE ROLE mnweb LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION"
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)
cd "$repo_dir"
MN_1655_WEB_FENCE_SOCKET="$run_dir" "$node24_bin" node_modules/jest/bin/jest.js --runInBand src/server/utils/queries/__tests__/revokeRetention.integration.test.ts
