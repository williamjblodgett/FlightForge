# Launch checklist

## Product and data

- [ ] Every real listing has a source URL and recent review date
- [ ] Every unclaimed listing displays the required notice
- [ ] Fictional data is visibly labeled on cards, pages, and admin records
- [ ] No copied photos, reviews, maps, or protected descriptions
- [ ] Course operator verification and dispute process staffed
- [ ] Static-demo actions and production actions remain visibly distinguishable

## Security and privacy

- [x] Hard-coded role demo auth disabled in production code
- [ ] Administrator and owner allowlists reviewed
- [ ] Access policy tested with guest, player, owner, and administrator accounts
- [ ] Upload malware scanning enabled
- [x] On-device pose landmarks disclose their measurement limits
- [ ] Global media-retention endpoint and scheduled handler connected to a monitored production cron trigger
- [x] CSP, cookies, security headers, and request rate limits covered by automated checks
- [ ] Operational audit alerts and incident escalation configured
- [ ] Data retention, deletion, export, and incident response approved
- [ ] Attorney review completed for privacy, terms, claims, location, and liability

## Reliability

- [x] Type checking, linting, unit tests, rendered tests, and both local builds green
- [x] GitHub Pages artifact tests green
- [ ] Current GitHub CI, Pages deployment, and CodeQL workflows green
- [ ] D1 and PostgreSQL migrations inspected and tested on clean databases
- [ ] Backups and version rollback rehearsed
- [ ] Error tracking, structured logs, health checks, and on-call alerts configured
- [ ] Mobile, tablet, desktop, keyboard, screen reader, reduced motion, and weak-network checks complete

## Communications

- [ ] Support mailbox monitored
- [ ] Course claim response times published
- [ ] No partnership with PDGA, course directories, operators, or retailers implied
- [ ] Feature availability matches the UI; disabled modules are not marketed as live
