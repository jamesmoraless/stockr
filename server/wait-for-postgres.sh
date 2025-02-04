#!/bin/sh

set -e

host="$1"
shift

until pg_isready -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "PostgreSQL is up - executing command"
exec "$@"