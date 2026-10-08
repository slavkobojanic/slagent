import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/renderer/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    // The renderer already typechecks with tsconfig.web.json.
    reactDocgen: "react-docgen-typescript",
  },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve ??= {}
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string>),
      "@": fileURLToPath(new URL("../src/renderer/src", import.meta.url)),
      "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)),
    }
    // The config files in .storybook are outside the framework's React transform, so add
    // the plugin and the automatic JSX runtime explicitly.
    viteConfig.esbuild = { ...viteConfig.esbuild, jsx: "automatic" }
    viteConfig.plugins = [...(viteConfig.plugins ?? []), react(), tailwindcss()]
    return viteConfig
  },
}

export default config
