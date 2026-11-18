import { atom, read, update } from 'claude-code'
import { pixelScene } from './pixel'
import type { Register } from 'claude-code'

const PANE = 'progress-bar'
const TOOL = 'mcp__progress-bar__set_progress'
const ORANGE = '#D97757'

const percent = atom({ plugin: 'progress-bar', key: 'percent' } as const, 0)
const label = atom({ plugin: 'progress-bar', key: 'label' } as const, 'Idle')
const frame = atom({ plugin: 'progress-bar', key: 'frame' } as const, 0)
const from = atom({ plugin: 'progress-bar', key: 'from' } as const, 0)

// Claude Code mascot, four frames: bounce plus shuffling feet.
const FRAMES: string[][] = [
  [' ▐▛███▜▌', '▝▜█████▛▘', '  ▘▘ ▝▝'],
  ['  ▐▛███▜▌', ' ▝▜█████▛▘', '  ▝▝ ▘▘'],
  [' ▐▛███▜▌', '▝▜█████▛▘', '  ▘▘ ▝▝'],
  ['▐▛███▜▌', '▝▜█████▛▘', ' ▝▝ ▘▘'],
]

const PROMPT = `A progress pane is showing the person how close you are to finishing. While working on a multi-step request, call the ${TOOL} tool (percent 0-100, short label) at the start, after each meaningful step, and with 100 when done. Keep percent honest and non-decreasing within a request.`

// Move the bar to `to`: `from` remembers where it was so the drawing can
// sweep the new segments in instead of teleporting.
async function moveTo($: any, to: number) {
  const old = await read($, percent)
  if (to === old) return
  await update($, from, () => old)
  await update($, percent, () => to)
}

export const register: Register = on => {
  let timer: { cancel: () => void } | undefined

  const stop = () => {
    timer?.cancel()
    timer = undefined
  }

  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'set_progress',
      description:
        'Report how close you are to finishing the current request, as a percent from 0 to 100, with a short label of what you are doing. Shown in the progress pane.',
      inputSchema: {
        type: 'object',
        properties: {
          percent: { type: 'number', minimum: 0, maximum: 100 },
          label: { type: 'string' },
        },
        required: ['percent'],
      },
      isDeferred: false,
    })
    await $.command.register({
      name: 'progress',
      description: 'Open (or reopen) the progress bar pane',
    })
    void $.ui.open({ id: PANE, title: 'Progress' })

    return next(e)
  })

  on('command.run', { command: 'progress' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Progress' })

    return { text: 'Progress pane opened.' }
  })

  on('prompt.compose', async ($, e, next) => {
    const out = await next(e)

    return {
      sections: [
        ...out.sections,
        { id: 'progress-bar:instructions', text: PROMPT, scope: 'session' },
      ],
    }
  })

  let isOwnLabel = false
  let lastSetAt = 0

  const LABELS: Record<string, string> = {
    Read: 'READING FILES',
    Grep: 'SEARCHING CODE',
    Glob: 'SEARCHING FILES',
    Edit: 'EDITING CODE',
    Write: 'WRITING FILES',
    Bash: 'RUNNING COMMANDS',
    PowerShell: 'RUNNING COMMANDS',
    Agent: 'ASKING HELPERS',
  }

  on('prompt.submit', async ($, e, next) => {
    isOwnLabel = false
    await update($, from, () => 0)
    await update($, percent, () => 0)
    await update($, label, () => 'Starting')
    stop()
    // Auto-creep toward 90%: slows down as it gets closer, so it never
    // claims to be done before the turn really ends.
    timer = $.clock.every(1500, () => {
      void (async () => {
        const p = await read($, percent)
        if (p >= 90) return
        const target = Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.06)))
        await moveTo($, target)
      })()
    })

    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as { percent?: number; label?: string }
    const p = Math.max(0, Math.min(100, Math.round(Number(input.percent) || 0)))
    isOwnLabel = true
    await moveTo($, Math.max(await read($, percent), p))
    if (input.label) await update($, label, () => String(input.label).slice(0, 60))

    return { result: `Progress ${p}%` }
  })

  // Every other tool call nudges the bar and names what Claude is doing.
  on('tool.call', async ($, e, next) => {
    if (timer && !isOwnLabel) {
      const name = LABELS[e.tool] ?? 'WORKING'
      await update($, label, () => name)
    }
    if (timer) {
      const p = await read($, percent)
      if (p < 90) await moveTo($, Math.min(90, p + 2))
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    stop()
    await moveTo($, 100)
    await update($, label, () => 'Done')

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e) as any
    const { Box, Text } = ui
    const p = await read($, percent)
    const text = await read($, label)
    const f = await read($, frame)
    const was = await read($, from)

    if (ui.Svg) {
      const running = text !== "Idle" && text !== "Done"
      const svg = pixelScene(p, text, running, was)
      return (
        <Box flexDirection="column">
          <ui.Svg width={400} height={515} source={svg} alt={`Claude Code is ${p}% done: ${text}`} isInteractive />
        </Box>
      )
    }

    const width = Math.max(8, Math.min(40, (e.viewport?.columns ?? 30) - 8))
    const filled = Math.round((p / 100) * width)

    return (
      <Box flexDirection="column">
        {(FRAMES[f % FRAMES.length] ?? []).map(line => (
          <Text color={ORANGE}>{line}</Text>
        ))}
        <Text> </Text>
        <Text color={ORANGE}>
          {'█'.repeat(filled)}
          <Text dimColor>{'░'.repeat(width - filled)}</Text> {p}%
        </Text>
        <Text dimColor>{text}</Text>
      </Box>
    )
  })
}
