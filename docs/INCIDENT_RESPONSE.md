# Incident Response — Personal Data

Short version: what to do on a PII leak/incident. Applies once the system holds real
end-user data. See also `DATA_POLICY.md`.

## Regulator notification deadlines (critical)

Once an unlawful or accidental disclosure (leak) of PII is established, the data
controller must notify the relevant data protection authority:

- **within 72 hours** of becoming aware — initial notification of the incident (the
  GDPR-style baseline; check the applicable regime for the exact window);
- **as a follow-up** — the results of the internal investigation and any additional
  findings, once available.

The deadline is tight — that's why roles and steps are fixed in advance below.

## Roles

- **Data protection owner** (on the customer's side) — makes decisions, files the
  notification with the regulator.
- **On-call engineer** (dev-a/dev-b) — technical containment and evidence gathering.
- Contacts and backups — to be filled in: `__________`.

## Steps on incident

1. **Record the time of discovery** (the notification clock starts here).
2. **Contain:** isolate the affected service/access, revoke compromised keys (the
   secrets manager), take the affected node out of service if necessary.
3. **Assess:** which data, whose, how much, root cause (from access/audit logs inside
   the approved environment).
4. **Notify the regulator** within 72 hours (initial), with a follow-up once the
   investigation concludes. Notify affected individuals if required.
5. **Remediate** the root cause; rotate every potentially affected secret.
6. **Document** the incident: timeline, cause, remediation, lessons learned — in the
   incident register.

## Prevention (ongoing)

- Production access audit logging is on; logs stay inside the approved environment and
  **never contain PII**.
- Secrets live in the secrets manager; developers have no direct access to production
  values.
- Secret scanning and Push Protection block committing keys (see the GATE in
  `RUNBOOK.md`).
- Regular rotation of deploy and access keys.
