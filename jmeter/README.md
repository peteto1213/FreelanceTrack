# JMeter plans

These plans are run separately, outside this repository. GitHub Actions does not run them, and they are not part of every push. Use them by hand against a disposable environment when you want a load or soak result.

Both plans call the API directly on port 5050. They use the JWT returned by `POST /api/auth/login` as a bearer token. Start the stack first (`docker compose up --build`) and seed it if you want the reads to return data.

The load plan **creates sessions** from the first company and service type returned by `GET /api/companies`. Seed the database first, or that step fails. Run it against a database you can throw away. The soak plan only logs in, lists sessions, and reads the dashboard.

Defaults assume `demo` / `demo1234`. Override them when `.env` uses different credentials.

## 30-minute load

5 threads, 30 second ramp, 30 minute duration (`duration=1800`), 5 second pause. Each loop logs in, lists sessions, reads the dashboard, and creates one session.

```bash
mkdir -p jmeter/results
jmeter -n -t jmeter/load-test.jmx -l jmeter/results/load.jtl -e -o jmeter/results/load-report \
  -Jhost=localhost -Jport=5050 -Jusername=demo -Jpassword=demo1234
```

## 8-hour soak

5 threads, 60 second ramp, 8 hour duration (`duration=28800`), 2 second pause. Read-only.

```bash
mkdir -p jmeter/results
jmeter -n -t jmeter/soak-test.jmx -l jmeter/results/soak.jtl -e -o jmeter/results/soak-report \
  -Jhost=localhost -Jport=5050 -Jusername=demo -Jpassword=demo1234
```

Result trees and HTML reports under `jmeter/results/` are gitignored. Open the generated `index.html` for error rate, latency, and throughput. For a soak, also watch the API container memory and `server/logs/freelancetrack.log` for a growing error rate or a stalled `durationMs`.

JMeter 5.6 or newer is required (`JSON PostProcessor` and Groovy are included in that distribution).
