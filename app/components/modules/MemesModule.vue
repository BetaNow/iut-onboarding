<script setup lang="ts">
import type {Meme} from '#shared/types/memeResponse'

// These names are settings keys as they are written in the database: the
// catalogue declares them, and the admin saves them under exactly these keys.
const props = defineProps<{
  subreddit_info?: string
  subreddit_sgm?: string
  department: string
}>()

// The row carries a subreddit per department; this module reads the one for the
// screen it is running on.
const subreddit = computed(() =>
    (props.department === 'sgm' ? props.subreddit_sgm : props.subreddit_info) ?? 'ProgrammerHumor',
)

// Lazy and not awaited: an awaited useFetch makes setup async, and swapping a
// suspending component into a resolved <Suspense> blanks the boundary for the
// length of the request. This has to mount at once and fill in afterwards.
//
// No refresh timer either. The rotation re-mounts the component every time it
// comes back round, which re-runs the fetch.
const {data, error} = useLazyFetch<Meme>('/api/meme', {
  query: {
    subreddit,
    department: props.department,
  },
})

// The image is proxied rather than hotlinked, so the panel never talks to
// Reddit's CDN directly.
const imageSrc = computed(() => {
  if (!data.value?.url) {
    return ''
  }

  return `/api/meme/image?url=${encodeURIComponent(data.value.url)}`
})

// Reddit prints the source host in grey after every link post's title.
const domain = computed(() => {
  if (!data.value?.url) {
    return ''
  }

  try {
    return new URL(data.value.url).hostname.replace(/^www\./, '')
  } catch {
    return 'i.redd.it'
  }
})

// H3 puts the handler's own statusMessage on `data`; ofetch's `message` is only
// the method and URL, which says nothing about what actually failed.
const reason = computed(() => {
  const body = error.value?.data as { statusMessage?: string } | undefined

  return body?.statusMessage ?? error.value?.statusMessage ?? error.value?.message
})
</script>

<template>
  <div class="reddit">
    <Win98ModuleBanner
        icon="/img/logo-reddit.png"
        icon-alt="Reddit logo"
        :title="`Memes – r/${subreddit}`"
    />

    <Win98ModuleStatus
        v-if="error"
        tone="warn"
        line="Le mème n’a pas pu être chargé."
        :detail="reason"
    />

    <div
        v-else-if="data"
        class="reddit__content"
    >
      <section class="reddit__post">
        <header class="reddit__post-head">
          <span class="reddit__title">{{ data.title }}</span>
          <span class="reddit__domain">{{ domain }}</span>
        </header>

        <div class="reddit__expando">
          <img
              v-if="imageSrc"
              :src="imageSrc"
              :alt="data.title"
          >
        </div>

        <footer class="reddit__post-foot">
          <span class="reddit__tagline">
            par <strong class="reddit__author">{{ data.author }}</strong> dans <strong
              class="reddit__sublink">r/{{ data.subreddit }}</strong>
          </span>

          <span class="reddit__buttons">
            <span>partager</span><span>enregistrer</span><span>masquer</span><span>signaler</span>
          </span>
        </footer>
      </section>
    </div>

    <Win98ModuleStatus
        v-else
        line="Chargement du mème…"
    />
  </div>
</template>

<style scoped lang="scss">
.reddit {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--w98-face);
  color: var(--w98-text);
  font-family: var(--w98-ui-font), sans-serif;
}

// Same recipe as Weather/Crous/TBM: a static, non-interactive screen with no
// scroll, so the post card below shares whatever vertical space is available
// instead of growing past it.
.reddit__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 12px 16px;
  overflow: hidden;
  background: var(--w98-face);
}

// Same shell as every other module's cards: a raised tile on the face holding
// a sunken white well for the image.
.reddit__post {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

// Win98's own selection colour, used as the "highlighted" title band, same as
// the weather/crous hero header.
.reddit__post-head {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--w98-select);
}

.reddit__title {
  overflow: hidden;
  color: var(--w98-white);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-decoration: underline;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit__domain {
  flex: 0 0 auto;
  color: var(--w98-white);
  font-size: var(--w98-ui-size-sm);
}

// Takes the leftover height rather than setting it, so a tall meme cannot
// push the footer out — the static screen never scrolls.
.reddit__expando {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.reddit__post-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  box-shadow: var(--w98-groove);
}

.reddit__tagline {
  overflow: hidden;
  min-width: 0;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit__author,
.reddit__sublink {
  color: var(--w98-text);
}

.reddit__buttons {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  font-weight: 700;
  text-transform: uppercase;
}

@media (max-width: 600px) {
  .reddit__domain,
  .reddit__buttons {
    display: none;
  }
}
</style>
