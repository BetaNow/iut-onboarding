import { createError, defineEventHandler, getQuery, proxyRequest } from 'h3'

const allowedHosts = new Set([
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'v.redd.it',
])

function isAllowedImageUrl(url: string): boolean {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  }
  catch {
    return false
  }

  return (
    parsedUrl.protocol === 'https:'
    && allowedHosts.has(parsedUrl.hostname)
  )
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url

  if (typeof url !== 'string' || !isAllowedImageUrl(url)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid image URL',
    })
  }

  return proxyRequest(event, url)
})
