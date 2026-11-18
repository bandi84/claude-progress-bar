declare module 'claude-code' {
  interface PluginState {
    'progress-bar': { percent: number; label: string; frame: number; from: number }
  }
}
