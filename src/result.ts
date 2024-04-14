export enum ResultType {
  success,
  failure
}

export type ResultSuccess<T = void> = {
  type: ResultType.success
  value: T
}

export type ResultFailure<E = Error> = {
  type: ResultType.failure
  error: E
}

/**
 *  * Type reflecting the return of an operation
 *   * that can either succeed (with an optional value)
 *    * or fail
 *     */
export type Result<T = void, E = Error> = ResultSuccess<T> | ResultFailure<E>

/*
 *  * Object with static methods to help create Result cases
 *   */
export const Result = {
  success: <T = void>(val: T): ResultSuccess<T> => ({
    type: ResultType.success as const,
    value: val
  }),
  isSuccess: <T = void, E = Error>(
    result: Result<T, E>
  ): result is ResultSuccess<T> => result.type === ResultType.success,
  failure: <E = Error>(error: E): ResultFailure<E> => ({
    type: ResultType.failure as const,
    error
  }),
  isFailure: <E = Error>(result: Result<any, E>): result is ResultFailure<E> =>
    result.type === ResultType.failure
}
