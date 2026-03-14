#!/usr/bin/env bash
set -euo pipefail

# One-time provisioning for a DigitalOcean droplet (Ubuntu/Debian)
# to run the ID mapping agent at scale.

echo "=== ID Mapping Agent — Droplet Setup ==="
echo ""

# Node.js 20 via nodesource
if command -v node &>/dev/null && [[ "$(node -v)" == v20.* ]]; then
  echo "✓ Node.js $(node -v) already installed"
else
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "✓ Node.js $(node -v) installed"
fi

# envsubst (from gettext-base)
if command -v envsubst &>/dev/null; then
  echo "✓ envsubst already installed"
else
  echo "Installing gettext-base (for envsubst)..."
  apt-get install -y gettext-base
  echo "✓ envsubst installed"
fi

# Claude Code CLI
if command -v claude &>/dev/null; then
  echo "✓ Claude Code CLI already installed"
else
  echo "Installing Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code
  echo "✓ Claude Code CLI installed"
fi

# Log directory
LOG_DIR="/var/log/id-mapping"
mkdir -p "$LOG_DIR"
echo "✓ Log directory: $LOG_DIR"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo ""
echo "  1. Authenticate Claude Code:"
echo "     claude login"
echo ""
echo "  2. Set required env vars (add to ~/.bashrc or ~/.profile):"
echo "     export MCP_API_KEY=\"your-key-here\""
echo "     export MCP_URL=\"https://musicnerd.xyz/api/mcp\""
echo ""
echo "  3. Clone the repo and start a run:"
echo "     git clone <repo-url> && cd MusicNerdWeb"
echo "     tmux new -s id-mapping"
echo "     ./agents/id-mapping/run-full-catalog.sh"
echo "     # Ctrl-b d to detach"
