'use client'

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Image } from "@tiptap/extension-image"
import { TipTapToolbar } from "./tiptap-toolbar"

interface TipTapEditorProps {
  content: string
  onChange: (richText: string) => void
}

export function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, Image],
    content: content,
    editorProps: {
      attributes: {
        class:
          "prose rounded-md border min-h-[150px] border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    immediatelyRender: false,
  })

  return (
    <div className="flex flex-col justify-stretch gap-2">
      <TipTapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
