#!/bin/zsh
# Runs one batch of builder sessions in a worktree and reports what each actually did.
#
#   launch.sh <worktree> <briefs-dir> <logs-dir> <slug> [<slug> ...]
#
# Every flag here was paid for. Do not change one without reading why:
#
#   --permission-mode dangerous   "smart" approves file writes but rejects some bash, so a worker dies
#                                 partway through npm run verify and reports nothing useful.
#   (no --sandbox)                --sandbox silently overrides --permission-mode and then rejects writes.
#                                 It prints a warning and produces an empty directory. The two cannot be
#                                 combined; sandboxing is not available for this work.
#   --respect-workspace-trust false
#                                 Print mode cannot show the trust prompt and fails outright in a fresh
#                                 worktree without this.
#
# The exit code of `devin -p` is NOT a success signal: a session can reject a tool call, write nothing, and
# still return 0. The only reliable check is the log, which is what this script does.
set -u

WT=$1; BRIEFS=$2; LOGS=$3; shift 3
STATUS="$LOGS/status.txt"
mkdir -p "$LOGS"
: > "$STATUS"

if [[ ! -d "$WT" ]]; then echo "no worktree at $WT" >&2; exit 1; fi
cd "$WT" || exit 1

for slug in "$@"; do
  if [[ ! -f "$BRIEFS/$slug.md" ]]; then
    echo "NOBRIEF $slug" >> "$STATUS"
    continue
  fi
  (
    devin -p --model "${DEVIN_MODEL:-swe-2-max}" \
      --permission-mode dangerous \
      --respect-workspace-trust false \
      --prompt-file "$BRIEFS/$slug.md" > "$LOGS/$slug.log" 2>&1

    # Order matters: a blocked session can still have created a directory, so check the log first.
    if grep -q "rejected a tool call" "$LOGS/$slug.log"; then
      echo "BLOCKED $slug" >> "$STATUS"
    elif ls registry/*/"$slug"/core.ts >/dev/null 2>&1; then
      echo "BUILT   $slug" >> "$STATUS"
    else
      echo "NOTHING $slug" >> "$STATUS"
    fi
  ) &
done
wait

echo "--- batch done ---"
sort "$STATUS"
grep -qE '^(BLOCKED|NOTHING|NOBRIEF)' "$STATUS" && exit 1
exit 0
