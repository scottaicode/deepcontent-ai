"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue: string
  className?: string
  children: React.ReactNode
}

const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  className,
  children,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue)
  
  // Filter children to get only TabsList and TabsContent
  const tabsList = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === TabsList
  )
  
  const tabsContent = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === TabsContent
  )
  
  // Create context to manage active tab state
  const tabsContext = {
    activeTab,
    setActiveTab
  }
  
  return (
    <div className={cn("", className)} {...props}>
      <TabsContext.Provider value={tabsContext}>
        {tabsList}
        {tabsContent}
      </TabsContext.Provider>
    </div>
  )
}

// Create context
type TabsContextType = {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

// Hook to use the tabs context
const useTabsContext = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs compound components must be used within Tabs component")
  }
  return context
}

// TabsList component
interface TabsListProps {
  className?: string
  children: React.ReactNode
}

const TabsList: React.FC<TabsListProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// TabsTrigger component
interface TabsTriggerProps {
  value: string
  className?: string
  children: React.ReactNode
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { activeTab, setActiveTab } = useTabsContext()
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
        "focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        activeTab === value ? 
          "bg-white text-slate-950 shadow-sm" : 
          "hover:bg-slate-50",
        className
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  )
}

// TabsContent component
interface TabsContentProps {
  value: string
  className?: string
  children: React.ReactNode
}

const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { activeTab } = useTabsContext()
  
  if (activeTab !== value) {
    return null
  }
  
  return (
    <div
      className={cn("mt-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent } 