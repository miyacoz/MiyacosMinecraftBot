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

if (!config.TOKEN) {
  throw new Error('No token found!')
}

if (!config.CLIENT_ID) {
  throw new Error('No client id found!')
}

if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Incomplete AWS credentials!')
}

if (!config.EC2_INSTANCE_KEY_NAME) {
  throw new Error('EC2 instance key name not found!')
}

// TODO: remove as
export default config as DotenvParseOutput
