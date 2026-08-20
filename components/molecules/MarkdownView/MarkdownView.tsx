'use client'

import React from 'react'

interface MarkdownViewProps {
  content: string
  className?: string
}

/**
 * Helper to render inline formatting like **bold**, *italic*, `code`
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex to match bold (**text**), italic (*text* or _text_), or inline code (`text`)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g
  const parts = text.split(regex)

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length > 2)
    ) {
      return (
        <em key={idx} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#21263a] text-emerald-400 font-mono text-[11px] border border-[#2d3348]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  if (!content) return null

  // Split lines
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let currentListItems: React.ReactNode[] = []
  let inQuoteBlock = false
  let quoteLines: string[] = []

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${keyPrefix}`} className="space-y-2 my-2.5 pl-1">
          {currentListItems}
        </ul>
      )
      currentListItems = []
    }
  }

  const flushQuote = (keyPrefix: number) => {
    if (quoteLines.length > 0) {
      const quoteText = quoteLines.join(' ')
      elements.push(
        <blockquote
          key={`quote-${keyPrefix}`}
          className="my-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-[#21263a]/60 border-l-4 border-emerald-400 text-xs sm:text-sm text-emerald-200 italic leading-relaxed shadow-inner"
        >
          {renderInlineFormatting(quoteText)}
        </blockquote>
      )
      quoteLines = []
      inQuoteBlock = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // 1. Horizontal Rule / Divider (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(i)
      flushQuote(i)
      elements.push(
        <hr key={`hr-${i}`} className="border-[#2d3348] my-3 sm:my-4" />
      )
      continue
    }

    // 2. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      flushList(i)
      inQuoteBlock = true
      const cleanedQuote = trimmed.replace(/^>\s*/, '')
      quoteLines.push(cleanedQuote)
      continue
    } else if (inQuoteBlock) {
      flushQuote(i)
    }

    // 3. Headings (###, ##, #)
    if (trimmed.startsWith('### ')) {
      flushList(i)
      flushQuote(i)
      const title = trimmed.replace(/^###\s+/, '')
      elements.push(
        <h4
          key={`h3-${i}`}
          className="text-sm sm:text-base font-extrabold text-green-400 mt-4 sm:mt-5 mb-2 flex items-center gap-1.5"
        >
          {renderInlineFormatting(title)}
        </h4>
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushList(i)
      flushQuote(i)
      const title = trimmed.replace(/^##\s+/, '')
      elements.push(
        <h3
          key={`h2-${i}`}
          className="text-base sm:text-lg font-black text-white mt-5 mb-2.5 flex items-center gap-1.5"
        >
          {renderInlineFormatting(title)}
        </h3>
      )
      continue
    }

    if (trimmed.startsWith('# ')) {
      flushList(i)
      flushQuote(i)
      const title = trimmed.replace(/^#\s+/, '')
      elements.push(
        <h2
          key={`h1-${i}`}
          className="text-lg sm:text-xl font-black text-white mt-6 mb-3"
        >
          {renderInlineFormatting(title)}
        </h2>
      )
      continue
    }

    // 4. Bullet list items (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s+/.test(trimmed)) {
      flushQuote(i)
      const itemContent = trimmed.replace(/^(\*|-|\d+\.)\s+/, '')
      currentListItems.push(
        <li
          key={`li-${i}`}
          className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0 shadow-[0_0_6px_#22c55e]" />
          <span className="flex-1">{renderInlineFormatting(itemContent)}</span>
        </li>
      )
      continue
    } else {
      flushList(i)
    }

    // 5. Empty line / Paragraph break
    if (!trimmed) {
      flushList(i)
      flushQuote(i)
      continue
    }

    // 6. Regular text paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-slate-300 leading-relaxed my-1.5"
      >
        {renderInlineFormatting(trimmed)}
      </p>
    )
  }

  flushList(lines.length)
  flushQuote(lines.length)

  return <div className={`flex flex-col ${className}`}>{elements}</div>
}
