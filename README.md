# CSS Modules Companion

Provides convenience commands for working with CSS modules.

The main command is `toggleBetweenComponentAndCssModule`, which switches the editor focus between a JavaScript file and its corresponding CSS module file.  This command will create the CSS module file if it doesn't exist, and add an import statement to the JavaScript file.

You can also use the `importCorrespondingCssModule` command to create the CSS module file and add the import statement without switching the editor focus.

If you're working on `dir/file.jsx`, the corresponding CSS module will be identified as `dir/file.module.css` (with handling for TypeScript files and CSS Preprocessor extensions).

## Default keybindings

| Command | Mac | Windows |
| ------- | --- | ------- |
| `toggleBetweenComponentAndCssModule` | <kbd>Cmd-;</kbd> | <kbd>Ctrl-;</kbd> |
| `importCorrespondingCssModule` | <kbd>Cmd-Shift-;</kbd> | <kbd>Ctrl-Shift;</kbd> |

## CSS Preprocessors

If your workspace contains any `*.scss`, `*.sass`, `*.less`, or `*.styl` files, CSS Modules Companion will prefer that extension for CSS module files.  You can override this behavior.

## Configuration

If you wish to explicitly set a preferred file extension, use the `fileExtension` option.

By default, the import statement will read:
```jsx
import css from "./foo.module.css";
```
You can change the name of the import binding (`css` in the example above) to any string via the `importName` option.
