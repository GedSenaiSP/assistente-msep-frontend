'use client'

import { type Editor } from "@tiptap/react"
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Image as ImageIcon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "./ui/button"
import { useCallback } from "react"

interface ToolbarProps {
  editor: Editor | null
}

export function TipTapToolbar({ editor }: ToolbarProps) {
  const addImage = useCallback(() => {
    const url = window.prompt("URL da imagem")

    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap gap-1">
      <Toggle size="sm" pressed={editor.isActive("bold")} onPressedChange={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("italic")} onPressedChange={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("heading", { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("heading", { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("bulletList")} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("orderedList")} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      {/* <Button size="sm" variant="ghost" onClick={addImage}>
        <ImageIcon className="h-4 w-4" />
      </Button> */}
      <input
        type="color"
        className="w-8 h-8"
        onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()}
        value={editor.getAttributes("textStyle").color || "#000000"}
      />
    </div>
  )
}