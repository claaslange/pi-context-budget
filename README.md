# pi-context-budget

A reusable pi package that warns when a session starts getting too close to the model's context limit.

## What it does

- warns when the session crosses:
  - 100k tokens
  - 150k tokens
  - 200k tokens
- uses escalating severity:
  - 100k: awareness
  - 150k: warning
  - 200k: error-style warning
- shows a warning widget below the editor only after a threshold is reached
- keeps pi's built-in footer unchanged
- includes the percentage of the active model context window when pi knows it

## Install

From npm:

```bash
pi install npm:@claaslange/pi-context-budget
```

From git:

```bash
pi install git:github.com/claaslange/pi-context-budget
```

From a local checkout:

```bash
pi install .
```

Project-local install:

```bash
pi install -l npm:@claaslange/pi-context-budget
```

## Development

Run from a local checkout with:

```bash
pi -e ./extensions/context-budget-warning.ts
```

Or install the local package:

```bash
pi install .
```

If pi is already running, reload extensions:

```bash
/reload
```

## Package layout

- `package.json` — pi package manifest
- `extensions/context-budget-warning.ts` — extension entry point
