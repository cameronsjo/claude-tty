#!/bin/bash
exec ttyd --writable --check-origin --max-clients 2 \
  -t fontSize=14 -t disableLeaveAlert=true \
  tmux new-session -A -s main
