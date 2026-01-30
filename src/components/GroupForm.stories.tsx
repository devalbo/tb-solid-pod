import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import GroupForm from './GroupForm'

const meta: Meta<typeof GroupForm> = {
  title: 'Components/GroupForm',
  component: GroupForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    groupId: {
      control: 'text',
      description: 'ID of group to edit (leave empty to create)',
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
function GroupFormWithStore(props: Omit<React.ComponentProps<typeof GroupForm>, 'store'>) {
  const store = useStore()!
  return <GroupForm store={store} {...props} />
}

export const CreateNew: Story = {
  render: (args) => <GroupFormWithStore {...args} />,
  args: {
    groupId: undefined,
  },
}

export const EditOrganization: Story = {
  render: (args) => <GroupFormWithStore {...args} groupId="group-1" />,
  args: {
    groupId: 'group-1',
  },
}

export const EditTeam: Story = {
  render: (args) => <GroupFormWithStore {...args} groupId="group-2" />,
  args: {
    groupId: 'group-2',
  },
}
