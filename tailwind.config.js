/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: "#00a884",
          "dark-green": "#008f6b",
          bg: "#111b21",
          sidebar: "#202c33",
          "message-sent": "#005c4b",
          "message-received": "#202c33",
          text: "#e9edef",
          "text-secondary": "#8696a0",
          border: "#374045",
        },
      },
    },
  },
  plugins: [],
};
