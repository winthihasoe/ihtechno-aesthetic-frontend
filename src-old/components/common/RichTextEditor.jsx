import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Box, Button, Stack, Typography } from "@mui/material";

export function sanitizeRichHtml(rawHtml) {
  if (typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
}

export function hasMeaningfulRichHtml(html) {
  const text = sanitizeRichHtml(html).replace(/<[^>]+>/g, "").trim();
  return text.length > 0;
}

export default function RichTextEditor({
  label,
  value = "",
  onChange,
  disabled = false,
  readOnly = false,
  helperText,
  error = false,
  minHeight = 180,
}) {
  const editable = !disabled && !readOnly;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: sanitizeRichHtml(value || ""),
    editable,
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = sanitizeRichHtml(value || "");
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, false);
    }
    editor.setEditable(editable);
  }, [editor, value, editable]);

  if (!editor) return null;

  return (
    <Box sx={{ width: "100%" }}>
      {label ? (
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
          {label}
        </Typography>
      ) : null}
      {editable ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Bold
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullet list
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            Paragraph
          </Button>
        </Stack>
      ) : null}
      <Box
        sx={{
          border: 1,
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1.5,
          px: 1.25,
          py: 1.25,
          minHeight,
          fontSize: 14,
          lineHeight: 1.7,
          bgcolor: readOnly || disabled ? "action.hover" : "background.paper",
          "& p": { my: 0.75 },
          "& ul": { my: 0.75, pl: 3 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
      {helperText ? (
        <Typography
          variant="caption"
          color={error ? "error" : "text.secondary"}
          sx={{ display: "block", mt: 0.5 }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
