import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useStore } from 'tinybase/ui-react'
import PersonaForm from './PersonaForm'

const meta: Meta<typeof PersonaForm> = {
  title: 'Components/PersonaForm',
  component: PersonaForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    personaId: {
      control: 'text',
      description: 'ID of persona to edit (leave empty to create)',
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
function PersonaFormWithStore(props: Omit<React.ComponentProps<typeof PersonaForm>, 'store'>) {
  const store = useStore()!
  return <PersonaForm store={store} {...props} />
}

export const CreateNew: Story = {
  render: (args) => <PersonaFormWithStore {...args} />,
  args: {
    personaId: undefined,
  },
}

export const EditExisting: Story = {
  render: (args) => <PersonaFormWithStore {...args} personaId="persona-1" />,
  args: {
    personaId: 'persona-1',
  },
}
