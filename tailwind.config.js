/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.{ts,tsx}",
        "./PageFicheChantier/**/*.{ts,tsx}",
        "./PageFicheChantier/components/**/*.{ts,tsx}" // Checks your Google AI components
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}