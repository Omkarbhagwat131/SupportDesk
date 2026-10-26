# SupportDesk Monorepo

SupportDesk is an internal customer support and ticket management platform designed to streamline issue intake, triage, SLA tracking, and agent workflows.

---

## Repository Structure

```text
supportdesk/
├── apps/
│   ├── api/          # Node.js + Express + TypeScript + Prisma backend API
│   ├── web/          # React + Vite web dashboard for agents and admins
│   └── mobile/       # Expo React Native mobile application
├── agents/           # AI agent configurations and prompts (Week 7)
├── automation/
│   └── n8n/          # Exported n8n workflow JSON files
├── postman/          # Postman API collections and non-secret environments
├── infra/            # Docker Compose, database setup, and deployment scripts
├── docs/             # PRD, architecture decisions, SOPs, and Prompt Journal
├── .github/
│   └── workflows/    # GitHub Actions CI/CD pipelines
├── .gitignore        # Excluded files, folders, and local secrets
├── .env.example      # Template for environment variables (safe placeholders)
└── README.md         # Project overview and documentation