/* eslint-disable @typescript-eslint/no-explicit-any */
// index.ts
import type { interfaces } from "inversify";
import { Container } from "inversify"

// -------------------------------------------------
// IoC Core (sync only)
// -------------------------------------------------
type InjectFn = <T>(id: interfaces.ServiceIdentifier<T>) => T

interface ModuleParams {
  imports?: Container[]
  providers?: (c: Container, inject: InjectFn) => void
  exports?: interfaces.ServiceIdentifier<any>[]
}

export function Module(data: ModuleParams): Container {
  const container = new Container()

  const inject: InjectFn = <T>(id: interfaces.ServiceIdentifier<T>): T => {
    for (const module of data.imports ?? []) {
      const moduleExports = (module as any).exports ?? []
      if (moduleExports.includes(id)) {
        return module.get<T>(id)
      }
    }
    throw new Error(`Dependency '${id.toString()}' not found or not exported.`)
  }

  data.providers?.(container, inject)
  ;(container as any).exports = data.exports ?? []

  return container
}

export function AppModule(modules: Container[]): Container {
  const root = new Container()
  for (const m of modules) {
    for (const id of (m as any).exports ?? []) {
      root.bind(id).toDynamicValue(() => m.get(id))
    }
  }
  return root
}

export function use<T>(
  id:  abstract new (...args: any[]) => T,
  module: Container
): T {
  return module.get<T>(id as any)
}


// -------------------------------------------------
// Example Services
// -------------------------------------------------
class Database {
  private connected = false

  connect() {
    console.log("[Database] Connecting...")
    this.connected = true
    console.log("[Database] Connected.")
  }

  isConnected() {
    return this.connected
  }
}

class LoggerService {
  log(msg: string) {
    console.log("[Logger]", msg)
  }
}

class PatientService {
  constructor(private db: Database, private logger: LoggerService) {}

  getPatient(id: string) {
    if (!this.db.isConnected()) {
      throw new Error("Database not connected")
    }
    this.logger.log("Fetching patient with id: " + id)
    return { id, name: "John Doe" }
  }
}

// -------------------------------------------------
// Modules
// -------------------------------------------------
const DatabaseModule = Module({
  providers: (c) => {
    c.bind(Database).toDynamicValue(() => {
      const db = new Database()
      db.connect()
      return db
    })
  },
  exports: [Database],
})

const LoggerModule = Module({
  providers: (c) => {
    c.bind(LoggerService).toDynamicValue(() => new LoggerService())
  },
  exports: [LoggerService],
})

const PatientModule = Module({
  imports: [DatabaseModule, LoggerModule],
  providers: (c, inject) => {
    c.bind(PatientService).toDynamicValue(() => {
      const db = inject(Database)
      const logger = inject(LoggerService)
      return new PatientService(db, logger)
    })
  },
  exports: [PatientService],
})
