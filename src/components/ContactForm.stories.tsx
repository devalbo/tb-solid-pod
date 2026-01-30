import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import { VCARD } from '@inrupt/vocab-common-rdf'
import ContactForm from './ContactForm'

const meta: Meta<typeof ContactForm> = {
  title: 'Components/ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    contactId: {
      control: 'text',
      description: 'ID of contact to edit (leave empty to create)',
    },
    baseUrl: {
      control: 'text',
      description: 'Base URL for the pod',
    },
  },
  args: {
    onSave: fn(),
    onCancel: fn(),
    baseUrl: 'https://pod.example.com/',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function ContactFormWithStore(props: Omit<React.ComponentProps<typeof ContactForm>, 'store'>) {
  const store = useStore()!
  return <ContactForm store={store} {...props} />
}

export const CreateNew: Story = {
  render: (args) => <ContactFormWithStore {...args} />,
  args: {
    contactId: undefined,
  },
}

export const EditExisting: Story = {
  render: (args) => <ContactFormWithStore {...args} contactId="contact-1" />,
  args: {
    contactId: 'contact-1',
  },
}

export const CreateAgent: Story = {
  render: (args) => <ContactFormWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      store.setTables({ contacts: {} })
      return { store, indexes: createIndexes(store) }
    })(),
  },
  args: {
    contactId: undefined,
  },
}

export const EditAgent: Story = {
  render: (args) => <ContactFormWithStore {...args} contactId="agent-1" />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        contacts: {
          'agent-1': {
            '@id': 'https://pod.example.com/contacts/ai-bot#',
            '@type': 'https://schema.org/SoftwareApplication',
            [VCARD.fn]: 'AI Assistant',
            [VCARD.note]: 'A helpful AI chatbot',
            'https://schema.org/applicationCategory': 'AI/Chatbot',
          },
        },
      })

      return { store, indexes }
    })(),
  },
  args: {
    contactId: 'agent-1',
  },
}
