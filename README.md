# progress-bar

A Claude Code mod that adds a **Progress** side pane: a pixel-art Claude Code mascot, a big "CLAUDE CODE" brick title, and a 20-segment 0-100% bar that shows how close Claude is to finishing the current request.

- **While Claude works:** the bar creeps toward 90% on its own and nudges forward with every tool call. The label shows what Claude is doing (reading files, editing code, running commands). The mascot wears a visor, jumps, and shoots flames from its feet.
- **When the turn ends:** the bar sweeps to 100% and the mascot celebrates with confetti.
- **Claude can report its own progress** through the `set_progress` tool (percent 0-100 plus a short label), and the bar jumps to that value.
- Closed the pane? Type `/progress` to reopen it.
- Values live only for the session. Nothing is stored or sent anywhere.

The pixel-art drawing is used on the desktop app; a plain text version is used where the pane is drawn in a terminal.

## Install

At the prompt of a terminal session:

```
/plugin install progress-bar --marketplace bandi84/claude-progress-bar
```

From a shell:

```
claude plugin install progress-bar --marketplace bandi84/claude-progress-bar
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `bandi84/claude-progress-bar`, then **Add plugin**.

Answer `y` to add the marketplace, then pick a scope.

## License

MIT
