import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import type { Article } from '../types'

export async function exportDocx(article: Article): Promise<void> {
  const bodyParas = article.body
    .split(/\n\n+/)
    .filter(Boolean)
    .map(text => new Paragraph({ children: [new TextRun({ text, size: 24 })] }))

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: article.title || 'Untitled', heading: HeadingLevel.HEADING_1 }),
        ...(article.subtitle ? [new Paragraph({
          children: [new TextRun({ text: article.subtitle, italics: true, size: 24 })],
        })] : []),
        new Paragraph({ text: '' }),
        ...bodyParas,
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(article.title || 'article').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
