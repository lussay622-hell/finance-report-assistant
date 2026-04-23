window.CONFIG = {
  AI_PROVIDER: "deepseek",
  ANTHROPIC_API_KEY: "your-key-here",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
  /** 为 true 时走同域 /api/deepseek（公网在 Vercel 配置 DEEPSEEK_API_KEY，禁止把真 Key 写进仓库） */
  DEEPSEEK_USE_SERVER_PROXY: true,
  /** 仅本地直连调试：设为 true 才允许在浏览器用 config/localStorage/prompt 填 Key（公网请保持 false） */
  DEEPSEEK_ALLOW_BROWSER_KEY: false,
  DEEPSEEK_API_KEY: "your-key-here",
  DEEPSEEK_MODEL: "deepseek-chat",
  DEEPSEEK_BASE_URL: "https://api.deepseek.com/v1/chat/completions"
};
