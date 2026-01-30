import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import { VCARD } from '@inrupt/vocab-common-rdf'
import ContactList from './ContactList'

const meta: Meta<typeof ContactList> = {
  title: 'Components/ContactList',
  component: ContactList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedId: {
      control: 'text',
      description: 'ID of the currently selected contact',
    },
  },
  args: {
    onSelect: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onCreate: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function ContactListWithStore(props: Omit<React.ComponentProps<typeof ContactList>, 'store'>) {
  const store = useStore()!
  return <ContactList store={store} {...props} />
}

export const Default: Story = {
  render: (args) => <ContactListWithStore {...args} />,
}

export const WithSelection: Story = {
  render: (args) => <ContactListWithStore {...args} selectedId="contact-1" />,
  args: {
    selectedId: 'contact-1',
  },
}

export const Empty: Story = {
  render: (args) => <ContactListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      store.setTables({ contacts: {} })
      return { store, indexes: createIndexes(store) }
    })(),
  },
}

export const ManyContacts: Story = {
  render: (args) => <ContactListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        contacts: Object.fromEntries(
          Array.from({ length: 20 }, (_, i) => [
            `contact-${i}`,
            {
              '@id': `https://pod.example.com/contacts/${i}#`,
              '@type': VCARD.Individual,
              [VCARD.fn]: `Contact ${i + 1}`,
              [VCARD.hasEmail]: `mailto:contact${i + 1}@example.com`,
              [VCARD.hasOrganizationName]: i % 3 === 0 ? 'Acme Corp' : undefined,
            },
          ])
        ),
      })

      return { store, indexes }
    })(),
  },
}

export const OnlyAgents: Story = {
  render: (args) => <ContactListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        contacts: {
          'agent-1': {
            '@id': 'https://pod.example.com/contacts/ai-1#',
            '@type': 'https://schema.org/SoftwareApplication',
            [VCARD.fn]: 'ChatGPT Assistant',
            [VCARD.note]: 'General purpose AI assistant',
          },
          'agent-2': {
            '@id': 'https://pod.example.com/contacts/ai-2#',
            '@type': 'https://schema.org/SoftwareApplication',
            [VCARD.fn]: 'Code Helper Bot',
            [VCARD.note]: 'Helps with coding tasks',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}
