# IUT Onboarding

Corridor signage for the IUT de Bordeaux. Each screen is a Windows 98 desktop that plays a rotation of modules (memes today, timetables and the RU menu next), themed by the date and configured from `/admin` rather than by editing code.

Nuxt 4 and MySQL, with Drizzle in between.

## Getting Started

```bash
npm install
cp .env.example .env    # then set ADMIN_PASSWORD and NUXT_SESSION_PASSWORD
npm run db:setup        # starts MySQL in Docker and applies every migration
npm run dev
```

Then open a panel at [localhost:3000/info](http://localhost:3000/info) and the admin at [localhost:3000/admin](http://localhost:3000/admin).

Panels are built for a 1920x1080 screen and scale to fit, so a laptop window shows the whole desktop rather than a corner of it.

## Database

The local database runs on MySQL 8.4 in Docker. Start it and apply all migrations with:

```bash
npm run db:setup
```

The default connection URL is `mysql://onboarding:onboarding@127.0.0.1:3306/iut_onboarding`. Copy `.env.example` to `.env` if you need to change the defaults (while preserving your session password).

After changing anything under `server/database/`, generate and apply a migration:

```bash
npm run db:generate
npm run db:migrate
```

Use `npm run db:down` to stop the database. Its data remains in the `mysql_data` Docker volume.

## Screens and Modules

A screen is a row in `screen_table`, reached at `/<slug>`. `/info` and `/sgm` are seeded by migration. The row carries the panel's name, its department, and whether it is active; the display reads all three rather than hard-coding them.

What a panel plays comes from `module_config_table`, one row per module per department, edited in the admin. `both` is a shared baseline rather than a third list: a screen plays the `both` modules first, in their order, then its own department's. So a module put in `Commun` runs everywhere, and each department tab reorders only its own rows.

A panel pings `POST /api/screens/<slug>/heartbeat` every thirty seconds. The ping keeps `lastSeenAt` fresh (that is what the admin's online dots read, with a screen called offline after three misses) and returns a version stamp for the rotation. When the stamp moves, the panel refetches and swaps the new list in **at the end of the running module's turn**, so a save never cuts a module off part-way. A failed fetch changes nothing: the panel keeps playing the last configuration that reached it rather than going blank.

Durations are held between 5 seconds and 1 hour. The floor is not cosmetic: a module fetches when it mounts, and a turn shorter than its own request is a panel that never finishes drawing.

## Adding a Module

A module is two halves. Its component lives in `app/components/modules/`; its entry in `shared/modules/catalogue.ts` says what the admin calls it, which icon it wears, how long a turn it gets and what there is to configure. The declaration is a plain object in a Vue-free file because the server reads it too: it validates saved settings against the same description the admin drew its form from.

Nothing registers a module anywhere else. The two halves find each other by name:

| Catalogue id | Component |
| --- | --- |
| `memes` | `MemesModule.vue` |
| `menu-ru` | `MenuRuModule.vue` |

`app/utils/modules.ts` globs the components directory and keys what it finds by that rule, so there is no registry to keep in step.

### The short way

```bash
npm run module:new -- menu-ru "Menu du RU" --department --duration 20
```

That writes the component and splices the catalogue entry, refusing an id that is already taken. `--department` hands the module the department of the screen it is running on, `--icon` takes any filename from `public/windows98-icons/png`, and `--duration` is in seconds. All three are optional.

Restart the dev server (`app/utils/modules.ts` globs the components directory, and a running server holds the result it already resolved), then open `/admin`, add the module to a rotation and save. The panel picks it up on its next heartbeat, at the end of whatever module is mid-turn.

The generated component renders its own name and path, so you can watch it take the window before you have written a line of it.

### By hand

The same two steps. Create `app/components/modules/MenuRuModule.vue`:

```vue
<script setup lang="ts">
defineProps<{
  department: string
}>()
</script>

<template>
  <div>Menu du RU</div>
</template>
```

and add its entry to `MODULE_CATALOGUE`:

```ts
{
  id: 'menu-ru',
  label: 'Menu du RU',
  icon: `${ICON}/directory_open_file_mydocs-4.png`,
  defaultDurationMs: MODULE_DEFAULT_DURATION,
  usesDepartment: true,
  settings: [],
}
```

`usesDepartment` is off by default, so a module that never asked for a department does not end up with a stray attribute on its root element.

### Settings

Every field a module declares becomes an input in the admin and a prop on the component, under exactly that key:

```ts
settings: [
  { key: 'city', label: 'Ville', type: 'text', default: 'Bordeaux', help: 'Sans le code postal.' },
]
```

```ts
defineProps<{ city?: string }>()
```

Fields are `text`, `number`, `boolean` or `select`; `number` takes `min` and `max`, `select` takes `options`. Keys are snake_case because that is how they are stored, and ESLint's prop-name-casing rule is turned off for this directory so they can be written as-is.

The stored JSON is what decides which fields exist. The admin renders an input for every key it finds on the row, so a key written straight into `module_config_table.settings` shows up in the editor without the catalogue knowing about it, labelled from the key and typed from the value. Declared keys keep their label, help text and type, and are validated against the declaration; undeclared keys are kept as they stand. Values must be primitives either way, since the whole object is spread onto the component as props.

That is how one module serves both departments. `memes` declares `subreddit_info` and `subreddit_sgm`, and reads whichever matches the department it is handed, so a single module in `Commun` can play a different feed on Info screens than on SGM ones.

### When it needs its own table

Settings are what a person should be able to change. Anything the module keeps for itself (a cache, a history, rows it fetched once and reuses) is a table of its own:

1. Describe it in `server/database/<name>.ts`, the way `meme.ts` describes `meme_table`.
2. Add `export * from './<name>.ts'` to `server/database/index.ts`.
3. `npm run db:generate && npm run db:migrate`.

That second line is the one thing here that is not discovered for you. The barrel is handed to Drizzle at runtime by `useDatabase()`, where Vite's directory globbing does not exist, so a table left out of it reaches MySQL but never the query builder's types.

### Removing one

Delete the component and its catalogue entry, in either order. Rows in `module_config_table` naming a module the catalogue no longer has are skipped rather than played, so panels keep running while you clean up, and the admin drops it from the picker as soon as the entry is gone.

The rows left behind are not shown in the editor, since there is no definition to draw a label or a settings form from, so the tab holding one says so instead:

```
« ghost » n'existe plus dans le code. Enregistrer cet onglet retirera cette ligne.
```

Saving that tab replaces its whole list, which is what finally clears the row.

Restart the dev server afterwards, as when adding one. The components directory is globbed, and a running server holds the old result: deleting a file it has already resolved leaves it importing something that is no longer there, which is a 500 on every panel until it restarts.

### What keeps the halves together

Half a module is silent. An entry with no component is skipped by the rotation; a component with no entry never reaches a panel. Neither says anything at runtime, so `shared/modules/catalogue.test.ts` fails `npm test` on either, naming the file to create:

```
ghost needs app/components/modules/GhostModule.vue
```

It also rejects an id the filename rule cannot express, which is what keeps ids to lowercase words joined by hyphens.

## Administration

`/admin` lists the screens and edits the rotations. It is protected by a single shared password:

```
ADMIN_PASSWORD=...
```

Unset means the admin cannot be logged into at all: there is no default and no fallback. The login route is rate limited well below the site-wide budget, and every `/api/admin/**` route is closed by server middleware, so a new admin endpoint is guarded the moment it is created.

## Seasonal Theme

The display themes itself from the date, so the panel needs no attention. Meteorological seasons, from the panel's own clock: spring 1 March, summer 1 June, autumn 1 September, winter 1 December. The season is re-checked hourly, so a screen left running overnight rolls over on its own.

Each season owns the desktop backdrop and the title-bar gradient, plus an ambient effect. Window faces, bevels and the taskbar stay Win98 grey, departments are told apart by their logo, window titles and paths, not by colour.

| Season | Effect |
| --- | --- |
| Spring | Falling blossom, settling on window tops |
| Summer | Sun rays behind the windows, grass bending in travelling gusts along window tops |
| Autumn | Tumbling leaves, settling on window tops |
| Winter | Falling flakes, taken by a snow ridge along window tops |

Falling particles never draw across a window. Each one comes to rest on the first window top edge it meets, or on the taskbar, and a particle resting on a background window stays hidden behind whatever covers it.

Leaves and blossom lock at whatever rotation their spin left them in, sit for 18 to 40 seconds, fade, and fall again. Snowflakes do not accumulate: on touching the drift a flake keeps sinking as it fades, so the snow draws it in rather than blinking it out.

Contact is tested against the material a particle actually lands on, the crown of the snow, not the window edge below it, and the particle is then left exactly where that frame put it. Both matter: testing at the edge and placing on the crest teleports the particle by the crest's depth in a single frame.

`SeasonOverlay.vue` paints all of this on one canvas, particles and the material along each window's top edge alike. They have to interleave, and a crest drawn in CSS is a pseudo-element inside a window's stacking context while the canvas spans the whole stage, so anything the canvas draws is unavoidably on top of it. Snow has to cover the flakes falling into it, and grass has to bend in a wave that travels across the desktop, which a single element cannot express.

Append `?season=` to pin one for a demo or a screenshot, out of season:

```
http://localhost:3000/info?season=winter
```

Anything else falls back to the date.

Palettes live in `app/styles/_seasons.scss`, which now does nothing but colour. Everything else is parameterised per season at the top of `app/components/season/SeasonOverlay.vue`: particle count, size, fall speed, sway, spin and settle time, and the crest's wind, gust amplitude, wavelength, travel speed and the slower envelope that swells and drops the whole field.

Artwork lives in two places. Particle sprites are the PNGs in `public/img/assets/<season>/`; they are pre-scaled once at runtime, so the source resolution does not matter and any pixel-art PNG can be dropped in. The two crest strips are in `public/season/`, authored at 2x-friendly sizes so their pixels stay on the chrome's grid: snow at 160x16, grass at 160x20.

## Production

```bash
npm run build      # build for production
npm run preview    # preview that build locally
```

See the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for hosting.

## Checks

```bash
npm test           # unit tests, including the module guard
npm run lint       # ESLint
npm run typecheck  # vue-tsc
```
