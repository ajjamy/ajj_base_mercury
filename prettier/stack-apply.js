/**
 * Prettier plugin: sorts @apply classes with prettier-plugin-tailwindcss,
 * then stacks them one per line.
 *
 * Must be listed after prettier-plugin-tailwindcss in the Prettier config.
 */
import { parsers as tailwindParsers } from "prettier-plugin-tailwindcss";

function stackApply(node, options, depth = 0) {
  for (const child of node.nodes ?? []) {
    if (child.type === "css-atrule" && child.name === "apply") {
      const classes = child.params.trim().split(/\s+/);
      if (classes.length > 1) {
        const unit = options.useTabs ? "\t" : " ".repeat(options.tabWidth);
        child.params = classes.join("\n" + unit.repeat(depth + 1));
      }
    }
    stackApply(child, options, depth + 1);
  }
}

export const parsers = {
  css: {
    ...tailwindParsers.css,
    async parse(text, options) {
      const ast = await tailwindParsers.css.parse(text, options);
      stackApply(ast, options);
      return ast;
    },
  },
};
