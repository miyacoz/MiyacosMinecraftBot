import {
  config as DotenvConfig,
  DotenvConfigOutput,
  DotenvParseOutput,
} from 'dotenv'

const dotenvResult: DotenvConfigOutput = DotenvConfig()
if (dotenvResult.error) {
  throw dotenvResult.error
}

const config: DotenvParseOutput | undefined = dotenvResult.parsed

if (!config) {
  throw new Error('no config found')
}

// TODO: remove as
export default config as DotenvParseOutput
