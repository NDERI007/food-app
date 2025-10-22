import { replaceInFileSync } from "replace-in-file";

const options = {
  files: "dist/**/*.js",
  from: [
    // Fix relative imports: from './module' -> from './module.js'
    /from\s+['"](\.\.?\/[^'"]+)['"]/g,
    // Fix dynamic imports: import('./module') -> import('./module.js')
    /import\s*\(['"](\.\.?\/[^'"]+)['"]\)/g,
    // Fix re-exports: export ... from './module' -> export ... from './module.js'
    /export\s+.*from\s+['"](\.\.?\/[^'"]+)['"]/g,
  ],
  to: (match) => {
    // Don't add .js if it already has an extension
    if (match.match(/\.(js|json|node)['")\s]/)) {
      return match;
    }
    // Add .js before the closing quote or parenthesis
    return match.replace(/(['"])\s*(\)|$)/, ".js$1$2");
  },
};

try {
  const results = replaceInFileSync(options);
  const changedFiles = results.filter((r) => r.hasChanged).length;
  console.log(`✅ Fixed .js extensions in ${changedFiles} file(s)`);
} catch (error) {
  console.error("❌ Error fixing imports:", error);
  process.exit(1);
}
