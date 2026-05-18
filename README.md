# shirokuma-plugins (prerelease channel)

This repository is the **prerelease distribution channel** for [shirokuma-flow](https://github.com/ShirokumaLibrary/shirokuma-docs) plugins.

- **alpha / beta** versions are published here (`ShirokumaDevelopment/shirokuma-plugins`).
- **stable** versions live at [`ShirokumaLibrary/shirokuma-plugins`](https://github.com/ShirokumaLibrary/shirokuma-plugins).

## Install (early adopters)

```sh
claude plugin marketplace add ShirokumaDevelopment/shirokuma-plugins
```

For stable releases (recommended for most users):

```sh
claude plugin marketplace add ShirokumaLibrary/shirokuma-plugins
```

## Background

This split tracks ShirokumaDevelopment/shirokuma-docs#2640 — the alpha/beta distribution
channel is separated from the stable channel so that day-to-day users do not accidentally
install prerelease builds.

Full documentation lives in [`shirokuma-flow`](https://github.com/ShirokumaLibrary/shirokuma-docs).