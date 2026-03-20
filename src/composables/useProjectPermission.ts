import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import type { PermissionAction, PermissionModuleId } from '@/constants/permission-modules'
import { permissionModuleForProjectPath } from '@/constants/permission-modules'
import { useProjectPermissionsStore } from '@/stores/projectPermissions'
import { useAuthStore } from '@/stores/auth'

/**
 * 專案內權限（對齊後端 my-permissions；platform_admin／tenant_admin 視為全開）
 */
export function useProjectPermission(projectId: MaybeRefOrGetter<string | undefined | null>) {
  const store = useProjectPermissionsStore()
  const auth = useAuthStore()

  const pid = computed(() => toValue(projectId) ?? null)

  function can(module: PermissionModuleId, action: PermissionAction): boolean {
    const id = pid.value
    if (!id) return false
    if (auth.isPlatformAdmin || auth.isTenantAdmin) return true
    return store.can(id, module, action)
  }

  function canReadPath(pathSuffix: string): boolean {
    const mod = permissionModuleForProjectPath(pathSuffix)
    return can(mod, 'read')
  }

  return { can, canReadPath, pid }
}
