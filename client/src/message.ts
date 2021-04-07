/**
 * The default message object model
 * A message is what's stored in the queue collection, and contains basic message metadata
 * as well as the payload object
 */
export class Message {
  public _id: string | null
  public priority: number
  public payload: any
  public status: string
  public enqueueTime: number
  public dequeueTime: number
  public acknowledgedTime: number
  public errorTime: number
  public retries: number

  constructor (payload: any, priority = 1, enqueueTime = 0, _id = null, status = 'queued', dequeueTime = 0, awknowledgedTime = 0, errorTime = 0, retries = 0) {
    this._id = _id
    this.priority = priority
    this.payload = payload
    this.status = status
    this.dequeueTime = dequeueTime
    this.acknowledgedTime = awknowledgedTime
    this.errorTime = errorTime
    this.retries = retries
    this.enqueueTime = enqueueTime === 0 ? new Date().getTime() : enqueueTime
  }
}
