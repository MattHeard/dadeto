# Industrial heat-pump retrofit readiness toy

## Summary

- Toy name: High-temperature industrial heat-pump retrofit readiness
- Owner: Dadeto
- Last updated: 2026-10-25

The toy helps a small industrial site's operations or energy manager screen a
hypothetical heat-pump retrofit against a user-supplied process heat demand,
temperature, tariffs, efficiencies, and electrical limit. It distinguishes
technical limits from operating economics and shows which assumptions would
need to change before a vendor discussion.

## Problem Statement

Food processors, laundries, and other process-heat users often need a first-pass
electrification comparison before commissioning bespoke engineering work. The
toy makes the arithmetic and missing inputs explicit; it does not establish
that a particular heat pump exists or is suitable for a site.

## Boundary

The first slice tests whether process heat, incumbent fuel, heat-pump
electricity, operating cost, payback, and screening thresholds can be calculated
as a pure deterministic core module with no live services. Any later browser
presenter stays on existing Dadeto static site paths and consumes this core.

## Scope

- In scope: one synthetic food-processing case; explicit input units and
  validation; useful heat balance; incumbent fuel and heat-pump electricity;
  annual operating costs and savings; simple payback when savings are positive;
  separate temperature, electrical-power, and economic status; minimum COP and
  maximum installed-cost thresholds for a chosen payback period.
- Out of scope: detailed thermodynamics, equipment sizing, refrigerant
  selection, process integration, safety certification, procurement advice,
  vendor data, measured COP claims, authoritative carbon accounting, live grid
  APIs, hosted services, and provider billing.

## Actors and Interfaces

- Primary actor(s): a small industrial site's owner/operator or plant engineer.
- Inputs: required process supply temperature (°C), annual useful heat (kWh
  thermal/year), operating hours (hours/year), incumbent fuel price (currency
  per kWh fuel), incumbent efficiency (fraction), electricity price (currency
  per kWh electric), hypothetical heat-pump COP, maximum supported temperature
  (°C), installed cost, annual maintenance, available electrical power (kW),
  and target simple-payback period (years).
- Outputs: incumbent fuel use, heat-pump electricity use, required average
  thermal and electrical power, annual costs and savings, payback or an explicit
  not-applicable state, independent temperature/power/economic statuses, and
  COP/installed-price thresholds.

## Assumptions and Constraints

- All quantities are screening assumptions supplied by the user or marked as
  illustrative in the example.
- Annual useful heat is the same delivered heat in the incumbent and
  heat-pump scenarios; the model does not estimate seasonal COP or part-load
  performance.
- Average power is annual heat divided by operating hours. It is not a peak-load
  or equipment-sizing estimate.
- Simple payback divides user-supplied installed cost by positive annual
  operating savings. It omits financing, replacement, taxes, incentives, and
  discounting.
- Undefined/nonpositive savings never produce a payback year.
- Technical temperature and electrical-power limits are reported separately
  from economic attractiveness.
- The model must not claim that a temperature/COP pair is commercially
  available, technically proven, or safe to install.

## Dependencies

- Internal dependencies: none for the pure calculator; later browser work may
  reuse Dadeto's existing static page and toy registration utilities.
- External dependencies: none. No proprietary engineering dataset, live grid,
  vendor catalogue, or account is required.
