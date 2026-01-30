import type { Meta, StoryObj } from '@storybook/react-vite'
import { useStore } from 'tinybase/ui-react'
import { DCTERMS, FOAF } from '@inrupt/vocab-common-rdf'
import FileMetadataPanel from './FileMetadataPanel'
import { SCHEMA } from '../schemas/file'

const meta: Meta<typeof FileMetadataPanel> = {
  title: 'Components/FileMetadataPanel',
  component: FileMetadataPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    url: {
      control: 'text',
      description: 'URL of the resource to display metadata for',
    },
  },
  args: {
    url: 'https://pod.example.com/files/document.txt',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function FileMetadataPanelWithStore(
  props: Omit<React.ComponentProps<typeof FileMetadataPanel>, 'store'>
) {
  const store = useStore()!
  return <FileMetadataPanel store={store} {...props} />
}

export const TextFile: Story = {
  render: (args) => <FileMetadataPanelWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/document.txt': {
            type: 'file',
            contentType: 'text/plain',
            body: 'Hello, this is a sample text file content for testing purposes.',
            updated: '2024-01-15T10:30:00Z',
            [DCTERMS.title]: 'My Document',
            [DCTERMS.description]: 'A sample text document for testing',
            [DCTERMS.created]: '2024-01-10T08:00:00Z',
            [DCTERMS.modified]: '2024-01-15T10:30:00Z',
            [SCHEMA.author]: JSON.stringify({ '@id': 'persona-1' }),
          },
        },
        personas: {
          'persona-1': {
            '@id': 'https://pod.example.com/profiles/me#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'John Doe',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const ImageFile: Story = {
  render: (args) => (
    <FileMetadataPanelWithStore
      {...args}
      url="https://pod.example.com/files/photo.jpg"
    />
  ),
  args: {
    url: 'https://pod.example.com/files/photo.jpg',
  },
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/photo.jpg': {
            type: 'file',
            contentType: 'image/jpeg',
            body: 'x'.repeat(1024 * 500), // Simulate 500KB
            updated: '2024-01-20T14:45:00Z',
            [DCTERMS.title]: 'Vacation Photo',
            [DCTERMS.description]: 'Beach sunset from our summer trip',
            [DCTERMS.created]: '2024-01-18T16:00:00Z',
            'https://schema.org/width': 1920,
            'https://schema.org/height': 1080,
            [SCHEMA.contentLocation]: 'Hawaii, USA',
          },
        },
        personas: {},
      })

      return { store, indexes }
    })(),
  },
}

export const NoMetadata: Story = {
  render: (args) => (
    <FileMetadataPanelWithStore
      {...args}
      url="https://pod.example.com/files/raw-file.bin"
    />
  ),
  args: {
    url: 'https://pod.example.com/files/raw-file.bin',
  },
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/raw-file.bin': {
            type: 'file',
            contentType: 'application/octet-stream',
            body: 'x'.repeat(2048),
            updated: '2024-01-22T09:00:00Z',
          },
        },
        personas: {},
      })

      return { store, indexes }
    })(),
  },
}

export const LargeFile: Story = {
  render: (args) => (
    <FileMetadataPanelWithStore
      {...args}
      url="https://pod.example.com/files/video.mp4"
    />
  ),
  args: {
    url: 'https://pod.example.com/files/video.mp4',
  },
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/video.mp4': {
            type: 'file',
            contentType: 'video/mp4',
            body: 'x'.repeat(1024 * 1024 * 5), // Simulate 5MB
            updated: '2024-01-25T11:30:00Z',
            [DCTERMS.title]: 'Project Demo Video',
            [DCTERMS.description]: 'Walkthrough of the new features',
            [DCTERMS.created]: '2024-01-24T15:00:00Z',
            [DCTERMS.modified]: '2024-01-25T11:30:00Z',
          },
        },
        personas: {},
      })

      return { store, indexes }
    })(),
  },
}

export const WithMultipleAuthors: Story = {
  render: (args) => <FileMetadataPanelWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/document.txt': {
            type: 'file',
            contentType: 'text/markdown',
            body: '# Meeting Notes\n\nDiscussion about project timeline.',
            updated: '2024-01-28T16:00:00Z',
            [DCTERMS.title]: 'Meeting Notes',
            [SCHEMA.author]: JSON.stringify({ '@id': 'persona-2' }),
          },
        },
        personas: {
          'persona-1': {
            '@id': 'https://pod.example.com/profiles/work#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'Work Profile',
          },
          'persona-2': {
            '@id': 'https://pod.example.com/profiles/personal#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'Personal Profile',
          },
          'persona-3': {
            '@id': 'https://pod.example.com/profiles/anon#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'Anonymous',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const JsonFile: Story = {
  render: (args) => (
    <FileMetadataPanelWithStore
      {...args}
      url="https://pod.example.com/files/config.json"
    />
  ),
  args: {
    url: 'https://pod.example.com/files/config.json',
  },
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        resources: {
          'https://pod.example.com/files/config.json': {
            type: 'file',
            contentType: 'application/json',
            body: JSON.stringify({ setting: 'value', enabled: true }, null, 2),
            updated: '2024-01-30T08:15:00Z',
            [DCTERMS.title]: 'Application Config',
            [DCTERMS.description]: 'Configuration settings for the app',
          },
        },
        personas: {},
      })

      return { store, indexes }
    })(),
  },
}
