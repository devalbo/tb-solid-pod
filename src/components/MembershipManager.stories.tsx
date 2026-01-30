import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import { VCARD } from '@inrupt/vocab-common-rdf'
import MembershipManager from './MembershipManager'
import { ORG } from '../schemas/group'

const meta: Meta<typeof MembershipManager> = {
  title: 'Components/MembershipManager',
  component: MembershipManager,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    groupId: {
      control: 'text',
      description: 'ID of the group to manage members for',
    },
  },
  args: {
    onClose: fn(),
    groupId: 'group-1',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function MembershipManagerWithStore(
  props: Omit<React.ComponentProps<typeof MembershipManager>, 'store'>
) {
  const store = useStore()!
  return <MembershipManager store={store} {...props} />
}

export const WithMembers: Story = {
  render: (args) => <MembershipManagerWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'group-1': {
            '@id': 'https://pod.example.com/groups/team#',
            '@type': ORG.OrganizationalUnit,
            [VCARD.fn]: 'Engineering Team',
            [VCARD.hasMember]: JSON.stringify([
              { '@id': 'contact-1' },
              { '@id': 'contact-2' },
            ]),
          },
        },
        contacts: {
          'contact-1': {
            '@id': 'https://pod.example.com/contacts/alice#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Alice Smith',
            [VCARD.hasEmail]: 'mailto:alice@example.com',
          },
          'contact-2': {
            '@id': 'https://pod.example.com/contacts/bob#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Bob Johnson',
            [VCARD.hasEmail]: 'mailto:bob@example.com',
          },
          'contact-3': {
            '@id': 'https://pod.example.com/contacts/charlie#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Charlie Brown',
            [VCARD.hasEmail]: 'mailto:charlie@example.com',
          },
          'contact-4': {
            '@id': 'https://pod.example.com/contacts/diana#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Diana Ross',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const NoMembers: Story = {
  render: (args) => <MembershipManagerWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'group-1': {
            '@id': 'https://pod.example.com/groups/newgroup#',
            '@type': VCARD.Group,
            [VCARD.fn]: 'New Empty Group',
          },
        },
        contacts: {
          'contact-1': {
            '@id': 'https://pod.example.com/contacts/alice#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Alice Smith',
            [VCARD.hasEmail]: 'mailto:alice@example.com',
          },
          'contact-2': {
            '@id': 'https://pod.example.com/contacts/bob#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Bob Johnson',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const AllMembersAdded: Story = {
  render: (args) => <MembershipManagerWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'group-1': {
            '@id': 'https://pod.example.com/groups/fullgroup#',
            '@type': VCARD.Group,
            [VCARD.fn]: 'Full Group',
            [VCARD.hasMember]: JSON.stringify([
              { '@id': 'contact-1' },
              { '@id': 'contact-2' },
            ]),
          },
        },
        contacts: {
          'contact-1': {
            '@id': 'https://pod.example.com/contacts/alice#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Alice Smith',
            [VCARD.hasEmail]: 'mailto:alice@example.com',
          },
          'contact-2': {
            '@id': 'https://pod.example.com/contacts/bob#',
            '@type': VCARD.Individual,
            [VCARD.fn]: 'Bob Johnson',
            [VCARD.hasEmail]: 'mailto:bob@example.com',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const NoContacts: Story = {
  render: (args) => <MembershipManagerWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'group-1': {
            '@id': 'https://pod.example.com/groups/emptygroup#',
            '@type': VCARD.Group,
            [VCARD.fn]: 'Group With No Contacts Available',
          },
        },
        contacts: {},
      })

      return { store, indexes }
    })(),
  },
}

export const ManyMembers: Story = {
  render: (args) => <MembershipManagerWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      const names = [
        'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank',
        'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo',
      ]

      const contacts = Object.fromEntries(
        names.map((name, i) => [
          `contact-${i}`,
          {
            '@id': `https://pod.example.com/contacts/${name.toLowerCase()}#`,
            '@type': VCARD.Individual,
            [VCARD.fn]: `${name} ${['Smith', 'Johnson', 'Williams', 'Brown'][i % 4]}`,
            [VCARD.hasEmail]: `mailto:${name.toLowerCase()}@example.com`,
          },
        ])
      )

      // First 8 are members
      const memberRefs = names.slice(0, 8).map((_, i) => ({ '@id': `contact-${i}` }))

      store.setTables({
        groups: {
          'group-1': {
            '@id': 'https://pod.example.com/groups/largeteam#',
            '@type': ORG.Organization,
            [VCARD.fn]: 'Large Organization',
            [VCARD.hasMember]: JSON.stringify(memberRefs),
          },
        },
        contacts,
      })

      return { store, indexes }
    })(),
  },
}
