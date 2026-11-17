# AI-Assisted Workflow

## Tools Used

- **Cursor** (primary AI coding assistant)
- **Grok / ChatGPT** (requirements clarification and project specification)
- **Docker + Docker Compose**
- **MongoDB Compass**
- **Browser DevTools + Network tab**
- **Postman / Thunder Client**

## Key Steps

1. Clarified requirements with AI and produced a detailed project specification (`PROJECT_SPEC.md`) covering architecture, data models, APIs, logging format, and acceptance criteria.
2. Used Cursor Agent mode to implement the application in vertical slices, guided strictly by the specification.
3. Reviewed and refined every major piece of AI-generated code before accepting it.
4. Integrated Docker, structured logging, seed data, and documentation.

## Approximate Time Spent

Approximately **10 hours** total (specification → implementation → verification → polish).

## How the AI-Produced Results Were Checked

Verification was performed at multiple levels of rigor, balancing speed and thoroughness:

- **Lightweight review**: Every AI-generated change underwent a basic code review before acceptance, focusing on correctness, readability, and alignment with the project specification.

- **Multi-agent review (higher assurance)**: For more complex changes, multiple AI agents were used collaboratively. At least one agent acted as an independent reviewer (simulating an ACT/expert role) and evaluated the same change against the requirements and README.

- **Automated quality gates (most secure path)**: Code scanning tools are part of the design — SonarQube for code smells and maintainability, Fortify for security vulnerabilities, and Sonatype for dependency risk and license compliance. In this repository they appear as the Code Scan stage of the DEV demonstration workflow (`.github/workflows/dev.yml`). That workflow is for showing stage order to an interviewer. It is not a production gate, and it does not run on every push. Release and Promotion are started by hand with `workflow_dispatch`.

- **API contract validation**: After the test stage, API contracts were verified using Postman to confirm request/response structures, status codes, and error handling matched the specification. The same checks are in `server/tests/api.test.ts`.

- **Performance and stability testing**: JMeter is run separately, outside this repository, and not on every push. The 30-minute load plan and the 8-hour soak plan are in `jmeter/` so a manual run can look for memory leaks, resource exhaustion, or degradation under sustained load. GitHub Actions does not start them.

- **Log validation**: Output logs were inspected to confirm they followed the expected structured JSON format and contained sufficient context for effective debugging and observability.

- **Final business verification**: A manual walkthrough of the affected business requirements was performed as a smoke test to ensure the delivered functionality met the original intent.

This layered approach ensured that AI-generated code was not only functional but also secure, maintainable, and production-ready.

**Interviewer note:** the files in `.github/workflows/` are a demonstration of pipeline shape. DEV (`dev.yml`) is the only one that starts on its own, and only when the branch name starts with `dev`. Release (`release.yml`) and Promotion (`promotion.yml`) start only from `workflow_dispatch`. Create the repository secrets and the `IMAGE_NAME` variable listed in the README before those stages can call a real scanner, registry, or environment.

## Improve Repo Maintainability

Use this when continuing the repo with AI, so the next session follows decisions that are already made.

- Keep the Changelog in `README.md` up to date for every meaningful change: behavior, ports, API, pipeline triggers, and secrets. Read that changelog before editing, and add an entry in the same change. That history is how a later AI session follows through instead of repeating or undoing earlier work.
- Treat `FreelanceTrack_PROJECT_SPEC.md` as the feature source and the changelog as the record of what changed after that spec.
- When a port, workflow trigger, or secret name changes, update `README.md`, `SETUP.md`, `.env.example`, and this file together.
- Leave the three demonstration workflows as they are: DEV auto-runs only for branches named `dev*`; Release and Promotion stay on `workflow_dispatch`. Do not add a workflow that runs on every push.
- Keep JMeter outside GitHub Actions. Run `jmeter/load-test.jmx` and `jmeter/soak-test.jmx` by hand, against a disposable environment, when a load or soak result is needed.

## Where to point in this repository

- `.github/workflows/dev.yml` — DEV demonstration: Initialize, Test, Build Code, Code Scan, Build Container, Deploy. Runs on `dev*` pushes and on manual dispatch.
- `.github/workflows/release.yml` — Release demonstration: Initialize, Test, Build Code, Build Container, Deploy. Manual dispatch only.
- `.github/workflows/promotion.yml` — Promotion demonstration: Initialize, Publish Container, Promotion. Manual dispatch only.
- `sonar-project.properties`
- `security/fortify-scan.sh` and `security/nexus-iq.sh`
- `security/README.md`
- `jmeter/load-test.jmx` — 30-minute load profile, run outside the repo, not on every push
- `jmeter/soak-test.jmx` — 8-hour read-only soak, run outside the repo, not on every push
- `jmeter/README.md`
- `server/tests/api.test.ts` and `server/tests/logger.test.ts` — contract and JSON log checks
- `README.md` Changelog — the history an AI session should read and extend
