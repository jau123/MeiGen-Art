/**
 * `meigen init <platform>` — one-command MCP server setup for any AI coding tool
 *
 * Writes the correct MCP config file with the right format and path for each platform.
 * Merges into existing config if one already exists.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

interface PlatformConfig {
  name: string
  configPath: string
  wrapperKey: string
  needsType: boolean
  global?: boolean
}

const PLATFORMS: Record<string, PlatformConfig> = {
  cursor: {
    name: 'Cursor',
    configPath: '.cursor/mcp.json',
    wrapperKey: 'mcpServers',
    needsType: false,
  },
  vscode: {
    name: 'VS Code / GitHub Copilot',
    configPath: '.vscode/mcp.json',
    wrapperKey: 'servers',
    needsType: true,
  },
  windsurf: {
    name: 'Windsurf',
    configPath: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    wrapperKey: 'mcpServers',
    needsType: false,
    global: true,
  },
  roo: {
    name: 'Roo Code',
    configPath: '.roo/mcp.json',
    wrapperKey: 'mcpServers',
    needsType: false,
  },
  claude: {
    name: 'Claude Code',
    configPath: '.mcp.json',
    wrapperKey: 'mcpServers',
    needsType: false,
  },
}

function printUsage(): void {
  console.log('Usage: meigen init <platform>')
  console.log()
  console.log('Supported platforms:')
  for (const [key, config] of Object.entries(PLATFORMS)) {
    console.log(`  ${key.padEnd(10)} ${config.name}`)
  }
  console.log()
  console.log('Examples:')
  console.log('  npx meigen init cursor')
  console.log('  npx meigen init vscode')
  console.log('  npx -y meigen@latest init windsurf')
}

export function init(args: string[]): void {
  const platformKey = args[0]?.toLowerCase()

  if (!platformKey || platformKey === '--help' || platformKey === '-h') {
    printUsage()
    return
  }

  const platform = PLATFORMS[platformKey]
  if (!platform) {
    console.error(`Unknown platform: "${platformKey}"`)
    console.log()
    printUsage()
    process.exit(1)
  }

  const configPath = platform.global
    ? platform.configPath
    : path.resolve(process.cwd(), platform.configPath)

  // Ensure parent directory exists
  const configDir = path.dirname(configPath)
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  // Build server entry
  const serverEntry: Record<string, unknown> = {
    command: 'npx',
    args: ['-y', 'meigen@latest'],
  }
  if (platform.needsType) {
    serverEntry.type = 'stdio'
  }

  // Read existing config or start fresh
  let config: Record<string, unknown> = {}
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8')
      config = JSON.parse(raw)
    } catch {
      // Invalid JSON — start fresh
      config = {}
    }
  }

  // Merge our server entry
  const wrapper = (config[platform.wrapperKey] as Record<string, unknown>) ?? {}
  wrapper.meigen = serverEntry
  config[platform.wrapperKey] = wrapper

  // Write
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

  // Output
  const isNew = !fs.existsSync(configPath) || Object.keys(wrapper).length === 1
  console.log()
  console.log(`  MeiGen MCP server added to ${platform.name}`)
  console.log(`  Config: ${configPath}`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Restart your AI tool to load the new MCP server')
  console.log('  2. Start chatting — free features work out of the box:')
  console.log('     search_gallery, enhance_prompt, get_inspiration')
  console.log()
  console.log('  For image generation, set your API token:')
  console.log('     Get one at https://www.meigen.ai (Settings > API Keys)')
  console.log()
  console.log(`  Then add to your config's env field, or set in shell:`)
  console.log('     export MEIGEN_API_TOKEN=meigen_sk_...')
}
