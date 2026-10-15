export function detectLanguage(path: string): string {
  const lower = path.toLowerCase();

  if (lower.endsWith(".blade.php")) return "html";
  if (lower.endsWith(".php")) return "php";
  if (lower.endsWith(".js")) return "javascript";
  if (lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".dart")) return "dart";
  if (lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".vue")) return "vue";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".scss")) return "scss";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".xml")) return "xml";
  if (lower.endsWith(".sql")) return "sql";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
  if (lower.endsWith(".env")) return "plaintext";

  return "plaintext";
}
