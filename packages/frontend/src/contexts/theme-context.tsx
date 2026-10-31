import { ConfigProvider, theme } from 'antd';
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = 'theme';

function readStoredThemeOverride(): boolean | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // Storage can be unavailable in private browsing or when it is blocked.
  }
  return null;
}

function writeStoredThemeOverride(themeOverride: boolean | null) {
  try {
    if (themeOverride === null) {
      localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }
    localStorage.setItem(THEME_STORAGE_KEY, themeOverride ? 'dark' : 'light');
  } catch {
    // Keep the in-memory theme when storage cannot be updated.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [themeOverride, setThemeOverride] = useState<boolean | null>(readStoredThemeOverride);
  const [printing, setPrinting] = useState(false);
  const isDarkMode = themeOverride ?? systemPrefersDark;
  const renderDark = isDarkMode && !printing;

  useEffect(() => {
    writeStoredThemeOverride(themeOverride);
  }, [themeOverride]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = renderDark ? 'dark' : 'light';
  }, [renderDark]);

  useEffect(() => {
    // Browsers drop backgrounds when printing, so dark-theme text would be
    // white on white. The swap must be synchronous to land before the print
    // snapshot is taken.
    const startPrinting = () => flushSync(() => setPrinting(true));
    const stopPrinting = () => setPrinting(false);
    window.addEventListener('beforeprint', startPrinting);
    window.addEventListener('afterprint', stopPrinting);
    return () => {
      window.removeEventListener('beforeprint', startPrinting);
      window.removeEventListener('afterprint', stopPrinting);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateColorScheme = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);

    mediaQuery.addEventListener('change', updateColorScheme);
    return () => mediaQuery.removeEventListener('change', updateColorScheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme: () => setThemeOverride(!isDarkMode)
      }}
    >
      <ConfigProvider
        theme={{
          algorithm: renderDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#e16828',
            colorError: '#c92f2e',
            colorBgBase: renderDark ? '#000000' : 'rgb(244, 244, 244)',
            colorTextBase: renderDark ? '#ffffff' : '#000000',
            borderRadius: 8,
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }
  return context;
}
