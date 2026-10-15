function configuredValue(settings, key, fallback) {
  const inspected = settings.inspect(key)
  return inspected?.globalValue ?? inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? fallback
}

module.exports = { configuredValue }
