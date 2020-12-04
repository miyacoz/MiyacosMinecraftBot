import { EC2 } from 'aws-sdk'

export class Ec2Instance {
  private _id: string = ''
  private _name: string = ''
  private _type: string = ''
  private _state: string = ''
  private _stateReason: string = ''
  private _launchedAt: Date = new Date(0)

  public constructor(data?: EC2.Instance) {
    if (data) {
      this.setData(data)
    }
  }

  public setData(data: EC2.Instance) {
    this._id = data.InstanceId || ''
    this._name = data.KeyName || ''
    this._type = data.InstanceType || ''
    this._state = data.State?.Name || ''
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

  public get state(): string {
    return this._state
  }

  public get stateReason(): string {
    return this._stateReason
  }

  public get launchedAt(): Date {
    return this._launchedAt
  }
}
