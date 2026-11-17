# Security scans

SonarQube, Fortify, and Sonatype Nexus IQ are the Code Scan stage of the DEV demonstration workflow, `.github/workflows/dev.yml`. That workflow is for showing stage order. It is not a production gate, and it does not run on every branch. See the README section "GitHub Actions are a demonstration".

| Check | Where it lives | What a real run needs |
| --- | --- | --- |
| API tests and typecheck | DEV and Release, Test stage | Node 20 on the runner |
| Production compile | DEV and Release, Build Code stage | Node 20 on the runner |
| SonarQube | `sonar-project.properties`, DEV Code Scan | Secrets `SONAR_TOKEN` and `SONAR_HOST_URL`, plus `sonar-scanner` on the runner |
| Fortify SAST | `security/fortify-scan.sh` | Secrets `FORTIFY_CLIENT_TOKEN` and `FORTIFY_URL`, plus `sourceanalyzer` or `scancentral` |
| Sonatype Nexus IQ | `security/nexus-iq.sh` | Secrets `NEXUS_IQ_URL` and `NEXUS_IQ_AUTH` (`user:password` or a user token), plus `nexus-iq-cli.jar` |

If those secrets or tools are missing, the Code Scan stage prints that fact and continues, so the demonstration pipeline can still be shown. Create the secrets listed in the README when you want the stage to call a real scanner.

`npm audit` on a fresh install can still report issues in transitive packages. Nexus IQ is the policy check for that class of finding. A local audit printout is not a substitute for the IQ evaluation.
