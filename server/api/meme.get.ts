import type { Meme, MemeResponse } from '#shared/types/memeResponse.ts'
import { useDatabase } from '../utils/database'
import { memeTable } from '../database/meme'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event): Promise<Meme> => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const memeApiUrl = config.memeApiUrl
  let department: Department | undefined

  if (!query.department || typeof query.department !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing department parameter',
    })
  }
  else {
    department = <Department>query.department
    if (department === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid department parameter',
      })
    }
  }

  // Get the last meme from the database
  const db = useDatabase()
  const [lastMeme] = await db
    .select()
    .from(memeTable)
    .orderBy(desc(memeTable.createdAt))
    .where(eq(memeTable.department, department))
    .limit(1)

  // If the last meme is older than 1 day, fetch a new meme from the external API
  if (!(lastMeme && lastMeme.createdAt && (Date.now() - lastMeme.createdAt.getTime()) < 86400000)) {
    if (!query.subreddit || typeof query.subreddit !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing subreddit parameter',
      })
    }

    let memeResponse: MemeResponse

    try {
      do {
        memeResponse = await $fetch<MemeResponse>(`${memeApiUrl}/${query.subreddit}`)
      } while (memeResponse.nsfw || memeResponse.spoiler)
    }
    catch {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to fetch meme from external API',
      })
    }

    const memeToInsert: typeof memeTable.$inferInsert = {
      postLink: memeResponse.postLink,
      subreddit: memeResponse.subreddit,
      title: memeResponse.title,
      url: memeResponse.url,
      author: memeResponse.author,
      department: department,
      preview: memeResponse.preview,
    }

    const [insertedMeme] = await db
      .insert(memeTable)
      .values(memeToInsert)
      .$returningId()

    if (!insertedMeme) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to insert meme',
      })
    }

    const [createdMeme] = await db
      .select()
      .from(memeTable)
      .where(eq(memeTable.id, insertedMeme.id))
      .limit(1)

    if (!createdMeme) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load inserted meme',
      })
    }

    return createdMeme
  }
  else {
    return lastMeme
  }
})
