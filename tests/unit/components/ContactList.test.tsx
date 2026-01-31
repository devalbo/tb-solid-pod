import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import ContactList from '../../../src/components/ContactList'
import { renderWithProviders } from '../../helpers/render-with-providers'
import { createTestStoreWithContacts } from '../../helpers/store-factory'

describe('ContactList', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onCreate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty state', () => {
    it('shows empty message when no contacts', () => {
      const { testStore: _testStore } = renderWithProviders(
        <ContactList store={null as unknown as typeof _testStore.store} {...defaultProps} />
      )

      expect(screen.getByText('No contacts yet.')).toBeInTheDocument()
    })

    it('shows hint text in empty state', () => {
      const { testStore: _testStore } = renderWithProviders(
        <ContactList store={null as unknown as typeof _testStore.store} {...defaultProps} />
      )

      expect(screen.getByText('Add contacts to build your address book.')).toBeInTheDocument()
    })
  })

  describe('With contacts', () => {
    it('displays contact names', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    })

    it('displays contact emails', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      // Email should have mailto: stripped
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('distinguishes people from agents with icons', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      // Check for person icon (👤) and agent icon (🤖)
      const items = screen.getAllByText('👤')
      expect(items.length).toBe(2) // Two people

      const agentItems = screen.getAllByText('🤖')
      expect(agentItems.length).toBe(1) // One agent
    })
  })

  describe('Selection', () => {
    it('calls onSelect when clicking a contact', () => {
      const { store, indexes, contactIds } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      fireEvent.click(screen.getByText('Alice Smith'))

      expect(defaultProps.onSelect).toHaveBeenCalledWith(contactIds[0])
    })

    it('highlights selected contact', () => {
      const { store, indexes, contactIds } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} selectedId={contactIds[0]} />,
        { providerOptions: { store, indexes } }
      )

      // The selected item should have a different background
      const aliceRow = screen.getByText('Alice Smith').closest('div[style*="cursor"]')
      expect(aliceRow).toHaveStyle({ background: '#f0f7ff' })
    })
  })

  describe('Actions', () => {
    it('calls onCreate when clicking Add Contact button', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      fireEvent.click(screen.getByText('+ Add Contact'))

      expect(defaultProps.onCreate).toHaveBeenCalled()
    })

    it('calls onEdit when clicking Edit button', () => {
      const { store, indexes, contactIds } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      // Get all Edit buttons and click the first one
      const editButtons = screen.getAllByTitle('Edit contact')
      fireEvent.click(editButtons[0])

      expect(defaultProps.onEdit).toHaveBeenCalledWith(contactIds[0])
    })

    it('calls onDelete after confirmation when clicking Delete button', () => {
      const { store, indexes, contactIds } = createTestStoreWithContacts()

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      const deleteButtons = screen.getAllByTitle('Delete contact')
      fireEvent.click(deleteButtons[0])

      expect(window.confirm).toHaveBeenCalled()
      expect(defaultProps.onDelete).toHaveBeenCalledWith(contactIds[0])
    })

    it('does not call onDelete if confirmation is cancelled', () => {
      const { store, indexes } = createTestStoreWithContacts()

      // Mock window.confirm to return false
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      const deleteButtons = screen.getAllByTitle('Delete contact')
      fireEvent.click(deleteButtons[0])

      expect(defaultProps.onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Search', () => {
    it('filters contacts by name', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      fireEvent.change(searchInput, { target: { value: 'alice' } })

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument()
    })

    it('filters contacts by email', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      fireEvent.change(searchInput, { target: { value: 'bob@' } })

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    })

    it('shows message when no contacts match search', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText('No contacts match your search.')).toBeInTheDocument()
    })
  })

  describe('Filter tabs', () => {
    it('shows all contacts by default', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('filters to show only people', async () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      // Click the People filter button
      const peopleButton = screen.getByRole('button', { name: 'People' })
      fireEvent.click(peopleButton)

      // People should be visible
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
      // Agent should not be visible (check in list items)
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
    })

    it('filters to show only agents', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      // Click the Agents filter button
      const agentsButton = screen.getByRole('button', { name: 'Agents' })
      fireEvent.click(agentsButton)

      // People should not be visible
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument()
      // Agent should be visible
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('returns to all contacts when clicking All', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      fireEvent.click(screen.getByText('People'))
      fireEvent.click(screen.getByText('All'))

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })
  })

  describe('Header', () => {
    it('displays Contacts title', () => {
      const { store, indexes } = createTestStoreWithContacts()

      renderWithProviders(
        <ContactList store={store} {...defaultProps} />,
        { providerOptions: { store, indexes } }
      )

      expect(screen.getByText('Contacts')).toBeInTheDocument()
    })
  })
})
