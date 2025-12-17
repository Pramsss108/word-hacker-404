/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // WH404 Brand Colors
                'void-black': '#0a0a0a',
                'neon-cyan': '#00f3ff',
                'alert-red': '#ff003c',
                'glass-bg': 'rgba(10, 10, 10, 0.7)',
                'glass-border': 'rgba(0, 243, 255, 0.2)',
            },
            fontFamily: {
                'mono': ['"JetBrains Mono"', 'monospace'], // Hacker vibe
                'sans': ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
