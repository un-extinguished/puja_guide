# The data behind Puja Guide

Everything here is built from `raw/` by [`scripts/build-data.mjs`](../scripts/build-data.mjs):

```bash
npm run build:data
```

| File | What it holds |
| --- | --- |
| `raw/chunk*.jsonl` | The source rows, one pandal per line, kept as transcribed. |
| `pandals.json` | The catalogue the app serves: 353 pandals. |
| `stations.json` | The metro stations the pandals name, with estimated positions. |
| `routes.json` | 20 walking routes, generated from the coordinates. |
| `meta.json` | Counts and the derived-field list, shown on the About page. |
| `crowd.json` | Live queue reports. Created at runtime, expires in 90 minutes. |
| `LICENSE.txt` | ODbL and the full provenance note. |

## The build, step by step

1. **Read** every `raw/chunk*.jsonl` row.
2. **Merge duplicates.** The upstream catalogue carries a second pass of rows
   over ground already covered — *Trinayanee* beside *Trinayani*, *Adarsha
   Samiti* beside *Adarsha Samity*, and so on. Rows merge only when their
   normalised names are equal within 600 m, or are ≥85% similar within 400 m,
   or ≥70% similar within 120 m — and never when the pally numbers differ,
   because *74 Pally* and *75 Pally* are two different pujas on one street.
   This build merged 10 such rows into 353 pandals.
3. **Fill silent neighbourhoods** from the nearest pandal that names one, and
   mark the record `neighbourhoodInferred: true`.
4. **Split areas** from the published zone and latitude.
5. **Solve the stations.** See below.
6. **Generate the routes.** See below.

## Station positions are estimated, and say so

Upstream publishes, per pandal, the walk to that pandal's nearest station — not
the station's coordinates. For each station this build collects every pandal
that names it and searches for the point whose straight-line distances to those
pandals best match the published walks divided by 1.28 (the usual correction
from a straight line to a Kolkata street walk). `fitMeters` in
`stations.json` is the RMS of that fit, so the app can be honest about how good
the estimate is; the median across stations is around 400 m.

## Routes are generated, not curated

A route is: a seed pandal, the seven nearest to it within 2.6 km, and a
nearest-neighbour ordering from the seed. Nothing in this repository asserts
that a puja is famous or worth queueing for — that is not something the
coordinates can support. `walkMeters` per leg is straight-line × 1.28 and is
labelled an estimate in the app; the app can also measure the legs on the
public OSM foot router when the visitor asks.
