import { marked } from 'marked'

interface Props { body: string }

export default function MarkdownPreview({ body }: Props) {
  const html = marked(body, { async: false }) as string
  return <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
}
