/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				// Claude-inspired Silicon Valley Tokens
				'bg-base': 'var(--bg-base)',
				'bg-surface': 'var(--bg-surface)',
				'bg-elevated': 'var(--bg-elevated)',
				'bg-overlay': 'var(--bg-overlay)',
				'text-primary': 'var(--text-primary)',
				'text-secondary': 'var(--text-secondary)',
				'text-muted': 'var(--text-muted)',
				'text-inverse': 'var(--text-inverse)',
				'accent-main': 'var(--accent-main)',
				'accent-light': 'var(--accent-light)',
				'accent-border': 'var(--accent-border)',
				'green-brand': 'var(--green)',
				'green-bg': 'var(--green-bg)',
				'red-brand': 'var(--red)',
				'red-bg': 'var(--red-bg)',
				'amber-brand': 'var(--amber)',
				'amber-bg': 'var(--amber-bg)',
				'blue-brand': 'var(--blue)',
				'blue-bg': 'var(--blue-bg)',
				'dark-1': 'var(--dark-1)',
				'dark-2': 'var(--dark-2)',
				'dark-3': 'var(--dark-3)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}