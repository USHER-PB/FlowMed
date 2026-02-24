#!/bin/bash
# =============================================================================
# Branch Protection Setup Script
# =============================================================================
# This script configures branch protection rules for the repository.
# Requires: GitHub Pro, Team, or Enterprise plan for private repositories.
#
# Usage:
#   ./scripts/setup-branch-protection.sh
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Repository owner or admin permissions
# =============================================================================

set -euo pipefail

# Configuration
REPO="skyengpro/om"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Please install it first."
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated. Run 'gh auth login' first."
        exit 1
    fi

    log_info "Prerequisites check passed."
}

# Enable branch protection
setup_branch_protection() {
    log_info "Setting up branch protection for '$BRANCH' branch..."

    # Branch protection rules using GitHub API
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/${REPO}/branches/${BRANCH}/protection" \
        -f required_status_checks='{"strict":true,"contexts":["terraform-validate","helm-lint","security-scan"]}' \
        -F enforce_admins=false \
        -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1,"require_last_push_approval":true}' \
        -f restrictions=null \
        -F required_linear_history=true \
        -F allow_force_pushes=false \
        -F allow_deletions=false \
        -F block_creations=false \
        -F required_conversation_resolution=true \
        && log_info "Branch protection enabled successfully!" \
        || log_error "Failed to enable branch protection. Ensure you have a GitHub Pro/Team/Enterprise plan."
}

# Enable signed commits requirement
enable_signed_commits() {
    log_info "Enabling signed commits requirement..."

    gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/${REPO}/branches/${BRANCH}/protection/required_signatures" \
        && log_info "Signed commits requirement enabled!" \
        || log_warn "Could not enable signed commits requirement."
}

# Setup tag protection
setup_tag_protection() {
    log_info "Setting up tag protection rules..."

    # Protect v* tags
    gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/${REPO}/tags/protection" \
        -f pattern='v*' \
        && log_info "Tag protection for 'v*' enabled!" \
        || log_warn "Could not enable tag protection (may already exist)."
}

# Configure repository settings
configure_repo_settings() {
    log_info "Configuring repository settings..."

    gh repo edit "${REPO}" \
        --delete-branch-on-merge=true \
        --enable-discussions=true \
        --enable-projects=true \
        --enable-issues=true \
        && log_info "Repository settings configured!" \
        || log_error "Failed to configure repository settings."
}

# Enable security features
enable_security_features() {
    log_info "Enabling security features..."

    # Enable vulnerability alerts
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO}/vulnerability-alerts" \
        && log_info "Vulnerability alerts enabled!"

    # Enable automated security fixes (Dependabot)
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO}/automated-security-fixes" \
        && log_info "Automated security fixes enabled!" \
        || log_warn "Could not enable automated security fixes."

    # Enable secret scanning (if available)
    gh api \
        --method PATCH \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO}" \
        -f security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}' \
        && log_info "Secret scanning enabled!" \
        || log_warn "Secret scanning may not be available for this plan."
}

# Create rulesets (GitHub Enterprise feature)
setup_rulesets() {
    log_info "Setting up repository rulesets (Enterprise feature)..."

    # This is an Enterprise feature, will fail gracefully on other plans
    gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO}/rulesets" \
        -f name='production-protection' \
        -f target='branch' \
        -f enforcement='active' \
        --input - << 'EOF' 2>/dev/null && log_info "Ruleset created!" || log_warn "Rulesets not available (Enterprise feature)."
{
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main", "refs/heads/release/*"],
      "exclude": []
    }
  },
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "required_linear_history"},
    {"type": "required_signatures"},
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    }
  ]
}
EOF
}

# Print summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "  Branch Protection Setup Complete"
    echo "=============================================="
    echo ""
    echo "Protected branches: $BRANCH"
    echo ""
    echo "Protection rules applied:"
    echo "  - Require pull request reviews (1 approval)"
    echo "  - Require code owner reviews"
    echo "  - Dismiss stale reviews on new commits"
    echo "  - Require last push approval"
    echo "  - Require status checks to pass"
    echo "  - Require linear history (no merge commits)"
    echo "  - Require signed commits"
    echo "  - No force pushes allowed"
    echo "  - No branch deletions allowed"
    echo "  - Require conversation resolution"
    echo ""
    echo "Verify settings at:"
    echo "  https://github.com/${REPO}/settings/branches"
    echo ""
}

# Main
main() {
    echo "=============================================="
    echo "  GitHub Branch Protection Setup"
    echo "  Repository: ${REPO}"
    echo "=============================================="
    echo ""

    check_prerequisites
    configure_repo_settings
    enable_security_features
    setup_branch_protection
    enable_signed_commits
    setup_tag_protection
    setup_rulesets
    print_summary
}

main "$@"
