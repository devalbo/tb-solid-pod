/**
 * React Testing Library wrapper with TinyBase Provider
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { Provider } from 'tinybase/ui-react'
import { Store, Indexes } from 'tinybase'
import { createTestStore, TestStore } from './store-factory'

interface WrapperProps {
  children: React.ReactNode
}

interface ProviderOptions {
  store?: Store
  indexes?: Indexes
}

/**
 * Create a wrapper component with TinyBase Provider
 */
function createWrapper(testStore: TestStore) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <Provider store={testStore.store} indexes={testStore.indexes}>
        {children}
      </Provider>
    )
  }
}

/**
 * Custom render function that wraps components with TinyBase Provider
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { providerOptions?: ProviderOptions }
): RenderResult & { testStore: TestStore } {
  const testStore = options?.providerOptions?.store
    ? { store: options.providerOptions.store, indexes: options.providerOptions.indexes! }
    : createTestStore()

  const Wrapper = createWrapper(testStore)

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    testStore,
  }
}

/**
 * Re-export everything from @testing-library/react for convenience
 */
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
