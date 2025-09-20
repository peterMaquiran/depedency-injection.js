/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container } from "inversify"

// -----------------------------
// Types
// -----------------------------
type InjectFn = <T>(id: any) => T | Promise<T>

interface ModuleParams {
  imports?: Container[]
  providers?: (c: Container, inject: InjectFn) => void | Promise<void>
  exports?: any[]
}

type AsyncContainer = Container & { ready?: Promise<void> }

// -----------------------------
// Module Factory (sync or async)
// -----------------------------
export function Module(data: ModuleParams, parent?: Container): AsyncContainer {
  const container: AsyncContainer =
    parent ?? new Container()

  const inject: InjectFn = <T>(id: any) => {
    for (const module of data.imports ?? []) {
      const moduleExports = (module as any).exports ?? []
      if (moduleExports.includes(id)) {
        return module.get(id)
      }
    }
    throw new Error(`Dependency '${id.toString()}' not found or not exported.`)
  }

  // Allow async provider setup
  const maybePromise = data.providers?.(container, inject)
  container.ready = maybePromise instanceof Promise ? maybePromise : Promise.resolve()

  ;(container as any).exports = data.exports ?? []

  return container
}

// -----------------------------
// use() helper
// -----------------------------
export async function use<T>(
  id: any,
  module: AsyncContainer
): Promise<T> {
  if (module.ready) await module.ready
  return module.get<T>(id)
}

// -----------------------------
// AppModule (root bootstrapper)
// -----------------------------
export function AppModule(modules: AsyncContainer[]): AsyncContainer {
  const root: AsyncContainer = new Container()
  ;(root as any).exports = []

  // Merge exports
  root.ready = Promise.all(modules.map(m => m.ready ?? Promise.resolve())).then(() => {
    for (const m of modules) {
      const exports = (m as any).exports ?? []
      for (const id of exports) {
        if (!root.isBound(id)) {
          root.bind(id).toDynamicValue(() => m.get(id)).inSingletonScope()
          ;(root as any).exports.push(id)
        }
      }
    }
  })

  return root
}
