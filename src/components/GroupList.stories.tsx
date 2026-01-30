import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf'
import GroupList from './GroupList'
import { ORG } from '../schemas/group'

const meta: Meta<typeof GroupList> = {
  title: 'Components/GroupList',
  component: GroupList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedId: {
      control: 'text',
      description: 'ID of the currently selected group',
    },
  },
  args: {
    onSelect: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onManageMembers: fn(),
    onCreate: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper to inject store from context
function GroupListWithStore(props: Omit<React.ComponentProps<typeof GroupList>, 'store'>) {
  const store = useStore()!
  return <GroupList store={store} {...props} />
}

export const Default: Story = {
  render: (args) => <GroupListWithStore {...args} />,
}

export const WithSelection: Story = {
  render: (args) => <GroupListWithStore {...args} selectedId="group-1" />,
  args: {
    selectedId: 'group-1',
  },
}

export const Empty: Story = {
  render: (args) => <GroupListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      store.setTables({ groups: {} })
      return { store, indexes: createIndexes(store) }
    })(),
  },
}

export const MixedTypes: Story = {
  render: (args) => <GroupListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'org-1': {
            '@id': 'https://pod.example.com/groups/acme#org',
            '@type': ORG.Organization,
            [VCARD.fn]: 'Acme Corporation',
            [DCTERMS.description]: 'A global technology company',
          },
          'team-1': {
            '@id': 'https://pod.example.com/groups/engineering#team',
            '@type': ORG.OrganizationalUnit,
            [VCARD.fn]: 'Engineering Team',
            [DCTERMS.description]: 'Software development team',
          },
          'team-2': {
            '@id': 'https://pod.example.com/groups/design#team',
            '@type': ORG.OrganizationalUnit,
            [VCARD.fn]: 'Design Team',
          },
          'group-1': {
            '@id': 'https://pod.example.com/groups/bookclub#group',
            '@type': VCARD.Group,
            [VCARD.fn]: 'Book Club',
            [DCTERMS.description]: 'Monthly book discussions',
          },
          'group-2': {
            '@id': 'https://pod.example.com/groups/hiking#group',
            '@type': VCARD.Group,
            [VCARD.fn]: 'Hiking Friends',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const OnlyOrganizations: Story = {
  render: (args) => <GroupListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      store.setTables({
        groups: {
          'org-1': {
            '@id': 'https://pod.example.com/groups/acme#org',
            '@type': ORG.Organization,
            [VCARD.fn]: 'Acme Corporation',
            [DCTERMS.description]: 'Global tech company',
          },
          'org-2': {
            '@id': 'https://pod.example.com/groups/startup#org',
            '@type': ORG.Organization,
            [VCARD.fn]: 'Cool Startup Inc',
          },
        },
      })

      return { store, indexes }
    })(),
  },
}

export const ManyGroups: Story = {
  render: (args) => <GroupListWithStore {...args} />,
  parameters: {
    store: (() => {
      const { createStore, createIndexes } = require('tinybase')
      const store = createStore()
      const indexes = createIndexes(store)

      const types = [ORG.Organization, ORG.OrganizationalUnit, VCARD.Group]

      store.setTables({
        groups: Object.fromEntries(
          Array.from({ length: 15 }, (_, i) => [
            `group-${i}`,
            {
              '@id': `https://pod.example.com/groups/group-${i}#`,
              '@type': types[i % 3],
              [VCARD.fn]: `Group ${i + 1}`,
              [DCTERMS.description]: i % 2 === 0 ? `Description for group ${i + 1}` : undefined,
            },
          ])
        ),
      })

      return { store, indexes }
    })(),
  },
}
