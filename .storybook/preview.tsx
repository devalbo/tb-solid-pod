import React from 'react'
import type { Preview, Decorator } from '@storybook/react-vite'
import { createStore, createIndexes, Store, Indexes } from 'tinybase'
import { Provider } from 'tinybase/ui-react'
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf'

// Create sample store with test data for stories
function createSampleStore(): { store: Store; indexes: Indexes } {
  const store = createStore()
  const indexes = createIndexes(store)

  // Initialize tables
  store.setTables({
    resources: {},
    personas: {},
    contacts: {},
    groups: {},
    typeIndexes: {},
  })

  // Add sample personas
  store.setRow('personas', 'persona-1', {
    '@id': 'https://pod.example.com/profiles/alice#me',
    '@type': FOAF.Person,
    [FOAF.name]: 'Alice Smith',
    [FOAF.nick]: 'alice',
    [VCARD.hasEmail]: 'mailto:alice@example.com',
  })

  store.setRow('personas', 'persona-2', {
    '@id': 'https://pod.example.com/profiles/bob#me',
    '@type': FOAF.Person,
    [FOAF.name]: 'Bob Developer',
    [VCARD.hasEmail]: 'mailto:bob@work.com',
  })

  // Add sample contacts
  store.setRow('contacts', 'contact-1', {
    '@id': 'https://pod.example.com/contacts/john#',
    '@type': VCARD.Individual,
    [VCARD.fn]: 'John Doe',
    [VCARD.nickname]: 'johnny',
    [VCARD.hasEmail]: 'mailto:john@example.com',
    [VCARD.hasOrganizationName]: 'Acme Corp',
  })

  store.setRow('contacts', 'contact-2', {
    '@id': 'https://pod.example.com/contacts/jane#',
    '@type': VCARD.Individual,
    [VCARD.fn]: 'Jane Smith',
    [VCARD.hasEmail]: 'mailto:jane@example.com',
  })

  store.setRow('contacts', 'contact-3', {
    '@id': 'https://pod.example.com/contacts/ai-bot#',
    '@type': 'https://schema.org/SoftwareApplication',
    [VCARD.fn]: 'AI Assistant',
    [VCARD.note]: 'A helpful AI chatbot',
  })

  // Add sample groups
  store.setRow('groups', 'group-1', {
    '@id': 'https://pod.example.com/groups/acme#org',
    '@type': 'http://www.w3.org/ns/org#Organization',
    [VCARD.fn]: 'Acme Corporation',
    'http://purl.org/dc/terms/description': 'A sample organization',
  })

  store.setRow('groups', 'group-2', {
    '@id': 'https://pod.example.com/groups/team-alpha#team',
    '@type': VCARD.Group,
    [VCARD.fn]: 'Team Alpha',
    'http://purl.org/dc/terms/description': 'The best team',
  })

  // Set default persona
  store.setValue('defaultPersonaId', 'persona-1')

  return { store, indexes }
}

// Global decorator that wraps all stories in TinyBase Provider
const withTinyBase: Decorator = (Story, context) => {
  // Allow stories to provide their own store via parameters
  const customStore = context.parameters.store
  const { store, indexes } = customStore || createSampleStore()

  return (
    <Provider store={store} indexes={indexes}>
      <Story />
    </Provider>
  )
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Default background
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
  decorators: [withTinyBase],
}

export default preview
