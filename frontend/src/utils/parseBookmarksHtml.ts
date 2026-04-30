/**
 * Parses Chrome's "Export bookmarks" HTML output (Netscape Bookmark Format).
 *
 * Output structure:
 *   <DL>
 *     <DT><H3>Folder name</H3>
 *     <DL>
 *       <DT><A HREF="...">Title</A>
 *       <DT><H3>Subfolder</H3>
 *       <DL>...</DL>
 *     </DL>
 *   </DL>
 *
 * We walk the tree and emit a flat list of bookmarks tagged with the
 * slash-separated folder path leading to them.
 */

export interface ParsedBookmark {
  url: string
  title: string
  folderPath: string
  siteName?: string
}

export interface ParseStats {
  totalBookmarks: number
  totalFolders: number
  maxDepth: number
  folderSizes: Array<{ path: string; count: number }>
}

export interface ParseResult {
  bookmarks: ParsedBookmark[]
  stats: ParseStats
}

export function parseBookmarksHtml(html: string): ParseResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.querySelector('dl')
  if (!root) {
    return { bookmarks: [], stats: { totalBookmarks: 0, totalFolders: 0, maxDepth: 0, folderSizes: [] } }
  }

  const bookmarks: ParsedBookmark[] = []
  const folderCounts = new Map<string, number>()
  let maxDepth = 0

  walk(root, [], 0)

  function walk(dl: Element, path: string[], depth: number) {
    if (depth > maxDepth) maxDepth = depth
    let i = 0
    const children = Array.from(dl.children)
    while (i < children.length) {
      const node = children[i]
      if (node.tagName !== 'DT') {
        i++
        continue
      }
      const inner = node.firstElementChild
      if (!inner) {
        i++
        continue
      }
      if (inner.tagName === 'A') {
        const a = inner as HTMLAnchorElement
        const url = a.getAttribute('href') ?? ''
        if (!url || !/^https?:\/\//i.test(url)) {
          i++
          continue
        }
        const title = (a.textContent ?? url).trim().slice(0, 256) || url
        const folderPath = path.join(' / ')
        bookmarks.push({
          url,
          title,
          folderPath,
          siteName: extractHost(url),
        })
        folderCounts.set(folderPath, (folderCounts.get(folderPath) ?? 0) + 1)
        i++
        continue
      }
      if (inner.tagName === 'H3') {
        const folderName = (inner.textContent ?? '').trim() || '폴더'
        // The DL for this folder is the next <DL> sibling of this <DT>.
        const childDl = node.nextElementSibling?.tagName === 'DL'
          ? (node.nextElementSibling as Element)
          : findChildDl(node)
        if (childDl) {
          walk(childDl, [...path, folderName], depth + 1)
        }
        // Skip the next element if it was the DL we just consumed.
        if (children[i + 1]?.tagName === 'DL') {
          i += 2
        } else {
          i++
        }
        continue
      }
      i++
    }
  }

  function findChildDl(dt: Element): Element | null {
    // Some exporters nest <DL> inside <DT>. Be defensive.
    const dls = dt.getElementsByTagName('dl')
    return dls.length > 0 ? dls[0] : null
  }

  const folderSizes = [...folderCounts.entries()]
    .map(([path, count]) => ({ path: path || '(루트)', count }))
    .sort((a, b) => b.count - a.count)

  return {
    bookmarks,
    stats: {
      totalBookmarks: bookmarks.length,
      totalFolders: folderCounts.size,
      maxDepth,
      folderSizes,
    },
  }
}

function extractHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}
