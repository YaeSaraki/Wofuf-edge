export class Result<T> {
  public isSuccess: boolean
  public isFailure: boolean
  public error: T | string
  private _value: T

  public constructor(isSuccess: boolean, error?: T | string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error')
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message')
    }

    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this.error = error as T
    this._value = value as T

    Object.freeze(this)
  }

  public static success<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value)
  }

  public static failure<U>(error: string): Result<U> {
    // A failure without a message is a failure nobody can act on: it renders as an empty
    // error and, before this guard, threw `InvalidOperation` on the way in. An empty message is
    // a symptom of a broken response, not a message the user can use.
    return new Result<U>(false, error || '请求失败')
  }

  public static combine(results: Result<never>[]): Result<never> {
    for (const result of results) {
      if (result.isFailure) return result
    }
    return Result.success()
  }

  public getValue(): T {
    if (!this.isSuccess) {
      console.log(this.error)
      throw new Error("Can't get the value of an error result. Use 'errorValue' instead.")
    }

    return this._value
  }

  public errorValue(): T {
    return this.error as T
  }
}
