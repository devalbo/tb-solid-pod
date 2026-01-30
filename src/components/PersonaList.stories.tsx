import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf'
import PersonaList from './PersonaList'

const meta: Meta<typeof PersonaList> = {
  title: 'Components/PersonaList',
  component: PersonaList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedId: {
      control: 'text',
      description: 'ID of the currently selected persona',
    },
  },
  args: {
    onSelect: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onSetDefault: fn(),
    onCreate: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function PersonaListWithStore(props: Omit<React.ComponentProps<typeof PersonaList>, 'store'>) {
  const store = useStore()!
  return <PersonaList store={store} {...props} />
}

export const Default: Story = {
  render: (args) => <PersonaListWithStore {...args} />,
}

export const WithSelection: Story = {
  render: (args) => <PersonaListWithStore {...args} selectedId="persona-1" />,
  args: {
    selectedId: 'persona-1',
  },
}

export const Empty: Story = {
  render: (args) => <PersonaListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      store.setTables({ personas: {} })
      return { store, indexes: createIndexes(store) }
    })(),
  },
}

export const SinglePersona: Story = {
  render: (args) => <PersonaListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        personas: {
          'persona-1': {
            '@id': 'https://pod.example.com/profiles/me#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'My Primary Identity',
            [FOAF.nick]: 'me',
            [VCARD.hasEmail]: 'mailto:me@example.com',
          },
        },
      })

      store.setValue('defaultPersonaId', 'persona-1')

      return { store, indexes }
    })(),
  },
}

export const ManyPersonas: Story = {
  render: (args) => <PersonaListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      const personas = [
        { name: 'Personal', nick: 'me', email: 'personal@me.com' },
        { name: 'Work Identity', nick: 'work', email: 'work@company.com' },
        { name: 'Gaming Profile', nick: 'gamer123', email: 'gamer@games.com' },
        { name: 'Developer', nick: 'dev', email: 'dev@github.io' },
        { name: 'Anonymous', nick: 'anon', email: null },
      ]

      store.setTables({
        personas: Object.fromEntries(
          personas.map((p, i) => [
            `persona-${i}`,
            {
              '@id': `https://pod.example.com/profiles/${p.nick}#me`,
              '@type': FOAF.Person,
              [FOAF.name]: p.name,
              [FOAF.nick]: p.nick,
              ...(p.email && { [VCARD.hasEmail]: `mailto:${p.email}` }),
            },
          ])
        ),
      })

      store.setValue('defaultPersonaId', 'persona-0')

      return { store, indexes }
    })(),
  },
}

export const NoDefault: Story = {
  render: (args) => <PersonaListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        personas: {
          'persona-1': {
            '@id': 'https://pod.example.com/profiles/alice#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'Alice',
            [VCARD.hasEmail]: 'mailto:alice@example.com',
          },
          'persona-2': {
            '@id': 'https://pod.example.com/profiles/bob#me',
            '@type': FOAF.Person,
            [FOAF.name]: 'Bob',
          },
        },
      })

      // No default set

      return { store, indexes }
    })(),
  },
}
