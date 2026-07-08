export interface ThemeMeta {
  id: string
  label: string
  dark: boolean
}

export const THEMES: ThemeMeta[] = [
  { id: 'light', label: 'Light+ (VS Code)', dark: false },
  { id: 'dark', label: 'Dark+ (VS Code)', dark: true },
  { id: 'one-dark', label: 'One Dark', dark: true },
  { id: 'monokai', label: 'Monokai', dark: true },
  { id: 'solarized-dark', label: 'Solarized Dark', dark: true },
  { id: 'solarized-light', label: 'Solarized Light', dark: false },
]

export const THEME_IDS = THEMES.map(t => t.id)

export function isDarkTheme(id: string): boolean {
  return THEMES.find(t => t.id === id)?.dark ?? true
}
