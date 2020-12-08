import {
  EC2,
  Credentials,
} from 'aws-sdk'

import Config from './Config'

type TState = 'pending' | 'running' | 'shutting-down' | 'terminated' | 'stopping' | 'stopped' | ''

const credentials = new Credentials({
  accessKeyId: Config.AWS_ACCESS_KEY_ID,
  secretAccessKey: Config.AWS_SECRET_ACCESS_KEY,
})

const client = new EC2({
  credentials,
  region: 'ap-northeast-1',
  apiVersion: '2016-11-15',
  sslEnabled: true,
});

class Ec2Instance {
  private _client: EC2
  private _id: string = ''
  private _name: string
  private _type: string = ''
  private _state: TState = ''
  private _stateReason: string = ''
  private _launchedAt: Date = new Date(0)
  private _searchFilter: object

  public constructor(client: EC2, keyName: string) {
    this._client = client
    this._name = keyName
    this._searchFilter = {
      Filters: [
        {
          Name: 'key-name',
          Values: [
            this.name,
          ],
        },
      ],
    }
  }

  public setData(data: EC2.Instance) {
    this._id = data.InstanceId || ''
    this._name = data.KeyName || ''
    this._type = data.InstanceType || ''
    this._state = (data.State?.Name as TState) || ''
    this._stateReason = data.StateReason?.Code || ''
    this._launchedAt = data.LaunchTime || new Date(0)
  }

  public get id(): string {
    return this._id
  }

  public get name(): string {
    return this._name
  }

  public get type(): string {
    return this._type
  }

  public get state(): TState {
    return this._state
  }

  public get stateReason(): string {
    return this._stateReason
  }

  public get launchedAt(): Date {
    return this._launchedAt
  }

  public async getInfo(): Promise<this> {
    try {
      const result = await this._client.describeInstances(this._searchFilter).promise()

      const i = result.Reservations?.[0]?.Instances?.[0] || null

      if (!i) {
        throw new Error('No instance found!')
      }

      this.setData(i)

      return this
    } catch (e) {
      console.warn(e)
      throw new Error(e)
    }
  }
}

const ec2Instance = new Ec2Instance(client, Config.EC2_INSTANCE_KEY_NAME)

export default ec2Instance
