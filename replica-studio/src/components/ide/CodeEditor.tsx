'use client'

import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <div className="code-editor-shell">
      <div className="editor-title">SCENE CONFIGURATION · JSON</div>
      <Editor
        height="100%"
        defaultLanguage="json"
        theme="vs-dark"
        value={value}
        onChange={(newValue) => onChange?.(newValue ?? '')}
        options={{
          readOnly: onChange == null,
          fontSize: 14,
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  )
}
