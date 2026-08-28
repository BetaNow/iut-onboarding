import type { ModuleDefinition, ModuleSettingValue, ResolvedModule } from '../../shared/modules/catalogue'
import { defaultSettings, MODULE_CATALOGUE } from '../../shared/modules/catalogue'
import { Department } from '../../shared/types/department'

/** A stored row, narrowed to what resolving a rotation actually reads. */
export interface ModuleConfigRow {
  moduleId: string
  department: Department
  position: number
  durationMs: number
  isEnabled: boolean
  settings: Record<string, unknown>
  updatedAt: Date
}

export type { ResolvedModule }

// Which department scopes a screen reads. A shared screen's own department is
// `both`, so it reads that list once instead of twice under two names.
export function relevantDepartments(department: Department): Department[] {
  return department === Department.BOTH
    ? [Department.BOTH]
    : [Department.BOTH, department]
}

// Stored settings, less anything that could not be a prop. Undeclared keys are
// kept; only non-primitives are dropped, since this object is spread onto a
// component.
function usableSettings(stored: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(stored).filter(([, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    ),
  ) as Record<string, ModuleSettingValue>
}

// The rotation a screen of this department should play. Shared modules first,
// then the department's own, so each admin tab renumbers only its own rows.
export function resolveRotation(
  rows: ModuleConfigRow[],
  department: Department,
  catalogue: ModuleDefinition[] = MODULE_CATALOGUE,
): ResolvedModule[] {
  const scope = (wanted: Department) =>
    rows
      .filter(row => row.department === wanted && row.isEnabled)
      .sort((a, b) => a.position - b.position)

  const ordered = relevantDepartments(department).flatMap(scope)

  return ordered.flatMap((row) => {
    const definition = catalogue.find(module => module.id === row.moduleId)

    // A row naming a module that has since left the catalogue has no component
    // to mount. Skipping it keeps a stale row from stalling the rotation.
    if (!definition) {
      return []
    }

    return [{
      moduleId: row.moduleId,
      label: definition.label,
      icon: definition.icon,
      durationMs: row.durationMs,
      usesDepartment: definition.usesDepartment ?? false,
      settings: { ...defaultSettings(definition), ...usableSettings(row.settings) },
    }]
  })
}

// A stamp that changes whenever the rotation does, so a panel can tell in one
// cheap call whether to refetch. The row count is needed because deleting a row
// can leave max(updatedAt) unchanged.
export function configVersion(rows: Pick<ModuleConfigRow, 'updatedAt'>[]): string {
  if (!rows.length) {
    return '0-0'
  }

  const newest = Math.max(...rows.map(row => row.updatedAt.getTime()))

  return `${newest}-${rows.length}`
}
