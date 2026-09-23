<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  message?: string
  image?: string
}>(), {
  title: '',
  message: '',
  image: '',
})
</script>

<template>
  <div class="custom-message">
    <Win98ModuleBanner
      icon="/windows98-icons/png/notepad_file-0.png"
      title="Message"
    />

    <Win98ModuleStatus
      v-if="!title && !message && !image"
      line="Aucun message ou image n'a été configuré."
    />

    <div
      v-else
      class="custom-message__content"
      :class="{ 'custom-message__content--split': image }"
    >
      <div
        v-if="image"
        class="custom-message__image"
      >
        <img
          class="custom-message__picture"
          :src="image"
          alt=""
        >
      </div>

      <section
        v-if="title || message"
        class="custom-message__note"
        :class="image ? 'custom-message__note--split' : 'custom-message__note--solo'"
      >
        <p
          v-if="title"
          class="custom-message__title"
        >
          {{ title }}
        </p>
        <p
          v-if="message"
          class="custom-message__text"
        >
          {{ message }}
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.custom-message {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--w98-face);
  color: var(--w98-text);
  font-family: var(--w98-ui-font), sans-serif;
}

// Same recipe as the other modules: a static, non-interactive screen with no
// scroll, so the image well and the note share whatever height is available
// instead of either one carrying a fixed size. Stacked by default (message
// alone); an image switches this to a left/right split.
.custom-message__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
  background: var(--w98-face);

  &--split {
    flex-direction: row;
    align-items: stretch;
  }
}

// Sized by its content rather than an even split: the column is only as wide
// as the picture renders at full row height, so a portrait image stays
// narrow and the text column picks up the rest. Same sunken white well as
// every other module's "document" area.
.custom-message__image {
  display: flex;
  overflow: hidden;
  flex: 0 1 auto;
  max-width: 65%;
  align-items: center;
  justify-content: center;
  padding: 3px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.custom-message__picture {
  display: block;
  max-width: 100%;
  height: 100%;
  width: auto;
  max-height: 100%;
  object-fit: contain;
}

// A raised tile holding a sunken white well, the same shell every module
// uses for its "document" area — here the well holds the title/message
// instead of a menu or a forecast.
.custom-message__note {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);

  // No image: the note is the whole module, so it takes the full height and
  // reads as a centered, full-screen notice.
  &--solo {
    min-height: 0;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  // An image sits to the left, so the note is the right half of the split
  // instead of a caption strip — text reads left-aligned, like a document.
  &--split {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    flex: 1 1 0;
    align-items: flex-start;
    justify-content: center;
    text-align: left;
  }
}

.custom-message__title {
  overflow: hidden;
  max-width: 60ch;
  margin: 0 0 10px;
  color: var(--w98-text);
  font-size: clamp(1.3rem, 3vw, 2.4rem);
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: break-word;
}

.custom-message__text {
  overflow: hidden;
  max-width: 60ch;
  margin: 0;
  color: var(--w98-text);
  font-size: clamp(.95rem, 1.6vw, 1.25rem);
  font-weight: 400;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

@media (max-width: 700px) {
  .custom-message__content--split {
    flex-direction: column;
  }

  // Width-driven sizing only makes sense in the row layout; stacked, the
  // picture instead caps its height so the text below always keeps room.
  .custom-message__image {
    max-width: 100%;
    max-height: 55%;
  }

  .custom-message__picture {
    width: 100%;
    height: auto;
    max-height: 100%;
  }

  .custom-message__note--split {
    align-items: center;
    text-align: center;
  }
}
</style>
