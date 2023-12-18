export type PluginPermissionType = 'currentuser' | 'activeusers' | 'fileusers' | 'payments' | 'teamlibrary'

export type EditorType = 'figma' | 'figjam' | 'dev'

export type CodeLanguage = {
  label: string
  value: string
}

export type CodegenPreference = {
  itemType: 'unit'
  defaultScaleFactor: number
  scaledUnit: string
  default?: boolean
  includedLanguages?: string[]
} | {
  itemType: 'select'
  propertyName: string
  label: string
  options: {
    label: string
    value: string
    isDefault?: boolean
  }[]
  includedLanguages?: string[]
} | {
  itemType: 'action'
  propertyName: string
  label: string
  includedLanguages?: string[]
}

export type PluginCapability = 'textreview' | 'codegen' | 'inspect' | 'vscode'

export type NetworkAccess = {
  allowedDomains: string[]
  reasoning?: string
  devAllowedDomains?: string[]
}
