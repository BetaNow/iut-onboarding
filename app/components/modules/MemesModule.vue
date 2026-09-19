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
    <!-- Site chrome. Reddit's own blues, but drawn in the desktop's face: the
         layout is what makes it read as reddit, so the type is free to belong to
         the machine rendering it. -->
    <div class="reddit__chrome">
      <img
          class="reddit__snoo"
          src="/img/logo-reddit.png"
          alt=""
          width="44"
          height="44"
      >
      <span class="reddit__wordmark">reddit</span>
      <!-- From the prop, not the response: the subreddit is known even when the
           fetch fails, so the chrome stays whole on the error state. -->
      <span class="reddit__sub">r/{{ subreddit }}</span>
    </div>
    <div class="reddit__tabs"/>

    <div
        v-if="error"
        class="reddit__empty"
    >
      <p class="reddit__empty-line">
        there doesn't seem to be anything here
      </p>
      <p class="reddit__empty-why">
        {{ reason }}
      </p>
    </div>

    <div
        v-else-if="data"
        class="reddit__post"
    >
      <!-- The midcol: the one place colour is spent. -->
      <div class="reddit__votes">
        <span class="reddit__arrow reddit__arrow--up"/>
        <!-- Reddit prints a dot while a post's score is hidden. The panel never
             stores the upvote count, so the dot is the truthful reading. -->
        <span class="reddit__score">•</span>
        <span class="reddit__arrow reddit__arrow--down"/>
      </div>

      <div class="reddit__entry">
        <p class="reddit__headline">
          <span class="reddit__title">{{ data.title }}</span>
          <span class="reddit__domain">({{ domain }})</span>
        </p>

        <p class="reddit__tagline">
          submitted by <span class="reddit__author">{{ data.author }}</span> to <span
            class="reddit__sublink">r/{{ data.subreddit }}</span>
        </p>

        <div class="reddit__expando">
          <img
              v-if="imageSrc"
              :src="imageSrc"
              :alt="data.title"
          >
        </div>

        <p class="reddit__buttons">
          <span>share</span><span>save</span><span>hide</span><span>report</span>
        </p>
      </div>
    </div>

    <div
        v-else
        class="reddit__empty"
    >
      <p class="reddit__empty-line">
        loading...
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.reddit {
  // Old reddit's palette, lifted from its stylesheet rather than themed to the
  // desktop. A page inside a browser window does not take the system colours.
  --rd-chrome: #cee3f8;
  --rd-rule: #5f99cf;
  --rd-title: #0000ff;
  --rd-meta: #888;
  --rd-vote: #ff8b60;
  --rd-arrow: #c3c3c3;

  display: flex;
  height: 100%;
  flex-direction: column;
  background: #fff;

  // MS Sans Serif, the same face as the chrome outside. Reddit used Verdana, but
  // the whole desktop should look drawn by one machine.
  //
  // Sizes run about twice reddit's, since this is read from across a corridor.
  // The proportions between them are reddit's.
  font-family: var(--w98-ui-font);
}

.reddit__chrome {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
}

.reddit__snoo {
  flex: 0 0 auto;
  image-rendering: pixelated;
}

.reddit__wordmark {
  font-size: 34px;
  font-weight: 700;
  color: #ff4500;
  letter-spacing: -1px;
}

.reddit__sub {
  margin-left: 6px;
  font-size: 20px;
  font-weight: 700;
  color: var(--rd-rule);
}

.reddit__tabs {
  flex: 0 0 12px;
  border-bottom: 2px solid var(--rd-rule);
  background: var(--rd-chrome);
}

.reddit__post {
  display: flex;
  min-height: 0;
  flex: 1;
  gap: 14px;
  padding: 16px 22px 10px 12px;
}

// Reddit's vote gutter. The arrows are CSS triangles, so they stay crisp instead
// of blowing up a 15px sprite.
.reddit__votes {
  display: flex;
  flex: 0 0 62px;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-top: 6px;
}

.reddit__arrow {
  width: 0;
  height: 0;
  border-right: 17px solid transparent;
  border-left: 17px solid transparent;

  &--up {
    border-bottom: 19px solid var(--rd-vote);
  }

  &--down {
    border-top: 19px solid var(--rd-arrow);
  }
}

.reddit__score {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--rd-meta);
}

.reddit__entry {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.reddit__headline {
  flex: 0 0 auto;
  line-height: 1.25;
}

// Underlined, the way a browser of the period drew every link before
// stylesheets talked them out of it.
.reddit__title {
  font-size: 33px;
  color: var(--rd-title);
  text-decoration: underline;
}

.reddit__domain {
  margin-left: 9px;
  font-size: 19px;
  color: var(--rd-meta);
}

.reddit__tagline {
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--rd-meta);
}

.reddit__author,
.reddit__sublink {
  color: var(--rd-rule);
  text-decoration: underline;
}

// Expanded inline, the way a meme post looks once opened. Takes the leftover
// height rather than setting it, so a tall meme cannot push the buttons out.
.reddit__expando {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px 0;

  // A border on the image, not an inset shadow on a wrapper. An inset shadow on
  // an <img> paints under its own content, and a wrapper would size itself from
  // the intrinsic width, leaving the frame standing off a height-capped image.
  img {
    max-width: 100%;
    max-height: 100%;
    border-width: 2px;
    border-style: solid;
    border-color: var(--w98-shadow) var(--w98-white) var(--w98-white) var(--w98-shadow);
    object-fit: contain;
  }
}

.reddit__buttons {
  display: flex;
  flex: 0 0 auto;
  gap: 16px;
  font-size: 17px;
  font-weight: 700;
  color: var(--rd-meta);
}

.reddit__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
}

.reddit__empty-line {
  font-size: 26px;
  color: var(--rd-meta);
}

.reddit__empty-why {
  font-size: 18px;
  color: #b00;
}
</style>
