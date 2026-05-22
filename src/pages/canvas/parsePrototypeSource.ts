import type { PageApi, PageJump } from './types'

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderInlineMarkdown = (value: string) => {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

const flushParagraph = (paragraph: string[], html: string[]) => {
  if (!paragraph.length) return
  html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
  paragraph.length = 0
}

export const renderMarkdown = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  const paragraph: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  let codeLines: string[] = []

  const closeList = () => {
    if (!listType) return
    html.push(`</${listType}>`)
    listType = null
  }

  const openList = (type: 'ul' | 'ol') => {
    if (listType === type) return
    closeList()
    html.push(`<${type}>`)
    listType = type
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCodeBlock = false
      } else {
        flushParagraph(paragraph, html)
        closeList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph(paragraph, html)
      closeList()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph(paragraph, html)
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const quote = line.match(/^>\s?(.+)$/)
    if (quote) {
      flushParagraph(paragraph, html)
      closeList()
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph(paragraph, html)
      openList('ul')
      html.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`)
      continue
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph(paragraph, html)
      openList('ol')
      html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`)
      continue
    }

    closeList()
    paragraph.push(line.trim())
  }

  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  flushParagraph(paragraph, html)
  closeList()

  return html.join('')
}

export const normalizeJumpTarget = (to: string) => {
  const pagePath = to.match(/^\/pages\/([^?#]+)/)?.[1]
  return pagePath || ''
}

export const parseJumps = (rawContent: string): PageJump[] => {
  const jumpBlock = rawContent.match(/<jumps>([\s\S]*?)<\/jumps>/)?.[1]?.trim()
  if (!jumpBlock) return []

  try {
    const parsed = JSON.parse(jumpBlock) as Array<{ id?: unknown, to?: unknown, reason?: unknown }>
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((jump) => typeof jump.to === 'string')
      .map((jump, index) => ({
        id: typeof jump.id === 'string' && jump.id ? jump.id : `jump-${index + 1}`,
        to: jump.to as string,
        targetId: normalizeJumpTarget(jump.to as string),
        reason: typeof jump.reason === 'string' && jump.reason ? jump.reason : '暂无跳转说明',
      }))
      .filter((jump) => jump.targetId)
  } catch (error) {
    console.warn('Failed to parse <jumps> block:', error)
    return []
  }
}

export const getTagContent = (rawContent: string, tagName: string) => {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return rawContent.match(new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`))?.[1]?.trim() || ''
}

export const parseApis = (rawContent: string): PageApi[] => {
  const apisBlock = getTagContent(rawContent, 'apis')
  if (!apisBlock) return []

  const apiMatches = apisBlock.matchAll(/<api>([\s\S]*?)<\/api>/g)
  return Array.from(apiMatches)
    .map((match, index) => {
      const apiBlock = match[1]
      const id = getTagContent(apiBlock, 'id') || `api-${index + 1}`
      const name = getTagContent(apiBlock, 'name') || id
      const path = getTagContent(apiBlock, 'path')

      return {
        id,
        name,
        path,
        docUrl: '',
      }
    })
    .filter((api) => api.id || api.name)
}
