export interface TranspileResult {
  readonly outputText: string
  readonly error?: string
}

// Full TypeScript transpilation on node/bun runtimes. The compiler is ~11 MiB and takes tens of
// milliseconds to evaluate, so it is loaded when the first program is transpiled rather than when
// the host process starts.
export const transpile = async (source: string): Promise<TranspileResult> => {
  const { default: ts } = await import("typescript")
  const transpiled = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  })
  const diagnostic = transpiled.diagnostics?.find((item) => item.category === ts.DiagnosticCategory.Error)
  if (diagnostic) {
    return {
      outputText: transpiled.outputText,
      error: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    }
  }
  return { outputText: transpiled.outputText }
}
