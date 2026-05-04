export function applyOrganizationScope(query, employee) {
  if (!employee?.organization_id) return query
  return query.eq('organization_id', employee.organization_id)
}

export function addOrganizationScope(record, employee) {
  if (!employee?.organization_id) return record
  return { organization_id: employee.organization_id, ...record }
}

export function hasOrganizationScope(employee) {
  return Boolean(employee?.organization_id)
}
