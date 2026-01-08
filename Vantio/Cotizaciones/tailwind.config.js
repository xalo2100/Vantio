/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Theme colors using CSS variables
                'theme-primary': 'var(--color-primary)',
                'theme-secondary': 'var(--color-secondary)',
                'theme-accent': 'var(--color-accent)',
                'theme-success': 'var(--color-success)',
                'theme-warning': 'var(--color-warning)',
                'theme-error': 'var(--color-error)',
                'theme-info': 'var(--color-info)',
                'theme-background': 'var(--color-background)',
                'theme-surface': 'var(--color-surface)',
                'theme-border': 'var(--color-border)',
                'theme-text-primary': 'var(--color-textPrimary)',
                'theme-text-secondary': 'var(--color-textSecondary)',
                'theme-text-muted': 'var(--color-textMuted)',

                // Original color palette (kept for backwards compatibility)
                orange: {
                    50: '#FFF5F0',
                    100: '#FFE8DC',
                    200: '#FFD1B9',
                    300: '#FFB399',
                    400: '#FF8F66',
                    500: '#FF6B35', // Principal
                    600: '#E65A2B',
                    700: '#CC4A21',
                    800: '#B33A17',
                    900: '#992A0D',
                },
                petrol: {
                    50: '#E8F2F7',
                    100: '#D1E5EF',
                    200: '#A3CBD0',
                    300: '#75B1C1',
                    400: '#5FA8D3', // Claro
                    500: '#1B4965', // Principal
                    600: '#163A52',
                    700: '#112B3F',
                    800: '#0D2C40', // Oscuro
                    900: '#081D2C',
                },
                beige: {
                    50: '#FDFBF7',
                    100: '#F4E9D8', // Principal
                    200: '#EBD9C1',
                    300: '#E2C9AA',
                    400: '#D9B993',
                    500: '#D0A97C',
                    600: '#C79965',
                    700: '#BE894E',
                    800: '#B57937',
                    900: '#AC6920',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
