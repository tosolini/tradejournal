import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // "dark:" activates when [data-theme="light"] is on html element
  // This means original Tailwind classes = dark theme (default), dark: prefix = light theme overrides
  darkMode: ['selector', '[data-theme="light"]'],
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config;
