import type { Decorator, Preview } from "@storybook/react-vite"
import { withThemeByClassName } from "@storybook/addon-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import "../src/renderer/src/index.css"

// The app renders every screen inside a TooltipProvider (see src/renderer/src/create.tsx).
const withProviders: Decorator = (Story) => (
  <TooltipProvider>
    <Story />
  </TooltipProvider>
)

const preview: Preview = {
  decorators: [
    withProviders,
    withThemeByClassName({
      themes: { dark: "dark", light: "light" },
      defaultTheme: "dark",
    }),
  ],
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: {
        order: ["Components", "Features"],
      },
    },
  },
}

export default preview
