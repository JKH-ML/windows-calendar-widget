'use client'

import React, { createContext, useContext } from 'react'

type WidgetVisibilityContextType = {
  isOpen: boolean
  openWidget: () => void
  closeWidget: () => void
}

const WidgetVisibilityContext = createContext<
  WidgetVisibilityContextType | undefined
>(undefined)

export function WidgetVisibilityProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: WidgetVisibilityContextType
}) {
  return (
    <WidgetVisibilityContext.Provider value={value}>
      {children}
    </WidgetVisibilityContext.Provider>
  )
}

export function useWidgetVisibility() {
  const context = useContext(WidgetVisibilityContext)
  if (!context) {
    throw new Error(
      'useWidgetVisibility must be used within a WidgetVisibilityProvider'
    )
  }
  return context
}
