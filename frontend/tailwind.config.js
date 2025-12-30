/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-yellow': '#FFE01B', // Mailchimp yellow
                'brand-dark': '#241C15',
            }
        },
    },
    plugins: [],
}
