import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['app/components/modules/*.vue'],
  rules: {
    // A module's props are its settings keys exactly as the database spells
    // them. Camel-casing them here would stop them binding.
    'vue/prop-name-casing': 'off',
  },
})
