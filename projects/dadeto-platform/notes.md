# Dadeto Platform

## Outcome

Provide the reusable technical foundation that lets Dadeto turn suitable ideas into production-available software with very little lead time.

## Scope

This includes deployment, data, identity, UI, observability, testing, shared primitives, and the operational workflows needed to build and run Dadeto tools and services.

## Success signal

A small useful idea can move from decision to a credible production surface in roughly five minutes, without repeatedly solving the same infrastructure problems.

## Gaps and observability

It is not yet clear whether Dadeto has failed to achieve this outcome or has achieved it informally without enough evidence. There are two possible gaps:

- **Capability gap:** building and operating a tool still requires too much bespoke work in areas such as deployment, persistence, identity, UI, monitoring, or recovery.
- **Measurement gap:** Dadeto does not consistently record the time and friction between deciding to build an idea and making it available in production.

The platform should measure the outcome itself, not only infrastructure health. For each tool or service, record:

- when the idea was committed to,
- when building started,
- when a first working version existed,
- when it became available in production,
- elapsed lead time,
- manual interventions,
- repeated setup work,
- failures and recovery time,
- whether the resulting tool was actually used.

The primary metric is **idea-to-production lead time**: the elapsed time between committing to build an idea and making it available in production. Supporting metrics should explain delays, including deployment time, setup steps, blocked time, bespoke decisions, failed deployments, and post-launch fixes.

The first observability slice should be an instrumented golden path: take one representative tool from idea to production while recording each step and each source of friction. This will show whether the platform needs more capability, better measurement, or both.

## Relationship to Dadeto

This is the enabling child project. It should be driven by real needs from personal tools, commercial services, public work, and experiments—not by infrastructure work in isolation.
