/** 任务中的一个 Gauge 场景 */
export interface TaskScenario {
  /** spec 文件绝对路径 */
  path: string
  /** Gauge 场景标题 */
  heading: string
}

/** 一个可重复运行的任务 */
export interface TestTask {
  id: string
  name: string
  scenarios: TaskScenario[]
  createdAt: string
  updatedAt: string
}

export interface TasksDocument {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  tasks: TestTask[]
}

export interface TasksLoadOutcome {
  error?: string
  empty?: boolean
  document?: TasksDocument
}

export interface TasksSaveOutcome {
  error?: string
  saved?: {
    filePath: string
    updatedAt: string
  }
}

/** 一次 Gauge 执行的结果 */
export interface TaskRunOutcome {
  error?: string
  command: string
  stdout: string
  stderr: string
  exitCode?: number
}
