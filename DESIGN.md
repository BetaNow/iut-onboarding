# Windows 98 UI Design System

## 1. Core principle

The entire application must feel like a **native Windows 95/98 desktop application**, not a modern application wearing a retro skin.

Every UI decision must prioritize:

1. Windows 98 visual authenticity
2. Functional clarity
3. Consistency
4. Pixel-level simplicity
5. Usability

Never introduce modern SaaS/web design patterns unless explicitly requested.

---

# 2. Visual identity

The visual language must be inspired by the Windows 98 desktop and classic Win32 applications.

### General characteristics

* Gray system UI backgrounds
* Hard 1px borders
* Raised and sunken 3D surfaces
* Square corners
* Compact controls
* Dense information layout
* Small system icons
* Pixel-art aesthetic
* Minimal visual decoration
* No gradients unless they reproduce an authentic Windows 98 effect
* No glassmorphism
* No blur
* No shadows resembling modern CSS drop shadows
* No rounded cards
* No excessive whitespace
* No modern floating UI

The application should look like it could realistically have shipped with Windows 98.

---

# 3. Color palette

Use a restrained system palette.

Primary colors:

* Desktop teal: `#008080`
* Window gray: `#C0C0C0`
* Light highlight: `#FFFFFF`
* Dark shadow: `#808080`
* Darkest shadow: `#000000`
* Window title blue: `#000080`
* Inactive title bar: `#808080`
* Standard text: `#000000`
* Selected text background: `#000080`
* Selected text: `#FFFFFF`

Do not randomly introduce modern colors.

Accent colors should only appear when they have a clear semantic or Windows-era purpose.

---

# 4. Typography

Default UI typography should resemble classic Windows system fonts.

Prefer:

* MS Sans Serif
* Microsoft Sans Serif
* Tahoma
* Arial as fallback

Use small font sizes.

Typical UI text:

* 8px–11px
* headings: 10px–12px
* window title: approximately 11px

Avoid:

* Inter
* Roboto
* Poppins
* Geist
* modern web fonts
* oversized typography

Typography should feel compact and utilitarian.

---

# 5. Windows

Every major application section should visually behave like a classic Windows window.

A window consists of:

```text
┌──────────────────────────────────────────┐
│ [icon] Application Name          _ □ X   │
├──────────────────────────────────────────┤
│ File  Edit  View  Help                   │
├──────────────────────────────────────────┤
│                                          │
│                CONTENT                   │
│                                          │
├──────────────────────────────────────────┤
│ Ready                                    │
└──────────────────────────────────────────┘
```

### Title bars

Active window:

* dark navy background
* white text
* compact height
* small application icon
* classic minimize/maximize/close buttons

Inactive window:

* gray title bar
* dark gray text

Never use:

* pill-shaped title bars
* floating modern headers
* oversized navigation bars

---

# 6. Borders and depth

Use the classic Windows 3D border technique.

Raised elements:

```text
white highlight
↓
light gray
↓
gray
↓
black/dark shadow
```

Sunken elements:

```text
dark shadow
↓
gray
↓
white/light highlight
```

Buttons should visually appear raised.

Pressed buttons should visually invert their borders.

Inputs and panels should generally appear sunken.

Do not use modern `box-shadow`.

Prefer borders that reproduce the Win98 bevel effect.

---

# 7. Buttons

Buttons must look like classic Windows buttons.

Characteristics:

* rectangular
* gray background
* 1px borders
* 3D raised appearance
* compact padding
* black text
* subtle pressed state

Example:

```text
┌──────────────┐
│     OK       │
└──────────────┘
```

Avoid:

```text
╭──────────────╮
│     OK       │
╰──────────────╯
```

No rounded buttons.

---

# 8. Inputs

Inputs should look like classic Win32 controls.

Use:

* white background
* black text
* sunken border
* compact height
* square corners

Do not use:

* floating labels
* rounded inputs
* large modern text fields
* animated focus rings

Focus should remain visually subtle and system-like.

---

# 9. Menus

Menus should resemble classic Windows menus.

Example:

```text
File   Edit   View   Help
```

Opening a menu should produce a compact rectangular dropdown.

Menu items should have:

* small height
* black text
* white/light background
* blue selection state
* optional keyboard shortcut aligned to the right

Example:

```text
┌─────────────────────────┐
│ Open...          Ctrl+O  │
│ Save             Ctrl+S  │
│ ──────────────────────── │
│ Exit                    │
└─────────────────────────┘
```

---

# 10. Icons

Icons are extremely important.

Use **small pixel-art icons** inspired by Windows 98.

Characteristics:

* low resolution
* hard edges
* limited palette
* no anti-aliased modern vector appearance
* recognizable silhouettes
* consistent visual language

Icons should look like they belong to the same operating system.

Never mix:

* modern SVG icons
* Lucide icons
* Material icons
* Font Awesome
* glossy modern icons

with Win98 pixel icons unless explicitly required.

---

# 11. Desktop

If a desktop exists, it should behave like a real desktop.

Possible structure:

```text
┌───────────────────────────────────────────────┐
│                                               │
│  [Computer]    [Documents]    [Recycle Bin]   │
│                                               │
│                                               │
│                                               │
│                                               │
├───────────────────────────────────────────────┤
│ Start │ [Application] [Application] │ 12:42   │
└───────────────────────────────────────────────┘
```

The taskbar should be compact.

The Start button should be visually prominent but still authentic.

Avoid modern dock-like behavior.

---

# 12. Layout philosophy

Do NOT reproduce modern web layouts blindly.

Prefer:

* dense layouts
* panels
* toolbars
* status bars
* tab controls
* tree views
* list views
* tables
* classic dialogs

A page should feel like a **desktop application**, not a website.

Whitespace must be intentional.

If something can be represented as a compact panel instead of a large card, prefer the panel.

---

# 13. Dialogs

Dialogs should resemble Win32 dialogs.

Example:

```text
┌────────────────────────────────────┐
│ Confirm                            │
├────────────────────────────────────┤
│                                    │
│ Are you sure you want to continue? │
│                                    │
│             [ Yes ] [ No ]         │
│                                    │
└────────────────────────────────────┘
```

Dialogs should:

* be compact
* have a title bar
* use classic buttons
* use small icons when appropriate
* avoid modern modal overlays

Do not dim the entire screen with a modern translucent overlay unless technically necessary.

---

# 14. Tables and lists

Tables should feel like Windows Explorer / classic applications.

Use:

* compact rows
* thin borders
* system gray headers
* blue selection
* small typography

Avoid:

* rounded cards
* excessive row padding
* floating table containers
* modern zebra-striping unless necessary

---

# 15. Tabs

Tabs should look like classic Windows property sheets.

Example:

```text
┌─────────┬─────────┬─────────┐
│ General │ Network │ Display │
└─────────┴─────────┴─────────┘
```

Tabs should have the classic raised/sunken appearance.

---

# 16. Scrollbars

Use classic Windows-style scrollbars whenever possible.

They should visually match the rest of the interface.

Avoid modern minimal scrollbars.

---

# 17. Animations

Animations should be extremely limited.

Windows 98 was not an animated modern web application.

Prefer:

* instant state changes
* simple pressed states
* simple menu opening
* minimal transitions

Never use:

* smooth card animations
* spring animations
* parallax
* page transitions
* floating effects
* excessive motion

---

# 18. UX behavior

The application should not only LOOK like Windows 98.

It should also behave like a desktop application.

Prefer:

* double-click interactions where appropriate
* context menus
* keyboard shortcuts
* visible focus
* menus
* dialogs
* toolbars
* status bars
* draggable windows if the application uses a desktop metaphor
* familiar desktop interaction patterns

However, do not sacrifice usability merely for nostalgia.

---

# 19. Component consistency

Before creating a new UI component, check whether an existing component can be reused.

The project should have a small reusable Win98 component library:

```text
WinWindow
WinButton
WinInput
WinSelect
WinCheckbox
WinRadio
WinMenu
WinMenuItem
WinDialog
WinTabs
WinTable
WinList
WinTree
WinToolbar
WinStatusBar
WinTaskbar
WinDesktop
WinIcon
WinTooltip
```

Do not create visually different versions of the same component.

One button should look like the same button everywhere.

---

# 20. Design hierarchy

Not everything should look equally important.

Use the Windows visual hierarchy:

```text
Window
 ├── Title bar
 ├── Menu
 ├── Toolbar
 ├── Content
 │    ├── Panels
 │    ├── Controls
 │    └── Data
 └── Status bar
```

The hierarchy should come from borders, spacing, typography and system colors rather than modern card shadows or large typography.

---

# 21. Modern technology, retro presentation

The underlying implementation can be completely modern.

Use modern:

* TypeScript
* Vue / React
* CSS
* state management
* accessibility
* testing
* component architecture

But the **rendered interface must remain visually faithful to Windows 98**.

Do not confuse:

> modern implementation

with

> modern visual design.

The implementation should be modern.
The interface should be retro.

---

# 22. Anti-patterns

Before accepting a UI implementation, check for these.

If any appear without an explicit reason, remove them:

❌ Rounded cards
❌ Border radius everywhere
❌ Glassmorphism
❌ Blur
❌ Gradient backgrounds
❌ Huge headings
❌ Excessive whitespace
❌ Floating action buttons
❌ Modern SaaS dashboards
❌ Hamburger navigation
❌ Modern sidebar navigation
❌ Material Design components
❌ Lucide/FontAwesome icons
❌ Modern toast notifications
❌ Smooth spring animations
❌ Giant buttons
❌ Giant form fields
❌ Modern shadows
❌ Excessive animations
❌ Generic AI-generated dashboard aesthetics

---

# 23. Decision rule

When uncertain between two UI implementations, ask:

> "Could this realistically have existed in a Windows 98 application?"

If the answer is no, prefer another solution.

Do not invent modern UI patterns just because they are common in contemporary web applications.

---

# 24. Implementation rule for Claude

Before implementing a new screen:

1. Inspect existing Win98 components.
2. Reuse existing components whenever possible.
3. Check the color palette.
4. Check typography.
5. Check border/bevel conventions.
6. Check icon style.
7. Check spacing and density.
8. Implement.
9. Compare the result against the existing UI.
10. Fix inconsistencies before considering the task complete.

Never introduce a new visual pattern without first checking whether an existing Win98 pattern already solves the problem.

---

# 25. Final quality test

A UI implementation is NOT complete if it is merely functional.

Before finishing, verify:

* Does it look authentically Win98?
* Are all components visually consistent?
* Are borders and bevels correct?
* Are controls compact?
* Are icons stylistically consistent?
* Are colors from the system palette?
* Is the typography appropriate?
* Did any modern UI pattern accidentally appear?
* Does the screen feel like a desktop application rather than a modern website?

If not, revise the UI before finishing the task.
