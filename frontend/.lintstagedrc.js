const path = require("path")

const buildEslintCommand = (filenames) => {
  const filtered = filenames.filter(
    (f) => !f.includes(".eslintrc") && !f.includes(".lintstagedrc")
  )
  return filtered.length > 0
    ? `eslint --fix ${filtered.map((f) => path.relative(process.cwd(), f)).join(" ")}`
    : "echo 'No valid files for ESLint'"
}

const prettierCommand = "prettier --write"

module.exports = {
  "src/**/*.{js,jsx,ts,tsx}": [prettierCommand, buildEslintCommand],
  "src/**/*.{json,css,md}": [prettierCommand],
}
